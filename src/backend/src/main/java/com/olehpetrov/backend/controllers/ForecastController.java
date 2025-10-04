package com.olehpetrov.backend.controllers;
import com.olehpetrov.backend.models.*;
import com.olehpetrov.backend.services.ClusterService;
import com.olehpetrov.backend.services.InverterService;
import com.olehpetrov.backend.services.SolarPanelService;
import com.olehpetrov.backend.services.UserService;
import com.olehpetrov.backend.utils.JwtUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/forecast")
public class ForecastController {

    private static final Logger logger = LoggerFactory.getLogger(ForecastController.class);
//    private final String url = "http://model:8000/forecast";
    @Value("${FORECAST_URL:http://localhost:8000/forecast}") // Default value if env variable not found
    private String forecastUrl;
    @Autowired
    private SolarPanelService panelService;
    @Autowired
    private ClusterService clusterService;
    @Autowired
    private InverterService inverterService;
    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private RestTemplate restTemplate;

    private static class AggregationResult {
        private final HttpStatus status;
        private final Map<String, Double> totals;
        private final String errorBody;

        private AggregationResult(HttpStatus status, Map<String, Double> totals, String errorBody) {
            this.status = status;
            this.totals = totals;
            this.errorBody = errorBody;
        }

        public static AggregationResult success(Map<String, Double> totals) {
            return new AggregationResult(HttpStatus.OK, totals, null);
        }

        public static AggregationResult error(HttpStatus status, String errorBody) {
            return new AggregationResult(status, null, errorBody);
        }

        public HttpStatus getStatus() {
            return status;
        }

        public Map<String, Double> getTotals() {
            return totals;
        }

        public String getErrorBody() {
            return errorBody;
        }
    }

    private static class SummaryRange {
        private final String from;
        private final String to;

        SummaryRange(String from, String to) {
            this.from = from;
            this.to = to;
        }

        public String getFrom() {
            return from;
        }

        public String getTo() {
            return to;
        }
    }

    private boolean isValidDateRange(String fromDateStr, String toDateStr) {
        LocalDate fromDate = LocalDate.parse(fromDateStr.split(" ")[0]);
        LocalDate toDate = LocalDate.parse(toDateStr.split(" ")[0]);
        LocalDate today = LocalDate.now();
        LocalDate maxAllowedDate = today.plusDays(13);
        LocalDate minAllowedDate = LocalDate.of(2020, 1, 1);

        // Ensure `from` date is not before 2020-01-01, and the range is within the next 13 days
        return !fromDate.isBefore(minAllowedDate) &&  !toDate.isBefore(minAllowedDate) && !fromDate.isAfter(maxAllowedDate) && !toDate.isAfter(maxAllowedDate);
    }
    @PostMapping("/getForecast")
    public ResponseEntity<String> getForecast(
            @RequestHeader("Authorization") String token,
            @RequestParam String panelId,
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam String type) {
        // Extract username from token
        String username = jwtUtils.extractUsername(token.substring(7));
        User user = userService.findByUsername(username);

        if (user == null) {
            return ResponseEntity.badRequest().body("{\"statusText\": \"User not found.\"}");
        }
        if (!isValidDateRange(from, to)) {
            logger.error("Date range is out of bounds for user: {}", username);
            return ResponseEntity.badRequest().body("{\"statusText\": \"Invalid date range. 'From' date must be after 2020-01-01, and both dates within the next 13 days.\"}");
        }

        double capacity_kwp;

        if ("cluster".equalsIgnoreCase(type)) {

            // Find all panels by cluster ID
            List<Panel> panels = panelService.getPanelsByClusterId(panelId);
            if (panels.isEmpty()) {
                return ResponseEntity.badRequest().body("{\"statusText\": \"No panels found for the given cluster ID.\"}");
            }
            logger.info("Len: {}", panels.size());

            // Verify all panels belong to the user
            if (panels.stream().anyMatch(panel -> !panel.getUserId().equals(user.getId()))) {
                return ResponseEntity.status(403).body("{\"statusText\": \"Forbidden: Some panels in the cluster do not belong to the user.\"}");
            }

            // Calculate total capacity for the cluster
            capacity_kwp = panelService.calculateTotalCapacityKwp(panels);

            // Retrieve the cluster information to check for an inverter
            Cluster cluster = clusterService.getClusterById(panelId);
            if (cluster != null && cluster.getInverter() != null) {
                Inverter inverter = inverterService.getInverterById(cluster.getInverter().getId());
                logger.info("efficiency: {}", inverter.getEfficiency());

                if (inverter != null && inverter.getEfficiency() != null) {
                    double inverterEfficiency = inverter.getEfficiency() / 100.0; // Convert percentage to decimal
                    capacity_kwp *= inverterEfficiency;
                    logger.info("Capacity after applying inverter efficiency ({}%): {}", inverter.getEfficiency(), capacity_kwp);
                }
            }
        } else if ("panel".equalsIgnoreCase(type)) {
            // Find the panel by ID and verify ownership
            Panel panel = panelService.getPanelById(panelId);
            if (panel == null || !panel.getUserId().equals(user.getId())) {
                return ResponseEntity.status(403).body("{\"statusText\": \"Forbidden: Panel does not belong to the user.\"}");
            }

            // Calculate capacity for the single panel
            capacity_kwp = panel.getPowerRating() / 1000.0 * (panel.getEfficiency() / 100.0);
        } else {
            return ResponseEntity.badRequest().body("{\"statusText\": \"Invalid type. Must be 'cluster' or 'panel'.\"}");
        }

        if (capacity_kwp <= 0) {
            return ResponseEntity.status(400)
                    .body("{\"statusText\": \"Panel or cluster power rating is zero or lower, please change values and try again.\"}");
        }

        // Prepare request body for the forecast service
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("init_time_freq", 6);
        requestBody.put("start_datetime", from);
        requestBody.put("end_datetime", to);
        requestBody.put("frequency", "hourly");
        requestBody.put("capacity_kwp", capacity_kwp);

        if ("cluster".equalsIgnoreCase(type)) {
            // Use first panel's location for the cluster forecast
            Panel representativePanel = panelService.getPanelsByClusterId(panelId).get(0);
            requestBody.put("latitude", representativePanel.getLocation().getLat());
            requestBody.put("longitude", representativePanel.getLocation().getLon());
        } else {
            Panel panel = panelService.getPanelById(panelId);
            requestBody.put("latitude", panel.getLocation().getLat());
            requestBody.put("longitude", panel.getLocation().getLon());
        }

        // Send the request to the forecast API
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        logger.info("request");
        ResponseEntity<String> response = restTemplate.exchange(forecastUrl, HttpMethod.POST, entity, String.class);
        logger.info(String.valueOf(response));
        if (response.getStatusCode().is2xxSuccessful()) {
            logger.info("Forecast retrieved successfully for user: {}", username);
            return ResponseEntity.ok(response.getBody());
        } else {
            logger.error("Failed to retrieve forecast for user: {}", username);
            return ResponseEntity.status(response.getStatusCode()).body("{\"statusText\": \"Failed to retrieve forecast.\"}");
        }
    }


