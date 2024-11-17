package com.olehpetrov.backend.controllers;

import com.olehpetrov.backend.models.Cluster;
import com.olehpetrov.backend.models.Location;
import com.olehpetrov.backend.models.Panel;
import com.olehpetrov.backend.models.User;
import com.olehpetrov.backend.services.ClusterService;
import com.olehpetrov.backend.services.LocationService;
import com.olehpetrov.backend.services.SolarPanelService;
import com.olehpetrov.backend.services.UserService;
import com.olehpetrov.backend.utils.JwtUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/panel")
@CrossOrigin(origins = "http://localhost:3000")
public class SolarPanelController {

    private static final Logger logger = LoggerFactory.getLogger(SolarPanelController.class);

    @Autowired
    private SolarPanelService panelService;

    @Autowired
    private LocationService locationService;

    @Autowired
    private ClusterService clusterService;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtils jwtUtils;

    // Add a new panel
    @PostMapping("/add")
    public ResponseEntity<String> addPanel(@RequestHeader("Authorization") String token, @RequestBody UpdatePanelRequest panelRequest) {
        // Extract username from token
        String username = jwtUtils.extractUsername(token.substring(7));
        User user = userService.findByUsername(username);

        if (user == null) {
            return ResponseEntity.badRequest().body("User not found.");
        }

        // Create and set up the SolarPanel object
        Panel panel = new Panel();
        panel.setUserId(user.getId());
        panel.setPowerRating(panelRequest.getPowerRating());
        panel.setTemperatureCoefficient(panelRequest.getTemperatureCoefficient());
        panel.setEfficiency(panelRequest.getEfficiency());
        panel.setName(panelRequest.getName());
        panel.setQuantity(panelRequest.getQuantity());
        if (panelRequest.getClusterId() != null) {
            Cluster cluster = clusterService.getClusterById(panelRequest.getClusterId());
            if (cluster == null) {
                return ResponseEntity.badRequest().body("Invalid cluster ID.");
            }
            panel.setCluster(cluster);
        }
        // Handle location
        if (panelRequest.getUserLocation() != null) {
            Location location;

            if (user.getLocation() != null) {
                location = user.getLocation(); // Existing location
                // Update the existing location fields
                location.setLat(panelRequest.getUserLocation().getLat());
                location.setLon(panelRequest.getUserLocation().getLon());
                location.setCity(panelRequest.getUserLocation().getCity());
                location.setDistrict(panelRequest.getUserLocation().getDistrict());
                location.setCountry(panelRequest.getUserLocation().getCountry());
            } else {
                // Create a new location if the user does not have one
                location = new Location();
                location.setLat(panelRequest.getUserLocation().getLat());
                location.setLon(panelRequest.getUserLocation().getLon());
                location.setCity(panelRequest.getUserLocation().getCity());
                location.setDistrict(panelRequest.getUserLocation().getDistrict());
                location.setCountry(panelRequest.getUserLocation().getCountry());
            }

            // Register the location and associate it with the user
            locationService.register(location);
            panel.setLocation(location);
        }

        // Add the panel using the created SolarPanel object
        panelService.addPanel(panel);
        logger.info("Panel added successfully for user: {}", username);

        return ResponseEntity.ok("Panel added successfully.");
    }


    // Get all panels by user ID
    @GetMapping("/user")
    public ResponseEntity<List<Panel>> getPanelsByUserId(@RequestHeader("Authorization") String token) {
        String username = jwtUtils.extractUsername(token.substring(7)); // Extract username from token
        User user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.badRequest().body(null);
        }

        List<Panel> panels = panelService.getPanelsByUserId(user.getId());
        if (panels.isEmpty()) {
            return ResponseEntity.ok().body(null); // Return empty if no panels found
        }

