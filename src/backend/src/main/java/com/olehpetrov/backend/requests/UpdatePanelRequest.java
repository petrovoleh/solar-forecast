package com.olehpetrov.backend.requests;

import com.olehpetrov.backend.models.User;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;

public class UpdatePanelRequest {

    @Id
    private String id;
    @DBRef
    private User user;
    private int powerRating;
    private int temperatureCoefficient;
    private int efficiency;
    private String name;
    private int quantity;
    private LocationRequest location; // Added field for location
    private String clusterId;

    // Getters and Setters

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public int getPowerRating() {
        return powerRating;
    }

    public void setPowerRating(int powerRating) {
        this.powerRating = powerRating;
    }

    public int getTemperatureCoefficient() {
        return temperatureCoefficient;
    }

    public void setTemperatureCoefficient(int temperatureCoefficient) {
        this.temperatureCoefficient = temperatureCoefficient;
    }

    public int getEfficiency() {
        return efficiency;
    }

    public void setEfficiency(int efficiency) {
        this.efficiency = efficiency;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public LocationRequest getUserLocation() {
        return location;
    }

    public void setLocation(LocationRequest location) {
        this.location = location;
    }
    public String getClusterId() {
        return clusterId;
    }

    public void setClusterId(String clusterId) {
        this.clusterId = clusterId;
    }
}