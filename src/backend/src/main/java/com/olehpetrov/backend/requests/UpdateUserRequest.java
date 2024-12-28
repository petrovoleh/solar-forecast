package com.olehpetrov.backend.requests;

import com.olehpetrov.backend.models.Role;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class UpdateUserRequest {
    private String email;
    private String password;
    private Role role;
    private LocationRequest location;

}