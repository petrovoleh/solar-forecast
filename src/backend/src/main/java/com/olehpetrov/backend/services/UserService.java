package com.olehpetrov.backend.services;

import com.olehpetrov.backend.models.Location;
import com.olehpetrov.backend.models.Role;
import com.olehpetrov.backend.models.User;
import com.olehpetrov.backend.repositories.LocationRepository;
import com.olehpetrov.backend.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

import static com.olehpetrov.backend.models.Role.ROLE_ADMIN;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LocationRepository locationRepository;  // Autowire the LocationRepository

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    // Register a user without setting a location
    public User register(User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    public void updatePassword(User user, String rawPassword) {
        user.setPassword(passwordEncoder.encode(rawPassword));
    }

    public User saveUser(User user) {
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
    public User getById(String userId) {
        Optional<User> userOptional = userRepository.findById(userId);
        return userOptional.orElse(null);
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
    public void delete(String id) {
        userRepository.deleteById(id);
    }

    public void createAdminUserIfNotExists() {
        String adminUsername = "admin";

        // Check if the user already exists
        if (userRepository.findByUsername(adminUsername).isEmpty()) {
            // Create a new user instance
            User adminUser = new User();
            adminUser.setUsername(adminUsername);
            adminUser.setPassword(passwordEncoder.encode("admin"));
            adminUser.setEmail("admin@example.com"); // Optional, set as needed

            adminUser.setRole(ROLE_ADMIN);

            // Save the user to the database
            userRepository.save(adminUser);

            System.out.println("Admin user created successfully.");
        } else {
            System.out.println("Admin user already exists.");
        }
    }
}
