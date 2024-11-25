package com.olehpetrov.backend.responses;

import com.olehpetrov.backend.models.Location;

public class UserResponse {
    private String username;
    private String id;


    public UserResponse(String username, String id) {
        this.username = username;
        this.id=id;
    }

    // Getters and Setters
    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

}