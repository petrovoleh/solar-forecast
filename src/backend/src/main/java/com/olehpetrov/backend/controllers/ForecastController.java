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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

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
        logger.info("Sending forecast GET request to: {}", url);

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

        double capacity_kwp;
        double latitude;
        double longitude;

        if ("cluster".equalsIgnoreCase(type)) {
            List<Panel> panels = panelService.getPanelsByClusterId(panelId);
            if (panels.isEmpty()) {
                return ResponseEntity.badRequest().body("{\"statusText\": \"No panels found for the given cluster ID.\"}");
            }

            if (panels.stream().anyMatch(panel -> !panel.getUserId().equals(user.getId()))) {
                return ResponseEntity.status(403).body("{\"statusText\": \"Forbidden: Some panels in the cluster do not belong to the user.\"}");
            }

            capacity_kwp = panelService.calculateTotalCapacityKwp(panels);
            Cluster cluster = clusterService.getClusterById(panelId);
            if (cluster != null && cluster.getInverter() != null) {
                Inverter inverter = inverterService.getInverterById(cluster.getInverter().getId());
                if (inverter != null && inverter.getEfficiency() != null) {
                    double inverterEfficiency = inverter.getEfficiency() / 100.0;
                    capacity_kwp *= inverterEfficiency;
                }
            }

            Panel representativePanel = panels.get(0);
            latitude = representativePanel.getLocation().getLat();
            longitude = representativePanel.getLocation().getLon();
        } else if ("panel".equalsIgnoreCase(type)) {
            Panel panel = panelService.getPanelById(panelId);
            if (panel == null || !panel.getUserId().equals(user.getId())) {
                return ResponseEntity.status(403).body("{\"statusText\": \"Forbidden: Panel does not belong to the user.\"}");
            }

            capacity_kwp = panel.getPowerRating() / 1000.0 * (panel.getEfficiency() / 100.0);
            latitude = panel.getLocation().getLat();
            longitude = panel.getLocation().getLon();
        } else {
            return ResponseEntity.badRequest().body("{\"statusText\": \"Invalid type. Must be 'cluster' or 'panel'.\"}");
        }

        if (capacity_kwp <= 0) {
            return ResponseEntity.status(400)
                    .body("{\"statusText\": \"Panel or cluster power rating is zero or lower, please change values and try again.\"}");
        }

        String startDate = from.split(" ")[0];
        String endDate = to.split(" ")[0];

        String url = String.format(
                "%s/daily_forecast?lat=%.6f&lon=%.6f&start=%s&end=%s&kwp=%.3f",
                forecastUrl, latitude, longitude, startDate, endDate, capacity_kwp
        );

        logger.info("Sending daily forecast GET request to: {}", url);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<String> response;
        try {
            response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
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
            List<JSONObject> totalsList = new ArrayList<>();

            for (int i = 0; i < forecastData.length(); i++) {
                JSONObject entry = forecastData.getJSONObject(i);
                JSONObject total = new JSONObject();
                total.put("date", entry.optString("date"));
                total.put("totalEnergy_kwh", entry.optDouble("pred_kWh", 0.0));
                totalsList.add(total);
            }

            totalsList.sort(Comparator.comparing(obj -> obj.optString("date")));
            JSONArray totals = new JSONArray();
            totalsList.forEach(totals::put);

            logger.info("Daily energy totals for user: {}", username);
            return ResponseEntity.ok(totals.toString());
        } else {
            logger.error("Failed to retrieve forecast for user: {}", username);
            return ResponseEntity.status(response.getStatusCode()).body("{\"statusText\": \"Failed to retrieve forecast.\"}");
        }
    }


}
