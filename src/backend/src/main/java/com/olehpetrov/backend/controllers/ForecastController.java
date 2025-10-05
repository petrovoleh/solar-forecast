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
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/forecast")
public class ForecastController {

    private static final Logger logger = LoggerFactory.getLogger(ForecastController.class);
//    private final String url = "http://model:8000/forecast";
    @Value("${FORECAST_URL:http://localhost:8000}") // Default value if env variable not found
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

        // Build GET URL for FastAPI forecast service
        double latitude;
        double longitude;

        if ("cluster".equalsIgnoreCase(type)) {
            Panel representativePanel = panelService.getPanelsByClusterId(panelId).get(0);
            latitude = representativePanel.getLocation().getLat();
            longitude = representativePanel.getLocation().getLon();
        } else {
            Panel panel = panelService.getPanelById(panelId);
            latitude = panel.getLocation().getLat();
            longitude = panel.getLocation().getLon();
        }

        String url = String.format(
                "%s/forecast?lat=%.6f&lon=%.6f&start=%s&end=%s&kwp=%.3f",
                forecastUrl, latitude, longitude, from, to, capacity_kwp
        );
        logger.info("🌍 Sending GET request to: {}", url);

        // Send the request to the forecast API
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(headers);


        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

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
    public ResponseEntity<String> getTotal(@RequestHeader("Authorization") String token,
                                           @RequestParam String panelId,
                                           @RequestParam String from,
                                           @RequestParam String to,
                                           @RequestParam String type) {
        String username = jwtUtils.extractUsername(token.substring(7));
        User user = userService.findByUsername(username);

        if (user == null) {
            return ResponseEntity.badRequest().body("{\"statusText\": \"User not found.\"}");
        }
        if (!isValidDateRange(from, to)) {
            logger.error("Date range is out of bounds for user: {}", username);
            return ResponseEntity.badRequest().body("{\"statusText\": \"Invalid date range. 'From' date must be after 2020-01-01, and both dates within the next 13 days.\"}");
        }
        Map<String, Double> aggregatedTotals = new TreeMap<>();
        Set<String> allRequestedDates = null;
        List<DailyEnergyTotal> existingRecords = null;
        Panel panel2 = null;
        if ("panel".equalsIgnoreCase(type)) {
            panel2 = panelService.getPanelById(panelId);
            if (panel2 == null || !panel2.getUserId().equals(user.getId())) {
                return ResponseEntity.status(403).body("{\"statusText\": \"Forbidden: Panel does not belong to the user.\"}");
            }
            existingRecords = panelService.getDailyEnergyTotalsByDateRange(panel2, from, to);
            for (DailyEnergyTotal record : existingRecords) {
                aggregatedTotals.merge(record.getDate(), record.getTotalEnergy_kwh(), Double::sum);
            }
            Set<String> existingDates = existingRecords.stream().map(DailyEnergyTotal::getDate).collect(Collectors.toSet());
            logger.info(String.valueOf(existingRecords.size()));
            logger.info(String.valueOf(existingDates.size()));
            // Determine which dates are missing from existing records
            allRequestedDates = getDatesInRange(from, to);
            allRequestedDates.removeAll(existingDates);  // Now only missing dates remain

            if (allRequestedDates.isEmpty()) {
                logger.info("Returning cached daily energy totals for user: {}", username);
                return ResponseEntity.ok(buildDailyTotalsJson(aggregatedTotals));
            }
        }else   if ("cluster".equalsIgnoreCase(type)) {
            Cluster cl = clusterService.getClusterById(panelId);
            if (cl == null || !cl.getUserId().equals(user.getId())) {
                return ResponseEntity.status(403).body("{\"statusText\": \"Forbidden: Cluster does not belong to the user.\"}");
            }
        }else {
            return ResponseEntity.status(400).body("{\"statusText\": \"No panels found for the given ID.\"}");
        }
        // If there are missing dates, make an API call to fetch them
        double capacity_kwp;

        if ("cluster".equalsIgnoreCase(type)) {
            List<Panel> panels = panelService.getPanelsByClusterId(panelId);
            if (panels.isEmpty()) {
                return ResponseEntity.badRequest().body("{\"statusText\": \"No panels found for the given cluster ID.\"}");
            }

            if (panels.stream().anyMatch(panel -> !panel.getUserId().equals(user.getId()))) {
                return ResponseEntity.status(403).body("{\"statusText\": \"Forbidden: Some panels in the cluster do not belong to the user.\"}");
            }

            allRequestedDates = getDatesInRange(from, to);
            existingRecords = panels.stream()
                    .flatMap(panel -> panelService.getDailyEnergyTotalsByDateRange(panel, from, to).stream())
                    .collect(Collectors.toList());
            for (DailyEnergyTotal record : existingRecords) {
                aggregatedTotals.merge(record.getDate(), record.getTotalEnergy_kwh(), Double::sum);
            }

            Set<String> existingDates = existingRecords.stream().map(DailyEnergyTotal::getDate).collect(Collectors.toSet());
            allRequestedDates.removeAll(existingDates);
            if (allRequestedDates.isEmpty()) {
                logger.info("Returning cached cluster daily energy totals for user: {}", username);
                return ResponseEntity.ok(buildDailyTotalsJson(aggregatedTotals));
            }
            capacity_kwp = panelService.calculateTotalCapacityKwp(panels);
            Cluster cl = clusterService.getClusterById(panelId);
            if (cl != null && cl.getInverter() != null) {
                Inverter inverter = inverterService.getInverterById(cl.getInverter().getId());
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
        if( capacity_kwp <=0 ){
            return ResponseEntity.status(400)
                    .body("{\"statusText\": \"Panel or cluster power rating is zero or lower, please change values and try again.\"}");
        }
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("init_time_freq", 15);
        requestBody.put("start_datetime", from);
        requestBody.put("end_datetime", to);
        requestBody.put("frequency", "15min");
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

        requestBody.put("capacity_kwp", capacity_kwp);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<String> response;
        try {
            response = restTemplate.exchange(forecastUrl, HttpMethod.POST, entity, String.class);
        } catch (HttpStatusCodeException ex) {
            logger.error("Forecast service responded with status {} for user {}", ex.getStatusCode(), username, ex);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body("{\"statusText\": \"Forecast service error. Please try again later.\"}");
        } catch (RestClientException ex) {
            logger.error("Unable to reach forecast service for user {}", username, ex);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body("{\"statusText\": \"Forecast service is unavailable. Please try again later.\"}");
        }

        if (response.getStatusCode().is2xxSuccessful()) {

            JSONArray forecastData = new JSONArray(response.getBody());
            Map<String, Double> dailyEnergyMap = new HashMap<>();

            for (int i = 0; i < forecastData.length(); i++) {
                JSONObject entry = forecastData.getJSONObject(i);
                String datetime = entry.getString("time").split("T")[0];
                double powerKW = entry.optDouble("pred_kW", 0.0);

                if (allRequestedDates != null && allRequestedDates.contains(datetime)) {  // Only add missing dates
                    dailyEnergyMap.put(datetime, dailyEnergyMap.getOrDefault(datetime, 0.0) + (powerKW * 0.25));
                }
            }

            for (Map.Entry<String, Double> entry : dailyEnergyMap.entrySet()) {
                String date = entry.getKey();
                double totalEnergy = entry.getValue();

                if (panel2 != null){
                    DailyEnergyTotal newDailyTotal = new DailyEnergyTotal();
                    newDailyTotal.setPanel(panel2);
                    newDailyTotal.setDate(date);
                    newDailyTotal.setTotalEnergy_kwh(totalEnergy);
                    panelService.saveDailyEnergyTotal(newDailyTotal);
                }
                aggregatedTotals.merge(date, totalEnergy, Double::sum);
            }

            logger.info("Daily energy totals for user: {}", username);
            String totalsJson = buildDailyTotalsJson(aggregatedTotals);
            logger.info("Totals: {}", totalsJson);
            return ResponseEntity.ok(totalsJson);
        } else {
            logger.error("Failed to retrieve forecast for user: {}", username);
            return ResponseEntity.status(response.getStatusCode()).body("{\"statusText\": \"Failed to retrieve forecast.\"}");
        }
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
