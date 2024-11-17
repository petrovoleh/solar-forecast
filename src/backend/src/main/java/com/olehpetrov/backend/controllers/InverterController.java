package com.olehpetrov.backend.controllers;
import com.olehpetrov.backend.models.Inverter;
import com.olehpetrov.backend.models.User;
import com.olehpetrov.backend.services.InverterService;
import com.olehpetrov.backend.services.UserService;
import com.olehpetrov.backend.utils.JwtUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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

    // Get a single inverter by inverter ID
    @GetMapping("/{inverterId}")
    public ResponseEntity<Inverter> getInverterById(@PathVariable String inverterId) {
        Inverter inverter = inverterService.getInverterById(inverterId);
        if (inverter == null) {
            return ResponseEntity.status(404).body(null);
        }
        return ResponseEntity.ok(inverter);
    }

    // Get all inverters
    @GetMapping("/all")
    public ResponseEntity<List<Inverter>> getAllInverters() {
        List<Inverter> inverters = inverterService.getAllInverters();
        return ResponseEntity.ok(inverters);
    }

    // Add a new inverter (only for authenticated users)
    @PostMapping("/add")
    public ResponseEntity<String> addInverter(@RequestHeader("Authorization") String token, @RequestBody Inverter inverterRequest) {
        String username = jwtUtils.extractUsername(token.substring(7));
        User user = userService.findByUsername(username);

        if (user == null) {
            return ResponseEntity.badRequest().body("User not found.");
        }

        inverterService.addInverter(inverterRequest);
        logger.info("Inverter added successfully by user: {}", username);
        return ResponseEntity.ok("Inverter added successfully.");
    }
}
