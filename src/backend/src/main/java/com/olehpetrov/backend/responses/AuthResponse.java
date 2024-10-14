package com.olehpetrov.backend.responses;

import java.util.Date;

public class AuthResponse {
    private String token;
    private Date expirationDate;

    public AuthResponse(String token, Date expirationDate) {
        this.token = token;
        this.expirationDate = expirationDate;
    }

    // Getters and Setters
    public String getToken() {
        return token;
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

