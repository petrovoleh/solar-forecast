package com.olehpetrov.backend.services;

import com.olehpetrov.backend.models.Location;
import com.olehpetrov.backend.models.Panel;
import com.olehpetrov.backend.models.User;
import com.olehpetrov.backend.repositories.LocationRepository;
import com.olehpetrov.backend.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LocationRepository locationRepository;  // Autowire the LocationRepository

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    // Register a user without setting an location
    public User register(User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    public User findByUsername(String username) {
        return userRepository.findByUsername(username).orElse(null);
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    // New method to update or set the user's location later
    public User setUserLocation(String userId, Location location) {
        User user = userRepository.findById(userId).orElse(null);
        if (user != null && location != null) {
            Location savedLocation = locationRepository.save(location);
            user.setLocation(savedLocation);  // Set the location on the user
            return userRepository.save(user);  // Save the updated user
        }
        return null;  // Handle null case (user not found)
    }
    public Page<User> findAll(Pageable pageable) {
        return userRepository.findAll(pageable);
    }
}
