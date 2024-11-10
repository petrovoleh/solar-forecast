package com.olehpetrov.backend.controllers;

import com.olehpetrov.backend.models.Cluster;
import com.olehpetrov.backend.models.User;
import com.olehpetrov.backend.services.ClusterService;
import com.olehpetrov.backend.services.UserService;
import com.olehpetrov.backend.utils.JwtUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cluster")
@CrossOrigin(origins = "http://localhost:3000")
public class ClusterController {

    private static final Logger logger = LoggerFactory.getLogger(ClusterController.class);

    @Autowired
    private ClusterService clusterService;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtils jwtUtils;

    // Add a new cluster
    @PostMapping("/add")
    public ResponseEntity<String> addCluster(@RequestHeader("Authorization") String token, @RequestBody Cluster clusterRequest) {
        String username = jwtUtils.extractUsername(token.substring(7));
        User user = userService.findByUsername(username);

        if (user == null) {
            return ResponseEntity.badRequest().body("User not found.");
        }

        clusterService.addCluster(clusterRequest);
        logger.info("Cluster added successfully for user: {}", username);
        return ResponseEntity.ok("Cluster added successfully.");
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

    // Get a single cluster by cluster ID
    @GetMapping("/{clusterId}")
    public ResponseEntity<Cluster> getClusterById(@RequestHeader("Authorization") String token, @PathVariable String clusterId) {
        String username = jwtUtils.extractUsername(token.substring(7));
        User user = userService.findByUsername(username);

        if (user == null) {
            return ResponseEntity.badRequest().body(null);
        }

        Cluster cluster = clusterService.getClusterById(clusterId);
        if (cluster == null) {
            return ResponseEntity.status(404).body(null);
        }

        return ResponseEntity.ok(cluster);
    }

    // Update an existing cluster
    @PutMapping("/{clusterId}")
    public ResponseEntity<String> updateCluster(@RequestHeader("Authorization") String token,
                                                @PathVariable String clusterId,
                                                @RequestBody Cluster clusterRequest) {
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
        existingCluster.setName(clusterRequest.getName());
        existingCluster.setDescription(clusterRequest.getDescription());
        existingCluster.setInverter(clusterRequest.getInverter());
        existingCluster.setLocation(clusterRequest.getLocation());

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
}
