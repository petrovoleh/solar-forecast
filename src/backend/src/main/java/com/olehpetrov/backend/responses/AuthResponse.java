package com.olehpetrov.backend.responses;

import lombok.Setter;

import java.util.Date;

@Setter
public class AuthResponse {
    private String token;
    private Date expirationDate;
    private String role;

    public AuthResponse(String token, Date expirationDate, String role) {
        this.token = token;
        this.expirationDate = expirationDate;
        this.role =role;
    }

    public String getToken() {
        return token;
    }

    public String getRole() {
        if (role != null && role.length() > 1) {
            return role.substring(1, role.length() - 1);
        }
        return role;
    }

    public Date getExpirationDate() {
        return expirationDate;
    }

}

