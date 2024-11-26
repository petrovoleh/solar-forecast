package com.olehpetrov.backend.controllers;

import com.olehpetrov.backend.models.*;
import com.olehpetrov.backend.requests.LocationRequest;
import com.olehpetrov.backend.responses.ClusterResponse;
import com.olehpetrov.backend.services.ClusterService;
import com.olehpetrov.backend.services.InverterService;
import com.olehpetrov.backend.services.UserService;
import com.olehpetrov.backend.utils.JwtUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.olehpetrov.backend.services.LocationService;

import java.util.List;

@RestController
@RequestMapping("/api/cluster")
@CrossOrigin(origins = "http://localhost:3000")
public class ClusterController {

    private static final Logger logger = LoggerFactory.getLogger(ClusterController.class);

    @Autowired
    private ClusterService clusterService;
    @Autowired
    private InverterService inverterService;
    @Autowired
    private UserService userService;
    @Autowired
    private LocationService locationService;

    @Autowired
    private JwtUtils jwtUtils;

    // Add a new cluster
    @PostMapping("/add")
    public ResponseEntity<String> addCluster(@RequestHeader("Authorization") String token,
                                             @RequestBody UpdateClusterRequest clusterRequest) {
        // Extract username from token
        String username = jwtUtils.extractUsername(token.substring(7));
        User user = userService.findByUsername(username);

        if (user == null) {
            return ResponseEntity.badRequest().body("User not found.");
        }

        // Create and set up the Cluster object
        Cluster cluster = new Cluster();
        cluster.setUserId(user.getId());
        cluster.setName(clusterRequest.getName());
        cluster.setDescription(clusterRequest.getDescription());

        // Handle location
        if (clusterRequest.getLocation() != null) {
            Location location = handleLocation(clusterRequest.getLocation(), user);
            cluster.setLocation(location);
        }

        // Handle inverter
        if (clusterRequest.getInverterId() != null) {
            Inverter inverter = inverterService.getInverterById(clusterRequest.getInverterId());
            if (inverter == null) {
                return ResponseEntity.badRequest().body("Invalid inverter ID.");
            }
            cluster.setInverter(inverter);
        }

        // Save the cluster
        clusterService.addCluster(cluster);
        logger.info("Cluster added successfully for user: {}", username);

        return ResponseEntity.ok("Cluster added successfully.");
    }

    private Location handleLocation(LocationRequest locationRequest, User user) {
        Location location;

        if (user.getLocation() != null) {
            location = user.getLocation(); // Existing location
            // Update the existing location fields
            location.setLat(locationRequest.getLat());
            location.setLon(locationRequest.getLon());
            location.setCity(locationRequest.getCity());
            location.setDistrict(locationRequest.getDistrict());
            location.setCountry(locationRequest.getCountry());
        } else {
            // Create a new location if the user does not have one
            location = new Location();
            location.setLat(locationRequest.getLat());
            location.setLon(locationRequest.getLon());
            location.setCity(locationRequest.getCity());
            location.setDistrict(locationRequest.getDistrict());
            location.setCountry(locationRequest.getCountry());
        }

        // Save or update the location
        locationService.register(location);
        return location;
    }
    // Get all clusters by user ID
    @GetMapping("/user")
    public ResponseEntity<List<Cluster>> getClustersByUserId(@RequestHeader("Authorization") String token) {
        String username = jwtUtils.extractUsername(token.substring(7));
        User user = userService.findByUsername(username);

        if (user == null) {
            return ResponseEntity.badRequest().body(null);
        }

        List<Cluster> clusters = clusterService.getClustersByUserId(user.getId());
        return ResponseEntity.ok(clusters);
    }
    @GetMapping("/all")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<Page<ClusterResponse>> getAllClusters(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        // Fetch paginated panels from the service
        Page<Cluster> clusters = clusterService.findAll(PageRequest.of(page, size));

        // Map users to a simplified response
        Page<ClusterResponse> response = clusters.map(panel -> new ClusterResponse(panel.getName(), panel.getId()));


        return ResponseEntity.ok(response);
    }
    // Get a single cluster by cluster ID
    @GetMapping("/{clusterId}")
    public ResponseEntity<Cluster> getClusterById(@RequestHeader("Authorization") String token, @PathVariable String clusterId) {
        // Extract username from token
        String username = jwtUtils.extractUsername(token.substring(7));

        // Find user by username
        User user = userService.findByUsername(username);

        if (user == null) {
            // If user not found, return bad request
            return ResponseEntity.badRequest().body(null);
        }

        // Retrieve cluster by ID
        Cluster cluster = clusterService.getClusterById(clusterId);
        if (cluster == null) {
            // If cluster not found, return 404
            return ResponseEntity.status(404).body(null);
        }

        // Check if the user is an admin or the owner of the cluster
        if (user.getRole().equals(Role.ROLE_ADMIN) || cluster.getUserId().equals(user.getId())) {
            // If admin or the user is the owner, return the cluster
            return ResponseEntity.ok(cluster);
        } else {
            // If user is not authorized, return forbidden (403)
            return ResponseEntity.status(403).body(null);
        }
    }


