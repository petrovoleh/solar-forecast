package com.olehpetrov.backend.repositories;

import com.olehpetrov.backend.models.Location;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface LocationRepository extends MongoRepository<Location, String> {
}
