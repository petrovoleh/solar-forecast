package com.olehpetrov.backend.repositories;

import com.olehpetrov.backend.models.Panel;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SolarPanelRepository extends MongoRepository<Panel, String> {
    List<Panel> findByUserId(String userId);
}