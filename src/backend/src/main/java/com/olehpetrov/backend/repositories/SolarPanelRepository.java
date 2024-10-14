package com.olehpetrov.backend.repositories;

import com.olehpetrov.backend.models.SolarPanel;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SolarPanelRepository extends MongoRepository<SolarPanel, String> {
    List<SolarPanel> findByUserId(String userId);
}