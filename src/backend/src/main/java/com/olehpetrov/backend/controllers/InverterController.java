package com.olehpetrov.backend.controllers;
import com.olehpetrov.backend.factories.InverterFactory;
import com.olehpetrov.backend.models.Inverter;
import com.olehpetrov.backend.models.Panel;
import com.olehpetrov.backend.models.Role;
import com.olehpetrov.backend.models.User;
import com.olehpetrov.backend.repositories.InverterRepository;
import com.olehpetrov.backend.services.InverterService;
import com.olehpetrov.backend.services.UserService;
import com.olehpetrov.backend.utils.JwtUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inverter")
@CrossOrigin(origins = "http://localhost:3000")
public class InverterController {

    private static final Logger logger = LoggerFactory.getLogger(InverterController.class);

    @Autowired
    private InverterService inverterService;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtils jwtUtils;
    @Autowired
    private InverterRepository inverterRepository;

    // Get a single inverter by inverter ID
    @GetMapping("/{inverterId}")
    public ResponseEntity<Inverter> getInverterById(@PathVariable String inverterId) {
        if(inverterId == null || inverterId.isEmpty()) {
            return ResponseEntity.status(400).body(null);
        }
        Inverter inverter = inverterService.getInverterById(inverterId);
        if (inverter == null) {
            return ResponseEntity.status(404).body(null);
        }
        return ResponseEntity.ok(inverter);
    }

    // Get all inverters
    @GetMapping("/all")
    public ResponseEntity<Page<Inverter>> getAllInverters(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "15") int size) {
        Page<Inverter> inverters = inverterService.findAll(PageRequest.of(page, size));

        return ResponseEntity.ok(inverters);
    }

    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @PostMapping("/add")
    public ResponseEntity<String> addInverter(@RequestHeader("Authorization") String token, @RequestBody Inverter inverterRequest) {
        if (token == null || token.isEmpty()) {
            return ResponseEntity.status(400).body("Token is missing.");
        }

        try {
            String username = jwtUtils.extractUsername(token.substring(7));
            User user = userService.findByUsername(username);

            if (user == null) {
                return ResponseEntity.badRequest().body("User not found.");
            }

            inverterService.addInverter(inverterRequest);
            logger.info("Inverter added successfully by user: {}", username);
            return ResponseEntity.ok("Inverter added successfully.");
        } catch (RuntimeException e) {
            logger.error("Invalid token provided: {}", e.getMessage());
            return ResponseEntity.status(400).body("Invalid request.");
        }
    }
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<String> updateInverter(@RequestHeader("Authorization") String token, @PathVariable String id, @RequestBody Inverter inverterRequest) {
        if (token == null || token.isEmpty()) {
            return ResponseEntity.status(400).body("Token is missing.");
        }

        try {
            String username = jwtUtils.extractUsername(token.substring(7));
            User user = userService.findByUsername(username);

            if (user == null) {
                return ResponseEntity.badRequest().body("User not found.");
            }

            Inverter existingInverter = inverterService.getInverterById(id);
            if (existingInverter == null) {
                return ResponseEntity.status(404).body("Inverter not found.");
            }

            // Update existing inverter details
            existingInverter.setName(inverterRequest.getName());
            existingInverter.setManufacturer(inverterRequest.getManufacturer());
            existingInverter.setEfficiency(inverterRequest.getEfficiency());
            existingInverter.setCapacity(inverterRequest.getCapacity());

            inverterService.updateInverter(existingInverter);
            logger.info("Inverter updated successfully by user: {}", username);
            return ResponseEntity.ok("Inverter updated successfully.");
        } catch (RuntimeException e) {
            logger.error("Invalid token provided: {}", e.getMessage());
            return ResponseEntity.status(400).body("Invalid request.");
        }
    }

    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @PostMapping("/create")
    public ResponseEntity<String> create() {
        InverterFactory.createInverters(inverterRepository);
        return ResponseEntity.ok("Inverter deleted successfully.");
    }

    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@RequestHeader("Authorization") String token, @PathVariable String id) {
        Inverter existingInverter = inverterService.getInverterById(id);
        if (existingInverter == null) {
            return ResponseEntity.status(403).body("Forbidden.");
        }
        inverterService.delete(id); // Assume you have this method in your service
        return ResponseEntity.ok("Inverter deleted successfully.");
    }
}
