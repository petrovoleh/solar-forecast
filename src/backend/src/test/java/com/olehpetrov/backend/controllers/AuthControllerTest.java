package com.olehpetrov.backend.controllers;

import com.olehpetrov.backend.models.User;
import com.olehpetrov.backend.requests.AuthRequest;
import com.olehpetrov.backend.responses.AuthResponse;
import com.olehpetrov.backend.services.UserService;
import com.olehpetrov.backend.utils.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Date;

import static com.olehpetrov.backend.models.Role.ROLE_USER;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthControllerTest {

    @InjectMocks
    private AuthController authController;

    @Mock
    private UserService userService;

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private AuthenticationManager authenticationManager;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void signup_Success() {
        AuthRequest signupRequest = new AuthRequest();
        signupRequest.setUsername("newuser");
        signupRequest.setPassword("Password123!");
        signupRequest.setEmail("newuser@example.com");

        User newUser = new User();
        newUser.setUsername(signupRequest.getUsername());
        newUser.setPassword(signupRequest.getPassword());
        newUser.setEmail(signupRequest.getEmail());
        newUser.setRole(ROLE_USER);

        String jwt = "mockJwtToken";
        Date expirationDate = new Date(System.currentTimeMillis() + 1000 * 60 * 60); // 1 hour from now

        when(userService.existsByUsername(signupRequest.getUsername())).thenReturn(false);
        when(userService.existsByEmail(signupRequest.getEmail())).thenReturn(false);
        when(userService.findByUsername(signupRequest.getUsername())).thenReturn(newUser);
        when(jwtUtils.generateToken(signupRequest.getUsername())).thenReturn(jwt);
        when(jwtUtils.extractExpiration(jwt)).thenReturn(expirationDate);

        ResponseEntity<?> response = authController.signup(signupRequest);

        assertEquals(200, response.getStatusCodeValue());
        AuthResponse authResponse = (AuthResponse) response.getBody();
        assertNotNull(authResponse);
        assertEquals(jwt, authResponse.getToken());
    }

    @Test
    void signin_Success() {
        AuthRequest signinRequest = new AuthRequest();
        signinRequest.setUsername("validUser");
        signinRequest.setPassword("Password123!");

        UserDetails userDetails = mock(UserDetails.class);
        String jwt = "mockJwtToken";
        Date expirationDate = new Date(System.currentTimeMillis() + 1000 * 60 * 60); // 1 hour from now

        when(userDetails.getUsername()).thenReturn(signinRequest.getUsername());
        when(userService.existsByUsername(signinRequest.getUsername())).thenReturn(false);
        when(userService.existsByEmail(signinRequest.getEmail())).thenReturn(false);
        when(jwtUtils.generateToken(userDetails.getUsername())).thenReturn(jwt);
        when(jwtUtils.extractExpiration(jwt)).thenReturn(expirationDate);

        // Instead of doNothing(), mock the authenticate method to not throw exceptions for valid credentials
        doAnswer(invocation -> null).when(authenticationManager).authenticate(
                new UsernamePasswordAuthenticationToken(signinRequest.getUsername(), signinRequest.getPassword())
        );

        ResponseEntity<?> response = authController.signin(signinRequest);

        assertEquals(200, response.getStatusCodeValue());
        AuthResponse authResponse = (AuthResponse) response.getBody();
        assertNotNull(authResponse);
        assertEquals(jwt, authResponse.getToken());
    }

    @Test
    void signup_InvalidPassword() {
        AuthRequest signupRequest = new AuthRequest();
        signupRequest.setUsername("newuser");
        signupRequest.setPassword("weak");
        signupRequest.setEmail("newuser@example.com");

        when(userService.existsByUsername(signupRequest.getUsername())).thenReturn(false);
        when(userService.existsByEmail(signupRequest.getEmail())).thenReturn(false);

        ResponseEntity<?> response = authController.signup(signupRequest);

        assertEquals(400, response.getStatusCodeValue());
        assertEquals("Password does not meet security requirements.", response.getBody());
    }

    @Test
    void signin_InvalidCredentials() {
        AuthRequest signinRequest = new AuthRequest();
        signinRequest.setUsername("invalidUser");
        signinRequest.setPassword("wrongPassword");

        when(userService.findByUsername(signinRequest.getUsername())).thenReturn(null);

        ResponseEntity<?> response = authController.signin(signinRequest);

        assertEquals(401, response.getStatusCodeValue());
        assertEquals("Invalid username or password.", response.getBody());
    }
}
