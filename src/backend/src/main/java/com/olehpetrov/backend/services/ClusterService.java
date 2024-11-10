package com.olehpetrov.backend.services;

import com.olehpetrov.backend.models.Cluster;
import com.olehpetrov.backend.repositories.ClusterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ClusterService {

    @Autowired
    private ClusterRepository clusterRepository;

    // Add a new cluster
    public Cluster addCluster(Cluster cluster) {
        return clusterRepository.save(cluster);
    }

    // Get all clusters by user ID
    public List<Cluster> getClustersByUserId(String userId) {
        return clusterRepository.findByUserId(userId);
    }

    // Get a single cluster by cluster ID
    public Cluster getClusterById(String clusterId) {
        Optional<Cluster> cluster = clusterRepository.findById(clusterId);
        return cluster.orElse(null); // Return null if cluster not found
    }

    // Update an existing cluster
    public Cluster updateCluster(Cluster cluster) {
        return clusterRepository.save(cluster); // save() will update if ID exists
    }

    // Delete an existing cluster by cluster ID
    public void deleteCluster(String clusterId) {
        clusterRepository.deleteById(clusterId);
    }
}
