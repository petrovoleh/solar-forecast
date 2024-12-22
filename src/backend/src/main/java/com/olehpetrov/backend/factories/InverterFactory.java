package com.olehpetrov.backend.factories;

import com.olehpetrov.backend.models.Inverter;
import com.olehpetrov.backend.repositories.InverterRepository;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
public class InverterFactory {

    /**
     * Generates a list of 20 standard inverters with slight differences in properties.
     *
     */
    public static void createInverters(InverterRepository inverterRepository) {
        List<Inverter> inverters = new ArrayList<>();

        for (int i = 1; i <= 10; i++) {
            Inverter inverter = new Inverter();
            inverter.setId(UUID.randomUUID().toString()); // Unique ID for each inverter
            int efficiency = 90 + i ;
            inverter.setName("Inverter " + efficiency+"% efficiency"); // Name following a simple pattern
            inverter.setManufacturer("Standard"); // Placeholder for manufacturer
            inverter.setEfficiency(efficiency* 1.0); // Slight increase in efficiency with each inverter
            inverter.setCapacity(50.0); // Fixed capacity for all inverters
            inverters.add(inverter);
        }
        inverterRepository.saveAll(inverters); // Save all generated inverters to the database
    }

}
