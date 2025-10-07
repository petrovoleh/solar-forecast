package com.olehpetrov.backend.config;

import com.olehpetrov.backend.models.Inverter;
import com.olehpetrov.backend.repositories.InverterRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class InverterSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(InverterSeeder.class);

    private final InverterRepository inverterRepository;

    public InverterSeeder(InverterRepository inverterRepository) {
        this.inverterRepository = inverterRepository;
    }

    @Override
    public void run(String... args) {
        List<Inverter> defaultInverters = List.of(
                createInverter("Aurora Flex 5", "SolarSim", 90.0, 5.0),
                createInverter("Aurora Flex 10", "SolarSim", 92.5, 10.0),
                createInverter("Aurora Flex 20", "SolarSim", 94.0, 20.0)
        );

        defaultInverters.forEach(inverter -> {
            if (!inverterRepository.existsByNameIgnoreCase(inverter.getName())) {
                inverterRepository.save(inverter);
                logger.info("Seeded inverter '{}' with efficiency {}%", inverter.getName(), inverter.getEfficiency());
            }
        });
    }

    private Inverter createInverter(String name, String manufacturer, double efficiency, double capacity) {
        Inverter inverter = new Inverter();
        inverter.setName(name);
        inverter.setManufacturer(manufacturer);
        inverter.setEfficiency(efficiency);
        inverter.setCapacity(capacity);
        return inverter;
    }
}
