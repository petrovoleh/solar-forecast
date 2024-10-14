package com.olehpetrov.backend.models;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

@RequiredArgsConstructor
@Getter
public enum Role {
    ROLE_USER(List.of(new SimpleGrantedAuthority("ROLE_USER"))),
    ROLE_ADMIN(List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

    private final List<SimpleGrantedAuthority> authorities;
}
