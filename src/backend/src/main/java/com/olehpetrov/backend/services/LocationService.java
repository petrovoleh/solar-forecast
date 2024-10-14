package com.olehpetrov.backend.services;

import com.olehpetrov.backend.models.Location;
import com.olehpetrov.backend.repositories.LocationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class LocationService {

    @Autowired
    private LocationRepository locationRepository;
    // Register a user without setting an address
    public Location register(Location location) {
        return locationRepository.save(location);
    }

}
