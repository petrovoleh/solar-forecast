package com.olehpetrov.backend.repositories;

import com.olehpetrov.backend.models.Panel;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface SolarPanelRepository extends MongoRepository<Panel, String> {
    List<Panel> findByUserId(String userId);
    @Query("{ 'cluster.$id': ?0 }")
    List<Panel> findByCluster(ObjectId clusterId);

}