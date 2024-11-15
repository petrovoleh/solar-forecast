package com.olehpetrov.backend.controllers;
import com.olehpetrov.backend.models.DailyEnergyTotal;
import com.olehpetrov.backend.models.Panel;
import com.olehpetrov.backend.models.User;
import com.olehpetrov.backend.services.SolarPanelService;
import com.olehpetrov.backend.services.UserService;
import com.olehpetrov.backend.utils.JwtUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.json.JSONArray;
import org.json.JSONObject;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/forecast")
@CrossOrigin(origins = "http://localhost:3000")
public class ForecastController {

    private static final Logger logger = LoggerFactory.getLogger(ForecastController.class);

    @Autowired
    private SolarPanelService panelService;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtils jwtUtils;

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
    public ResponseEntity<String> getForecast(@RequestHeader("Authorization") String token,
                                              @RequestParam String panelId,
                                              @RequestParam String from,
                                              @RequestParam String to) {
        // Extract username from token
        String username = jwtUtils.extractUsername(token.substring(7));
        User user = userService.findByUsername(username);

        if (user == null) {
            return ResponseEntity.badRequest().body("User not found.");
        }
        if (!isValidDateRange(from, to)) {
            logger.error("Date range is out of bounds for user: {}", username);
            return ResponseEntity.badRequest().body("Invalid date range. 'From' date must be after 2020-01-01, and both dates within the next 13 days.");
        }
        // Find the panel by ID and verify ownership
        Panel panel = panelService.getPanelById(panelId);
        if (panel == null || !panel.getUserId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Forbidden: Panel does not belong to the user.");
        }

        // Calculate capacity in kW (assumes efficiency is in percentage form)
        double capacity_kwp = (panel.getPowerRating()/1000.0 * (panel.getEfficiency() / 100.0));

        // Prepare request body for the forecast service
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("init_time_freq", 6);
        requestBody.put("start_datetime", from);
        requestBody.put("end_datetime", to);
        requestBody.put("frequency", "hourly");
        requestBody.put("latitude", panel.getLocation().getLat());
        requestBody.put("longitude", panel.getLocation().getLon());
        requestBody.put("capacity_kwp", capacity_kwp);

        // Send the request to the forecast API
        String url = "http://model:8000/forecast";
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

        if (response.getStatusCode().is2xxSuccessful()) {
            logger.info("Forecast retrieved successfully for user: {}", username);
            return ResponseEntity.ok(response.getBody());
        } else {
            logger.error("Failed to retrieve forecast for user: {}", username);
            return ResponseEntity.status(response.getStatusCode()).body("Failed to retrieve forecast.");
        }
    }
    @GetMapping("/getTotal")
    public ResponseEntity<String> getTotal(@RequestHeader("Authorization") String token,
                                           @RequestParam String panelId,
                                           @RequestParam String from,
                                           @RequestParam String to) {
        String username = jwtUtils.extractUsername(token.substring(7));
        User user = userService.findByUsername(username);

        if (user == null) {
            return ResponseEntity.badRequest().body("User not found.");
        }
        if (!isValidDateRange(from, to)) {
            logger.error("Date range is out of bounds for user: {}", username);
            return ResponseEntity.badRequest().body("Invalid date range. 'From' date must be after 2020-01-01, and both dates within the next 13 days.");
        }
        Panel panel = panelService.getPanelById(panelId);
        if (panel == null || !panel.getUserId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Forbidden: Panel does not belong to the user.");
        }

        List<DailyEnergyTotal> existingRecords = panelService.getDailyEnergyTotalsByDateRange(panel, from, to);
        Set<String> existingDates = existingRecords.stream().map(DailyEnergyTotal::getDate).collect(Collectors.toSet());
        logger.info(String.valueOf(existingRecords.size()));
        logger.info(String.valueOf(existingDates.size()));
        // Determine which dates are missing from existing records
        Set<String> allRequestedDates = getDatesInRange(from, to);
        allRequestedDates.removeAll(existingDates);  // Now only missing dates remain

        if (allRequestedDates.isEmpty()) {
            JSONArray dailyTotals = new JSONArray();
            for (DailyEnergyTotal record : existingRecords) {
                JSONObject dayTotal = new JSONObject();
                dayTotal.put("date", record.getDate());
                dayTotal.put("totalEnergy_kwh", record.getTotalEnergy_kwh());
                dailyTotals.put(dayTotal);
            }
            logger.info("Returning cached daily energy totals for user: {}", username);
            return ResponseEntity.ok(dailyTotals.toString());
        }

        // If there are missing dates, make an API call to fetch them
        double capacity_kwp = (panel.getPowerRating() / 1000.0 * (panel.getEfficiency() / 100.0));
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("init_time_freq", 15);
        requestBody.put("start_datetime", from);
        requestBody.put("end_datetime", to);
        requestBody.put("frequency", "15min");
        requestBody.put("latitude", panel.getLocation().getLat());
        requestBody.put("longitude", panel.getLocation().getLon());
        requestBody.put("capacity_kwp", capacity_kwp);

        String url = "http://model:8000/forecast";
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

        if (response.getStatusCode().is2xxSuccessful()) {
            JSONArray forecastData = new JSONArray(response.getBody());
            Map<String, Double> dailyEnergyMap = new HashMap<>();

            for (int i = 0; i < forecastData.length(); i++) {
                JSONObject entry = forecastData.getJSONObject(i);
                String datetime = entry.getString("datetime").split("T")[0];
                double powerKW = entry.optDouble("power_kw", 0.0);
                if (allRequestedDates.contains(datetime)) {  // Only add missing dates
                    dailyEnergyMap.put(datetime, dailyEnergyMap.getOrDefault(datetime, 0.0) + (powerKW * 0.25));
                }
            }

            JSONArray dailyTotals = new JSONArray();
            for (DailyEnergyTotal record : existingRecords) {
                JSONObject dayTotal = new JSONObject();
                dayTotal.put("date", record.getDate());
                dayTotal.put("totalEnergy_kwh", record.getTotalEnergy_kwh());
                dailyTotals.put(dayTotal);
            }

            for (Map.Entry<String, Double> entry : dailyEnergyMap.entrySet()) {
                String date = entry.getKey();
                double totalEnergy = entry.getValue();

                DailyEnergyTotal newDailyTotal = new DailyEnergyTotal();
                newDailyTotal.setPanel(panel);
                newDailyTotal.setDate(date);
                newDailyTotal.setTotalEnergy_kwh(totalEnergy);
                panelService.saveDailyEnergyTotal(newDailyTotal);

                JSONObject dayTotal = new JSONObject();
                dayTotal.put("date", date);
                dayTotal.put("totalEnergy_kwh", totalEnergy);
                dailyTotals.put(dayTotal);
            }

            logger.info("Daily energy totals for user: {}", username);
            return ResponseEntity.ok(dailyTotals.toString());
        } else {
            logger.error("Failed to retrieve forecast for user: {}", username);
            return ResponseEntity.status(response.getStatusCode()).body("Failed to retrieve forecast.");
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


}
