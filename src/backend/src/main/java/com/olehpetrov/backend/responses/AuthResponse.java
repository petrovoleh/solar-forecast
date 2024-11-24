package com.olehpetrov.backend.responses;

import java.util.Date;

public class AuthResponse {
    private String token;
    private Date expirationDate;
    private String role;
    public AuthResponse(String token, Date expirationDate, String role) {
        this.token = token;
        this.expirationDate = expirationDate;
        this.role =role;
    }

    // Getters and Setters
    public String getToken() {
        return token;
    }

    public void setRole(String role) {
        this.role = role;
    }
    public String getRole() {
        if (role != null && role.length() > 1) {
            return role.substring(1, role.length() - 1);
        }
        return role;  // Return the role as is if it's null or too short
    }


    public void setToken(String token) {
        this.token = token;
    }

    public Date getExpirationDate() {
        return expirationDate;
    }

    public void setExpirationDate(Date expirationDate) {
        this.expirationDate = expirationDate;
    }
}

