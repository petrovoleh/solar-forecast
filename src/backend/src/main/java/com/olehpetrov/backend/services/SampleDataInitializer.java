package com.olehpetrov.backend.services;

import com.olehpetrov.backend.models.Cluster;
import com.olehpetrov.backend.models.Inverter;
import com.olehpetrov.backend.models.Location;
import com.olehpetrov.backend.models.Panel;
import com.olehpetrov.backend.models.Role;
import com.olehpetrov.backend.models.User;
import com.olehpetrov.backend.repositories.ClusterRepository;
import com.olehpetrov.backend.repositories.InverterRepository;
import com.olehpetrov.backend.repositories.LocationRepository;
import com.olehpetrov.backend.repositories.UserRepository;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class SampleDataInitializer {

    private final UserService userService;
    private final UserRepository userRepository;
    private final ClusterService clusterService;
    private final SolarPanelService solarPanelService;
    private final ClusterRepository clusterRepository;
    private final LocationRepository locationRepository;
    private final InverterRepository inverterRepository;

    public SampleDataInitializer(UserService userService,
                                 UserRepository userRepository,
                                 ClusterService clusterService,
                                 SolarPanelService solarPanelService,
                                 ClusterRepository clusterRepository,
                                 LocationRepository locationRepository,
                                 InverterRepository inverterRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.clusterService = clusterService;
        this.solarPanelService = solarPanelService;
        this.clusterRepository = clusterRepository;
        this.locationRepository = locationRepository;
        this.inverterRepository = inverterRepository;
    }

    public void createSampleUserWithData() {
        User sampleUser = userRepository.findByUsername("test")
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setUsername("test");
                    newUser.setPassword("test");
                    newUser.setEmail("test@example.com");
                    newUser.setRole(Role.ROLE_USER);
                    return userService.register(newUser);
                });

        if (!clusterRepository.findByUserId(sampleUser.getId()).isEmpty()) {
            return;
        }

        Inverter inverter = new Inverter();
        inverter.setName("Solar Forecast 12kW 97.5% Inverter");
        inverter.setManufacturer("Solar Forecast");
        inverter.setEfficiency(97.5);
        inverter.setCapacity(12.0);
        inverter = inverterRepository.save(inverter);

        List<CitySeedData> citySeedData = new ArrayList<>();
        citySeedData.add(new CitySeedData(
                "Vilnius", 54.6872, 25.2797, "Lithuania", "Vilnius County",
                List.of(
                        new PanelSeedData("Vilnius Rooftop A", 410, 92, 12),
                        new PanelSeedData("Vilnius Rooftop B", 365, 90, 10),
                        new PanelSeedData("Vilnius Ground Array", 495, 94, 6)
                )));
        citySeedData.add(new CitySeedData(
                "Kaunas", 54.8985, 23.9036, "Lithuania", "Kaunas County",
                List.of(
                        new PanelSeedData("Kaunas Rooftop A", 400, 90, 10),
                        new PanelSeedData("Kaunas Rooftop B", 360, 88, 8),
                        new PanelSeedData("Kaunas Carport", 440, 91, 5)
                )));
        citySeedData.add(new CitySeedData(
                "Klaipeda", 55.7033, 21.1443, "Lithuania", "Klaipėda County",
                List.of(
                        new PanelSeedData("Klaipeda Rooftop A", 410, 88, 8),
                        new PanelSeedData("Klaipeda Rooftop B", 370, 86, 10),
                        new PanelSeedData("Klaipeda Pier Array", 460, 90, 4)
                )));
        citySeedData.add(new CitySeedData(
                "Warsaw", 52.2297, 21.0122, "Poland", "Masovian",
                List.of(
                        new PanelSeedData("Warsaw Rooftop A", 450, 91, 15),
                        new PanelSeedData("Warsaw Rooftop B", 395, 89, 12),
                        new PanelSeedData("Warsaw Industrial", 520, 93, 5)
                )));
        citySeedData.add(new CitySeedData(
                "Kyiv", 50.4501, 30.5234, "Ukraine", "Kyiv City",
                List.of(
                        new PanelSeedData("Kyiv Rooftop A", 420, 89, 20),
                        new PanelSeedData("Kyiv Rooftop B", 380, 90, 10),
                        new PanelSeedData("Kyiv Industrial", 500, 95, 6)
                )));
        citySeedData.add(new CitySeedData(
                "Riga", 56.9496, 24.1052, "Latvia", "Riga",
                List.of(
                        new PanelSeedData("Demo 1kW Rooftop", 1000, 95, 5),
                        new PanelSeedData("Riga Rooftop B", 520, 93, 4),
                        new PanelSeedData("Riga Ground Array", 760, 94, 3)
                )));
        citySeedData.add(new CitySeedData(
                "Stockholm", 59.3293, 18.0686, "Sweden", "Stockholm",
                List.of(
                        new PanelSeedData("Demo 2kW Rooftop", 2000, 97, 5),
                        new PanelSeedData("Stockholm Rooftop B", 680, 95, 4),
                        new PanelSeedData("Stockholm Floating Array", 820, 96, 3)
                )));

        for (CitySeedData cityData : citySeedData) {
            Location location = new Location();
            location.setLat(cityData.lat());
            location.setLon(cityData.lon());
            location.setCity(cityData.city());
            location.setCountry(cityData.country());
            location.setDistrict(cityData.district());
            location = locationRepository.save(location);

            double totalPowerKw = cityData.panels().stream()
                    .mapToDouble(panel -> (panel.powerRating() * panel.quantity()) / 1000.0)
                    .sum();

            double weightedEfficiency = cityData.panels().stream()
                    .mapToDouble(panel -> (panel.powerRating() * panel.quantity()) * panel.efficiency())
                    .sum()
                    / cityData.panels().stream()
                    .mapToDouble(panel -> panel.powerRating() * panel.quantity())
                    .sum();

            Cluster cluster = new Cluster();
            cluster.setName(String.format("%s Cluster - %.1f kW %d%%", cityData.city(), totalPowerKw, Math.round(weightedEfficiency)));
            cluster.setDescription("Sample cluster in " + cityData.city());
            cluster.setUserId(sampleUser.getId());
            cluster.setLocation(location);
            cluster.setInverter(inverter);
            cluster = clusterService.addCluster(cluster);

            for (PanelSeedData panelData : cityData.panels()) {
                Panel panel = new Panel();
                panel.setName(panelData.panelName());
                panel.setUserId(sampleUser.getId());
                panel.setPowerRating(panelData.powerRating());
                panel.setEfficiency(panelData.efficiency());
                panel.setQuantity(panelData.quantity());
                panel.setLocation(location);
                panel.setCluster(cluster);
                solarPanelService.addPanel(panel);
            }
        }
    }

    private record CitySeedData(String city, double lat, double lon, String country, String district,
                                List<PanelSeedData> panels) {
    }

    private record PanelSeedData(String panelName, int powerRating, int efficiency, int quantity) {
    }
}
