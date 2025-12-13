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
        inverter.setName("Demo Inverter");
        inverter.setManufacturer("Solar Forecast");
        inverter.setEfficiency(97.5);
        inverter.setCapacity(12.0);
        inverter = inverterRepository.save(inverter);

        List<PanelSeedData> panelSeedData = new ArrayList<>();
        panelSeedData.add(new PanelSeedData("Vilnius", 54.6872, 25.2797, "Lithuania", "Vilnius County", 410, 92, 12));
        panelSeedData.add(new PanelSeedData("Kaunas", 54.8985, 23.9036, "Lithuania", "Kaunas County", 400, 90, 10));
        panelSeedData.add(new PanelSeedData("Klaipeda", 55.7033, 21.1443, "Lithuania", "Klaipėda County", 410, 88, 8));
        panelSeedData.add(new PanelSeedData("Warsaw", 52.2297, 21.0122, "Poland", "Masovian", 450, 91, 15));
        panelSeedData.add(new PanelSeedData("Kyiv", 50.4501, 30.5234, "Ukraine", "Kyiv City", 420, 89, 20));

        for (PanelSeedData data : panelSeedData) {
            Location location = new Location();
            location.setLat(data.lat());
            location.setLon(data.lon());
            location.setCity(data.city());
            location.setCountry(data.country());
            location.setDistrict(data.district());
            location = locationRepository.save(location);

            Cluster cluster = new Cluster();
            cluster.setName(data.city() + " Cluster");
            cluster.setDescription("Sample cluster in " + data.city());
            cluster.setUserId(sampleUser.getId());
            cluster.setLocation(location);
            cluster.setInverter(inverter);
            cluster = clusterService.addCluster(cluster);

            Panel panel = new Panel();
            panel.setName(data.city() + " Rooftop");
            panel.setUserId(sampleUser.getId());
            panel.setPowerRating(data.powerRating());
            panel.setEfficiency(data.efficiency());
            panel.setQuantity(data.quantity());
            panel.setLocation(location);
            panel.setCluster(cluster);
            solarPanelService.addPanel(panel);
        }
    }

    private record PanelSeedData(String city, double lat, double lon, String country, String district,
                                 int powerRating, int efficiency, int quantity) {
    }
}
