package com.olehpetrov.backend.requests;

public class UpdateUserRequest {
    private String email;
    private String password;
    private LocationRequest location; // Added field for location

    // Getters and Setters
    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public LocationRequest getUserLocation() {
        return location;
    }

    public void setLocation(LocationRequest location) {
        this.location = location;
    }
}