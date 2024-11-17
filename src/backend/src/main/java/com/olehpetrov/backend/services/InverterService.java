package com.olehpetrov.backend.services;

import com.olehpetrov.backend.models.Inverter;
import com.olehpetrov.backend.repositories.InverterRepository;
import org.springframework.beans.factory.annotation.Autowired;
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

    // Retrieve a list of all inverters
    public List<Inverter> getAllInverters() {
        return inverterRepository.findAll();
    }

    // Add a new inverter
    public void addInverter(Inverter inverterRequest) {
        inverterRepository.save(inverterRequest);
    }
}
