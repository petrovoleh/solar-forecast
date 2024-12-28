package com.olehpetrov.backend.responses;

import com.olehpetrov.backend.models.Location;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class UserProfileResponse {
    private String username;
    private String email;
    private String role;
    private Location location;

    public UserProfileResponse(String username, String email, String role, Location location) {
        this.username = username;
        this.email = email;
        this.role = role;
        this.location = location;
    }
}