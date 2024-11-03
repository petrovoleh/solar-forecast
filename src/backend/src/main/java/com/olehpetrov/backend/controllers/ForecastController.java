package com.olehpetrov.backend.controllers;
import com.olehpetrov.backend.models.SolarPanel;
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

import java.util.HashMap;
import java.util.Map;

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

        // Find the panel by ID and verify ownership
        SolarPanel panel = panelService.getPanelById(panelId);
        if (panel == null || !panel.getUserId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Forbidden: Panel does not belong to the user.");
        }

        // Calculate capacity in kW (assumes efficiency is in percentage form)
        double capacity_kwp = (panel.getPowerRating() * (panel.getEfficiency() / 100.0));

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
        String url = "http://127.0.0.1:8000/forecast";
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
}
