package com.olehpetrov.backend.controllers;

import com.olehpetrov.backend.models.User;
import com.olehpetrov.backend.requests.AuthRequest;
import com.olehpetrov.backend.responses.AuthResponse;
import com.olehpetrov.backend.services.UserService;
import com.olehpetrov.backend.utils.JwtUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Date;

import static com.olehpetrov.backend.models.Role.ROLE_USER;


@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtils jwtUtil;

    @Autowired
    private AuthenticationManager authenticationManager;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody AuthRequest signupRequest) {
        // Check if username already exists
        if (userService.existsByUsername(signupRequest.getUsername())) {
            return ResponseEntity.badRequest().body("Username is already taken.");
        }
        if (userService.existsByEmail(signupRequest.getEmail())) {
            return ResponseEntity.badRequest().body("Email is already taken.");
        }
        // Validate password
        if (!isValidPassword(signupRequest.getPassword())) {
            return ResponseEntity.badRequest().body("Password does not meet security requirements.");
        }

        // Register user and set default role
        User user = new User();
        user.setUsername(signupRequest.getUsername());
        user.setPassword(signupRequest.getPassword());
        user.setEmail(signupRequest.getEmail());
        user.setRole(ROLE_USER); // Assign a default role

        userService.register(user);
        logger.info("User registered successfully: {}", user.getUsername());

        // Load user details
        UserDetails userDetails = userService.findByUsername(user.getUsername());
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("User registration failed.");
        }

        // Generate JWT token
        String jwt = jwtUtil.generateToken(userDetails.getUsername());
        final Date expirationDate = jwtUtil.extractExpiration(jwt); // Extract expiration date

        // Return the JWT token in the response
        return ResponseEntity.ok(new AuthResponse(jwt, expirationDate, userDetails.getAuthorities().toString()));
    }


    @PostMapping("/signin")
    public ResponseEntity<?> signin(@Valid @RequestBody AuthRequest AuthRequest) {
        // Validate presence of username and password
        if (AuthRequest.getUsername() == null || AuthRequest.getPassword() == null) {
            return ResponseEntity.badRequest().body("Username and password must be provided.");
        }

        try {
             UserDetails userDetail = userService.findByUsername(AuthRequest.getUsername());
            if (userDetail == null) {
                userDetail = userService.findByEmail(AuthRequest.getUsername());
            }
            final UserDetails userDetails = userDetail;
            if (userDetails == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid username or password.");
            }
            // Authenticate the user
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(userDetails.getUsername(), AuthRequest.getPassword()));

            // Load user details


            // Generate JWT token
            final String jwt = jwtUtil.generateToken(userDetails.getUsername());
            final Date expirationDate = jwtUtil.extractExpiration(jwt); // Extract expiration date

            logger.info("User signed in successfully: {}", userDetails.getUsername());
            return ResponseEntity.ok(new AuthResponse(jwt, expirationDate, userDetails.getAuthorities().toString()));
        } catch (Exception e) {
            logger.error("Authentication failed for user: {}", AuthRequest.getUsername(), e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid username or password.");
        }
    }

    private boolean isValidPassword(String password) {
        // Password validation logic (e.g., at least 8 characters, 1 uppercase, 1 lowercase, 1 digit, 1 special character)
        return password.matches("^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).{8,}$");
    }
}
