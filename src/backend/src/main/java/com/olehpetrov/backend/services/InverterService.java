package com.olehpetrov.backend.services;

import com.olehpetrov.backend.models.Inverter;
import com.olehpetrov.backend.models.Panel;
import com.olehpetrov.backend.repositories.InverterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class InverterService {

    @Autowired
    private InverterRepository inverterRepository;

    // Retrieve a specific inverter by its ID
    public Inverter getInverterById(String inverterId) {
        Optional<Inverter> inverterOptional = inverterRepository.findById(inverterId);
        return inverterOptional.orElse(null);
    }
    public void delete(String id) {
        inverterRepository.deleteById(id);
    }

    public Page<Inverter> findAll(Pageable pageable) {
        return inverterRepository.findAll(pageable);
    }
    // Add a new inverter
    public void addInverter(Inverter inverterRequest) {
        inverterRepository.save(inverterRequest);
    }
}
