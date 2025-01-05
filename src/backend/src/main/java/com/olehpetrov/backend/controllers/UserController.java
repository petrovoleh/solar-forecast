package com.olehpetrov.backend.controllers;

import com.olehpetrov.backend.models.*;
import com.olehpetrov.backend.models.User;
import com.olehpetrov.backend.requests.LocationRequest;
import com.olehpetrov.backend.requests.UpdateUserRequest;
import com.olehpetrov.backend.responses.ClusterResponse;
import com.olehpetrov.backend.responses.UserProfileResponse;
import com.olehpetrov.backend.services.LocationService;
import com.olehpetrov.backend.services.UserService;
import com.olehpetrov.backend.utils.JwtUtils;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/user")
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);
    @Autowired
    private LocationService locationService;
    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtils jwtUtil;

    // Endpoint to update user information (email, password, etc.)
    @PutMapping("/update")
    public ResponseEntity<String> updateUser(@RequestHeader("Authorization") String token, @RequestBody UpdateUserRequest updateUserRequest) {
        String username = jwtUtil.extractUsername(token.substring(7)); // Отримання username з токена
        User user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.badRequest().body("User not found.");
        }

        // Оновлення електронної пошти, якщо вона присутня
        if (updateUserRequest.getEmail() != null && !updateUserRequest.getEmail().isEmpty()) {
            if (!updateUserRequest.getEmail().equals(user.getEmail()) && userService.existsByEmail(updateUserRequest.getEmail())) {
                return ResponseEntity.badRequest().body("Email is already taken.");
            }
            user.setEmail(updateUserRequest.getEmail());
        }

        // Оновлення пароля, якщо він присутній
        if (updateUserRequest.getPassword() != null && !updateUserRequest.getPassword().isEmpty()) {
            if (!isValidPassword(updateUserRequest.getPassword())) {
                return ResponseEntity.badRequest().body("Password does not meet security requirements.");
            }
            user.setPassword(updateUserRequest.getPassword());
        }

        // Оновлення адреси, якщо вона присутня в запиті
        if (updateUserRequest.getLocation() != null) {
            Location location;
            if (user.getLocation() != null) {
                location = user.getLocation(); // Existing location
                // Update the location fields
                location.setLat(updateUserRequest.getLocation().getLat());
                location.setLon(updateUserRequest.getLocation().getLon());
                location.setCity(updateUserRequest.getLocation().getCity());
                location.setDistrict(updateUserRequest.getLocation().getDistrict());
                location.setCountry(updateUserRequest.getLocation().getCountry());
            } else {
                // Create a new location only if the user does not have one
                location = new Location();
                location.setLat(updateUserRequest.getLocation().getLat());
                location.setLon(updateUserRequest.getLocation().getLon());
                location.setCity(updateUserRequest.getLocation().getCity());
                location.setDistrict(updateUserRequest.getLocation().getDistrict());
                location.setCountry(updateUserRequest.getLocation().getCountry());

            }
            locationService.register(location);
            user.setLocation(location);
        }


        userService.register(user); // Збереження оновленого користувача
        logger.info("User updated successfully: {}", user.getUsername());

        return ResponseEntity.ok("User details and location updated successfully.");
    }

    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<String> updateUserById(@PathVariable String id, @Valid @RequestBody UpdateUserRequest updateUserRequest) {
        User user = userService.getById(id);
        if (user == null) {
            return ResponseEntity.badRequest().body("User not found.");
        }

        // Оновлення електронної пошти, якщо вона присутня
        if (updateUserRequest.getEmail() != null && !updateUserRequest.getEmail().isEmpty()) {
            if (!updateUserRequest.getEmail().equals(user.getEmail()) && userService.existsByEmail(updateUserRequest.getEmail())) {
                return ResponseEntity.badRequest().body("Email is already taken.");
            }
            user.setEmail(updateUserRequest.getEmail());
        }

        // Оновлення пароля, якщо він присутній
        if (updateUserRequest.getPassword() != null && !updateUserRequest.getPassword().isEmpty()) {
            if (!isValidPassword(updateUserRequest.getPassword())) {
                return ResponseEntity.badRequest().body("Password does not meet security requirements.");
            }
            user.setPassword(updateUserRequest.getPassword());
        }
        if (updateUserRequest.getRole() != null) {
            user.setRole(updateUserRequest.getRole());
        }

        // Оновлення адреси, якщо вона присутня в запиті
        if (updateUserRequest.getLocation() != null) {
            Location location;
            if (user.getLocation() != null) {
                location = user.getLocation(); // Existing location
                // Update the location fields
                location.setLat(updateUserRequest.getLocation().getLat());
                location.setLon(updateUserRequest.getLocation().getLon());
                location.setCity(updateUserRequest.getLocation().getCity());
                location.setDistrict(updateUserRequest.getLocation().getDistrict());
                location.setCountry(updateUserRequest.getLocation().getCountry());
            } else {
                // Create a new location only if the user does not have one
                location = new Location();
                location.setLat(updateUserRequest.getLocation().getLat());
                location.setLon(updateUserRequest.getLocation().getLon());
                location.setCity(updateUserRequest.getLocation().getCity());
                location.setDistrict(updateUserRequest.getLocation().getDistrict());
                location.setCountry(updateUserRequest.getLocation().getCountry());

            }
            locationService.register(location);
            user.setLocation(location);
        }


        userService.register(user); // Збереження оновленого користувача
        logger.info("User updated successfully: {}", user.getUsername());

        return ResponseEntity.ok("User details and location updated successfully.");
    }


    // Endpoint to update or set user location
    @PutMapping("/location")
    public ResponseEntity<String> updateLocation(@RequestHeader("Authorization") String token, @Valid @RequestBody LocationRequest locationRequest) {
        String username = jwtUtil.extractUsername(token.substring(7)); // Extract username from token
        User user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.badRequest().body("User not found.");
        }

        // Create and save the new location
        Location location = new Location();
        location.setLat(locationRequest.getLat());
        location.setLon(locationRequest.getLon());
        location.setCity(locationRequest.getCity());
        location.setDistrict(locationRequest.getDistrict());
        location.setCountry(locationRequest.getCountry());

        userService.setUserLocation(user.getId(), location); // Save the location for the user
        logger.info("User location updated successfully: {}", user.getUsername());

        return ResponseEntity.ok("User location updated successfully.");
    }

    // New endpoint to get user information
    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getUserProfile(@RequestHeader("Authorization") String token) {
        String username = jwtUtil.extractUsername(token.substring(7)); // Extract username from token
        User user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.badRequest().body(null);
        }

        // Return user details and location in response
        UserProfileResponse response = new UserProfileResponse(user.getUsername(), user.getEmail(), user.getRole().toString(), user.getLocation());
        return ResponseEntity.ok(response);
    }
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable String id) {

        User user = userService.getById(id);
        if (user == null) {
            return ResponseEntity.badRequest().body(null);
        }

        return ResponseEntity.ok(user);
    }

    // New endpoint to get user location
    @GetMapping("/location")
    public ResponseEntity<Location> getLocation(@RequestHeader("Authorization") String token) {
        String username = jwtUtil.extractUsername(token.substring(7)); // Extract username from token
        User user = userService.findByUsername(username);
        if (user == null || user.getLocation() == null) {
            return ResponseEntity.badRequest().body(null);
        }

        // Return the location details in response
        return ResponseEntity.ok(user.getLocation());
    }
    @GetMapping("/all")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<Page<ClusterResponse>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {

        // Fetch paginated panels from the service
        Page<User> users = userService.findAll(PageRequest.of(page, size));

        // Map users to a simplified response
        Page<ClusterResponse> response = users.map(panel -> new ClusterResponse(panel.getUsername(), panel.getId()));

        return ResponseEntity.ok(response);
    }
    // Utility method to validate password
    private boolean isValidPassword(String password) {
        return password.matches("^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).{8,}$");
    }
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@RequestHeader("Authorization") String token, @PathVariable String id) {
    

        User existingUser = userService.getById(id);

        if (existingUser == null) {
            return ResponseEntity.status(403).body("Forbidden.");
        }

        userService.delete(id); // Assume you have this method in your service
        logger.info("User deleted successfully");
        return ResponseEntity.ok("User deleted successfully.");
    }
}
