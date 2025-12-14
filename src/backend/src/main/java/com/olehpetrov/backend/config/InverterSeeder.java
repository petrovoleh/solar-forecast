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
                createInverter("Sample Inverter 5kW 95COP", "SampleTech", 95.0, 5.0),
                createInverter("Sample Inverter 10kW 95.5COP", "SampleTech", 95.5, 10.0),
                createInverter("Sample Inverter 15kW 96COP", "SampleTech", 96.0, 15.0),
                createInverter("Sample Inverter 20kW 96.5COP", "SampleTech", 96.5, 20.0),
                createInverter("Sample Inverter 25kW 97COP", "SampleTech", 97.0, 25.0),
                createInverter("Sample Inverter 30kW 97.2COP", "SampleTech", 97.2, 30.0),
                createInverter("Sample Inverter 35kW 97.4COP", "SampleTech", 97.4, 35.0),
                createInverter("Sample Inverter 40kW 97.6COP", "SampleTech", 97.6, 40.0),
                createInverter("Sample Inverter 50kW 97.8COP", "SampleTech", 97.8, 50.0),
                createInverter("Sample Inverter 60kW 98COP", "SampleTech", 98.0, 60.0)
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
