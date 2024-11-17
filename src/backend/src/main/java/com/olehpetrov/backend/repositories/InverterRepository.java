package com.olehpetrov.backend.repositories;

import com.olehpetrov.backend.models.Inverter;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InverterRepository extends MongoRepository<Inverter, String> {
}
