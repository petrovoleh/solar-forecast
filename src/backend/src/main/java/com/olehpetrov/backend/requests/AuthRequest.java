package com.olehpetrov.backend.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthRequest {

    // Username is required and must not exceed 40 characters.
    @NotBlank(message = "Username is required")
    @Size(max = 40, message = "Username cannot exceed 40 characters")
    private String username;

    // Email is required for sign-up but not for sign-in.
    // Must be a valid email format and within length limits.
    @Email(message = "Invalid email format")
    @Size(max = 254, message = "Email cannot exceed 254 characters")
    private String email;

    // Password must meet length constraints.
    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 254, message = "Password must be between 8 and 254 characters")
    private String password;

    // Default constructor for deserialization
    public AuthRequest() {
    }

    // Constructor for sign-up requests (username, email, and password required)
    public AuthRequest(String username, String password, String email) {
        this.username = username;
        this.password = password;
        this.email = email;
    }

    // Constructor for sign-in requests (email is optional)
    public AuthRequest(String username, String password) {
        this.username = username;
        this.password = password;
    }

    // Getters and Setters
    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