        return ResponseEntity.ok(panels);
    }

    // Get a single panel by panel ID
    @GetMapping("/{panelId}")
    public ResponseEntity<Panel> getPanelById(@RequestHeader("Authorization") String token, @PathVariable String panelId) {
        String username = jwtUtils.extractUsername(token.substring(7)); // Extract username from token
        User user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.badRequest().body(null);
        }

        Panel panel = panelService.getPanelById(panelId);
        if (panel == null || !panel.getUserId().equals(user.getId())) {
            logger.error(String.valueOf(panel));
            return ResponseEntity.status(403).body(null); // Forbidden if panel does not belong to the user
        }

        return ResponseEntity.ok(panel);
    }
    @PutMapping("/{panelId}")
    public ResponseEntity<String> updatePanel(@RequestHeader("Authorization") String token,
                                              @PathVariable String panelId,
                                              @RequestBody UpdatePanelRequest panelRequest) {
        String username = jwtUtils.extractUsername(token.substring(7)); // Extract username from token
        User user = userService.findByUsername(username);

        if (user == null) {
            return ResponseEntity.badRequest().body("User not found.");
        }

        Panel existingPanel = panelService.getPanelById(panelId);

        if (existingPanel == null || !existingPanel.getUserId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Forbidden: Panel does not belong to the user.");
        }

        // Update the fields of the existing panel with the data from the request
        existingPanel.setName(panelRequest.getName());
        existingPanel.setPowerRating(panelRequest.getPowerRating());
        existingPanel.setTemperatureCoefficient(panelRequest.getTemperatureCoefficient());
        existingPanel.setEfficiency(panelRequest.getEfficiency());
        existingPanel.setQuantity(panelRequest.getQuantity());

        // Handle location update
        if (panelRequest.getUserLocation() != null) {
            Location location;

            // Update existing location if available
            if (existingPanel.getLocation() != null) {
                location = existingPanel.getLocation();
                location.setLat(panelRequest.getUserLocation().getLat());
                location.setLon(panelRequest.getUserLocation().getLon());
                location.setCity(panelRequest.getUserLocation().getCity());
                location.setDistrict(panelRequest.getUserLocation().getDistrict());
                location.setCountry(panelRequest.getUserLocation().getCountry());
                locationService.register(location); // Assuming you have a method to update existing location
            } else {
                // Create a new location if the existing one is null
                location = new Location();
                location.setLat(panelRequest.getUserLocation().getLat());
                location.setLon(panelRequest.getUserLocation().getLon());
                location.setCity(panelRequest.getUserLocation().getCity());
                location.setDistrict(panelRequest.getUserLocation().getDistrict());
                location.setCountry(panelRequest.getUserLocation().getCountry());
                locationService.register(location); // Save the new location
                existingPanel.setLocation(location); // Associate the new location with the panel
            }
        }
        if (panelRequest.getClusterId() != null) {
            Cluster cluster = clusterService.getClusterById(panelRequest.getClusterId());
            if (cluster == null) {
                return ResponseEntity.badRequest().body("Invalid cluster ID.");
            }
            existingPanel.setCluster(cluster); // Update the panel's cluster
        }
        // Update the panel in the service
        panelService.addPanel(existingPanel);
        logger.info("Panel updated successfully for user: {}", username);

        return ResponseEntity.ok("Panel updated successfully.");
    }

    // Delete an existing panel
    @DeleteMapping("/{panelId}")
    public ResponseEntity<String> deletePanel(@RequestHeader("Authorization") String token, @PathVariable String panelId) {
        String username = jwtUtils.extractUsername(token.substring(7)); // Extract username from token
        User user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.badRequest().body("User not found.");
        }

        Panel existingPanel = panelService.getPanelById(panelId);
        if (existingPanel == null || !existingPanel.getUserId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Forbidden: Panel does not belong to the user.");
        }

        panelService.deletePanel(panelId); // Assume you have this method in your service
        logger.info("Panel deleted successfully for user: {}", username);
        return ResponseEntity.ok("Panel deleted successfully.");
    }
    public static class UpdatePanelRequest {

        @Id
        private String id;
        @DBRef
        private User user;
        private int powerRating;
        private int temperatureCoefficient;
        private int efficiency;
        private String name;
        private int quantity;
        private UserController.LocationRequest location; // Added field for location
        private String clusterId;

        // Getters and Setters

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public User getUser() {
            return user;
        }

        public void setUser(User user) {
            this.user = user;
        }

        public int getPowerRating() {
            return powerRating;
        }

        public void setPowerRating(int powerRating) {
            this.powerRating = powerRating;
        }

        public int getTemperatureCoefficient() {
            return temperatureCoefficient;
        }

        public void setTemperatureCoefficient(int temperatureCoefficient) {
            this.temperatureCoefficient = temperatureCoefficient;
        }

        public int getEfficiency() {
            return efficiency;
        }

        public void setEfficiency(int efficiency) {
            this.efficiency = efficiency;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public int getQuantity() {
            return quantity;
        }

        public void setQuantity(int quantity) {
            this.quantity = quantity;
        }

        public UserController.LocationRequest getUserLocation() {
            return location;
        }

        public void setLocation(UserController.LocationRequest location) {
            this.location = location;
        }
        public String getClusterId() {
            return clusterId;
        }

        public void setClusterId(String clusterId) {
            this.clusterId = clusterId;
        }
    }

}
