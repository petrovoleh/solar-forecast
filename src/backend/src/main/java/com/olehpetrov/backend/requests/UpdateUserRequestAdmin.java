package com.olehpetrov.backend.requests;

import com.olehpetrov.backend.models.Role;

public class UpdateUserRequestAdmin {
    private String email;
    private String password;
    private Role role; // Використання конкретного типу замість Enum

    private LocationRequest location; // Поле для локації

    // Гетери та сетери
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

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public LocationRequest getLocation() { // Виправлений метод
        return location;
    }

    public void setLocation(LocationRequest location) { // Виправлений метод
        this.location = location;
    }
}