    @GetMapping("/getTotal")
    public ResponseEntity<String> getTotal(Authentication authentication,
                                           @RequestParam String panelId,
                                           @RequestParam String from,
                                           @RequestParam String to,
                                           @RequestParam String type) {
        User user = resolveAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("{\"statusText\": \"Unauthorized: Invalid or missing authentication.\"}");
        }
        String username = user.getUsername();
        if (!isValidDateRange(from, to)) {
            logger.error("Date range is out of bounds for user: {}", username);
            return ResponseEntity.badRequest().body("{\"statusText\": \"Invalid date range. 'From' date must be after 2020-01-01, and both dates within the next 13 days.\"}");
        }

        AggregationResult aggregationResult = computeDailyTotals(user, panelId, from, to, type, username);
        if (aggregationResult.getStatus() != HttpStatus.OK) {
            return ResponseEntity.status(aggregationResult.getStatus()).body(aggregationResult.getErrorBody());
        }

        Map<String, Double> aggregatedTotals = aggregationResult.getTotals();
        logger.info("Daily energy totals for user: {}", username);
        String totalsJson = buildDailyTotalsJson(aggregatedTotals);
        logger.info("Totals: {}", totalsJson);
        return ResponseEntity.ok(totalsJson);
    }

    @GetMapping("/getPeriodTotal")
    public ResponseEntity<String> getPeriodTotal(Authentication authentication,
                                                 @RequestParam String panelId,
                                                 @RequestParam String type,
                                                 @RequestParam String period) {
        User user = resolveAuthenticatedUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("{\"statusText\": \"Unauthorized: Invalid or missing authentication.\"}");
        }
        String username = user.getUsername();

        String normalizedPeriod = period.toLowerCase(Locale.ROOT);
        SummaryRange range = determineSummaryRange(normalizedPeriod);
        if (range == null) {
            return ResponseEntity.badRequest().body("{\"statusText\": \"Invalid period. Must be 'day', 'week', or 'month'.\"}");
        }

        if (!isValidDateRange(range.getFrom(), range.getTo())) {
            logger.error("Summary date range is out of bounds for user: {}", username);
            return ResponseEntity.badRequest().body("{\"statusText\": \"Summary period is out of supported date range.\"}");
        }

        AggregationResult aggregationResult = computeDailyTotals(user, panelId, range.getFrom(), range.getTo(), type, username);
        if (aggregationResult.getStatus() != HttpStatus.OK) {
            return ResponseEntity.status(aggregationResult.getStatus()).body(aggregationResult.getErrorBody());
        }

        double total = aggregationResult.getTotals().values().stream().mapToDouble(Double::doubleValue).sum();
        JSONObject response = new JSONObject();
        response.put("period", normalizedPeriod);
        response.put("from", range.getFrom());
        response.put("to", range.getTo());
        response.put("totalEnergy_kwh", total);

        return ResponseEntity.ok(response.toString());
    }

    private SummaryRange determineSummaryRange(String period) {
        LocalDate today = LocalDate.now();
        LocalDate fromDate;
        switch (period) {
            case "day":
                fromDate = today;
                break;
            case "week":
                fromDate = today.minusDays(6);
                break;
            case "month":
                fromDate = today.minusDays(29);
                break;
            default:
                return null;
        }

        return new SummaryRange(fromDate.toString() + " 00:00:00", today.toString() + " 00:00:00");
    }

    private AggregationResult computeDailyTotals(User user,
                                                 String panelId,
                                                 String from,
                                                 String to,
                                                 String type,
                                                 String username) {
        Map<String, Double> aggregatedTotals = new TreeMap<>();
        if ("panel".equalsIgnoreCase(type)) {
            Panel targetPanel = panelService.getPanelById(panelId);
            if (targetPanel == null || !targetPanel.getUserId().equals(user.getId())) {
                return AggregationResult.error(HttpStatus.FORBIDDEN, "{\"statusText\": \"Forbidden: Panel does not belong to the user.\"}");
            }

            List<DailyEnergyTotal> existingRecords = panelService.getDailyEnergyTotalsByDateRange(targetPanel, from, to);
            for (DailyEnergyTotal record : existingRecords) {
                aggregatedTotals.merge(record.getDate(), record.getTotalEnergy_kwh(), Double::sum);
            }

            Set<String> allRequestedDates = getDatesInRange(from, to);
            allRequestedDates.removeAll(existingRecords.stream().map(DailyEnergyTotal::getDate).collect(Collectors.toSet()));

            if (allRequestedDates.isEmpty()) {
                logger.info("Returning cached daily energy totals for user: {}", username);
                return AggregationResult.success(aggregatedTotals);
            }

            double capacity_kwp = targetPanel.getPowerRating() / 1000.0 * (targetPanel.getEfficiency() / 100.0);
            return fetchAndMergeForecastData(panelId, from, to, aggregatedTotals, allRequestedDates, targetPanel, null, capacity_kwp, type, username);
        } else if ("cluster".equalsIgnoreCase(type)) {
            Cluster cluster = clusterService.getClusterById(panelId);
            if (cluster == null || !cluster.getUserId().equals(user.getId())) {
                return AggregationResult.error(HttpStatus.FORBIDDEN, "{\"statusText\": \"Forbidden: Cluster does not belong to the user.\"}");
            }

            List<Panel> panels = panelService.getPanelsByClusterId(panelId);
            if (panels.isEmpty()) {
                return AggregationResult.error(HttpStatus.BAD_REQUEST, "{\"statusText\": \"No panels found for the given cluster ID.\"}");
            }

            if (panels.stream().anyMatch(panel -> !panel.getUserId().equals(user.getId()))) {
                return AggregationResult.error(HttpStatus.FORBIDDEN, "{\"statusText\": \"Forbidden: Some panels in the cluster do not belong to the user.\"}");
            }

            List<DailyEnergyTotal> existingRecords = panels.stream()
                    .flatMap(panel -> panelService.getDailyEnergyTotalsByDateRange(panel, from, to).stream())
                    .collect(Collectors.toList());
            for (DailyEnergyTotal record : existingRecords) {
                aggregatedTotals.merge(record.getDate(), record.getTotalEnergy_kwh(), Double::sum);
            }

            Set<String> allRequestedDates = getDatesInRange(from, to);
            allRequestedDates.removeAll(existingRecords.stream().map(DailyEnergyTotal::getDate).collect(Collectors.toSet()));
            if (allRequestedDates.isEmpty()) {
                logger.info("Returning cached cluster daily energy totals for user: {}", username);
                return AggregationResult.success(aggregatedTotals);
            }

            double capacity_kwp = panelService.calculateTotalCapacityKwp(panels);
            if (cluster.getInverter() != null) {
                Inverter inverter = inverterService.getInverterById(cluster.getInverter().getId());
                if (inverter != null && inverter.getEfficiency() != null) {
                    capacity_kwp *= inverter.getEfficiency() / 100.0;
                    logger.info("Capacity after applying inverter efficiency ({}%): {}", inverter.getEfficiency(), capacity_kwp);
                }
            }

            return fetchAndMergeForecastData(panelId, from, to, aggregatedTotals, allRequestedDates, null, panels, capacity_kwp, type, username);
        }

        return AggregationResult.error(HttpStatus.BAD_REQUEST, "{\"statusText\": \"Invalid type. Must be 'cluster' or 'panel'.\"}");
    }

    private AggregationResult fetchAndMergeForecastData(String panelId,
                                                        String from,
                                                        String to,
                                                        Map<String, Double> aggregatedTotals,
                                                        Set<String> allRequestedDates,
                                                        Panel targetPanel,
                                                        List<Panel> clusterPanels,
                                                        double capacity_kwp,
                                                        String type,
                                                        String username) {
        if (capacity_kwp <= 0) {
            return AggregationResult.error(HttpStatus.BAD_REQUEST, "{\"statusText\": \"Panel or cluster power rating is zero or lower, please change values and try again.\"}");
        }

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("init_time_freq", 15);
        requestBody.put("start_datetime", from);
        requestBody.put("end_datetime", to);
        requestBody.put("frequency", "15min");
        requestBody.put("capacity_kwp", capacity_kwp);

        if ("cluster".equalsIgnoreCase(type)) {
            List<Panel> panelsToUse = clusterPanels != null ? clusterPanels : panelService.getPanelsByClusterId(panelId);
            if (panelsToUse == null || panelsToUse.isEmpty()) {
                return AggregationResult.error(HttpStatus.BAD_REQUEST, "{\"statusText\": \"No panels found for the given cluster ID.\"}");
            }
            Panel representativePanel = panelsToUse.get(0);
            requestBody.put("latitude", representativePanel.getLocation().getLat());
            requestBody.put("longitude", representativePanel.getLocation().getLon());
        } else if (targetPanel != null) {
            requestBody.put("latitude", targetPanel.getLocation().getLat());
            requestBody.put("longitude", targetPanel.getLocation().getLon());
        } else {
            return AggregationResult.error(HttpStatus.BAD_REQUEST, "{\"statusText\": \"Unable to determine location for the requested resource.\"}");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<String> response = restTemplate.exchange(forecastUrl, HttpMethod.POST, entity, String.class);

        if (!response.getStatusCode().is2xxSuccessful()) {
            logger.error("Failed to retrieve forecast for user: {}", username);
            return AggregationResult.error(response.getStatusCode(), "{\"statusText\": \"Failed to retrieve forecast.\"}");
        }

        JSONArray forecastData = new JSONArray(response.getBody());
        Map<String, Double> dailyEnergyMap = new HashMap<>();

        for (int i = 0; i < forecastData.length(); i++) {
            JSONObject entry = forecastData.getJSONObject(i);
            String datetime = entry.getString("datetime").split("T")[0];
            double powerKW = entry.optDouble("power_kw", 0.0);

            if (allRequestedDates != null && allRequestedDates.contains(datetime)) {
                dailyEnergyMap.put(datetime, dailyEnergyMap.getOrDefault(datetime, 0.0) + (powerKW * 0.25));
            }
        }

        for (Map.Entry<String, Double> entry : dailyEnergyMap.entrySet()) {
            String date = entry.getKey();
            double totalEnergy = entry.getValue();

            if (targetPanel != null) {
                DailyEnergyTotal newDailyTotal = new DailyEnergyTotal();
                newDailyTotal.setPanel(targetPanel);
                newDailyTotal.setDate(date);
                newDailyTotal.setTotalEnergy_kwh(totalEnergy);
                panelService.saveDailyEnergyTotal(newDailyTotal);
            }
            aggregatedTotals.merge(date, totalEnergy, Double::sum);
        }

        return AggregationResult.success(aggregatedTotals);
    }

    private User resolveAuthenticatedUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        Object principal = authentication.getPrincipal();
        String username = null;

        if (principal instanceof UserDetails userDetails) {
            username = userDetails.getUsername();
        } else if (principal instanceof String stringPrincipal) {
            username = stringPrincipal;
        }

        if (username == null) {
            return null;
        }

        return userService.findByUsername(username);
    }

    private Set<String> getDatesInRange(String startDate, String endDate) {
        LocalDate start = LocalDate.parse(startDate.split(" ")[0]);
        LocalDate end = LocalDate.parse(endDate.split(" ")[0]);
        Set<String> dates = new HashSet<>();
        while (!start.isAfter(end)) {
            dates.add(start.toString());
            start = start.plusDays(1);
        }
        return dates;
    }

    private String buildDailyTotalsJson(Map<String, Double> dailyTotals) {
        JSONArray dailyTotalsArray = new JSONArray();
        for (Map.Entry<String, Double> entry : dailyTotals.entrySet()) {
            JSONObject dayTotal = new JSONObject();
            dayTotal.put("date", entry.getKey());
            dayTotal.put("totalEnergy_kwh", entry.getValue());
            dailyTotalsArray.put(dayTotal);
        }
        return dailyTotalsArray.toString();
    }


}
