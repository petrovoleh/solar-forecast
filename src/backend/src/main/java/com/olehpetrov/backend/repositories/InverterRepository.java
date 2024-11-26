package com.olehpetrov.backend.repositories;

import com.olehpetrov.backend.models.Inverter;
import com.olehpetrov.backend.models.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InverterRepository extends MongoRepository<Inverter, String> {
    Page<Inverter> findAll(Pageable pageable);

}
