package com.olehpetrov.backend.responses;

import com.olehpetrov.backend.models.Location;

public class UserProfileResponse {
    private String username;
    private String email;
    private String role;
    private Location location; // Include location in the response

    public UserProfileResponse(String username, String email, String role, Location location) {
        this.username = username;
        this.email = email;
        this.role = role;
        this.location = location;
    }

    // Getters and Setters
    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Location getLocation() {
        return location;
    }

    public void setLocation(Location location) {
        this.location = location;
    }
}