    // Update an existing cluster with additional location and inverter update handling
    @PutMapping("/{clusterId}")
    public ResponseEntity<String> updateCluster(@RequestHeader("Authorization") String token,
                                                @PathVariable String clusterId,
                                                @RequestBody UpdateClusterRequest clusterRequest) {
        String username = jwtUtils.extractUsername(token.substring(7));
        User user = userService.findByUsername(username);

        if (user == null) {
            return ResponseEntity.badRequest().body("User not found.");
        }

        Cluster existingCluster = clusterService.getClusterById(clusterId);
        if (existingCluster == null) {
            return ResponseEntity.status(404).body("Cluster not found.");
        }

        // Update fields
        if (clusterRequest.getName() != null) {
            existingCluster.setName(clusterRequest.getName());
        }
        if (clusterRequest.getDescription() != null) {
            existingCluster.setDescription(clusterRequest.getDescription());
        }

        // Handle location update
        if (clusterRequest.getLocation() != null) {
            Location updatedLocation = handleLocation(clusterRequest.getLocation(), user);
            existingCluster.setLocation(updatedLocation);
        }

        // Handle inverter update
        if (clusterRequest.getInverterId() != null) {
            Inverter inverter = inverterService.getInverterById(clusterRequest.getInverterId());
            if (inverter == null) {
                return ResponseEntity.badRequest().body("Invalid inverter ID.");
            }
            existingCluster.setInverter(inverter);
        }

        // Save the updated cluster
        clusterService.updateCluster(existingCluster);
        logger.info("Cluster updated successfully for user: {}", username);

        return ResponseEntity.ok("Cluster updated successfully.");
    }


    // Delete an existing cluster
    @DeleteMapping("/{clusterId}")
    public ResponseEntity<String> deleteCluster(@RequestHeader("Authorization") String token, @PathVariable String clusterId) {
        String username = jwtUtils.extractUsername(token.substring(7));
        User user = userService.findByUsername(username);

        if (user == null) {
            return ResponseEntity.badRequest().body("User not found.");
        }

        Cluster existingCluster = clusterService.getClusterById(clusterId);
        if (existingCluster == null) {
            return ResponseEntity.status(404).body("Cluster not found.");
        }

        clusterService.deleteCluster(clusterId);
        logger.info("Cluster deleted successfully for user: {}", username);
        return ResponseEntity.ok("Cluster deleted successfully.");
    }

    public static class UpdateClusterRequest {
        private String name;
        private String description;
        private String inverterId;
        private LocationRequest location;

        // Getters and setters

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public String getInverterId() {
            return inverterId;
        }

        public void setInverterId(String inverterId) {
            this.inverterId = inverterId;
        }

        public LocationRequest getLocation() {
            return location;
        }

        public void setLocation(LocationRequest location) {
            this.location = location;
        }
    }

}
