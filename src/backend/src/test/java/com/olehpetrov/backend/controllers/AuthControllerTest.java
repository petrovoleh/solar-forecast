package com.olehpetrov.backend.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.olehpetrov.backend.models.Role;
import com.olehpetrov.backend.models.User;
import com.olehpetrov.backend.requests.AuthRequest;
import com.olehpetrov.backend.services.UserDetailsServiceImpl;
import com.olehpetrov.backend.services.UserService;
import com.olehpetrov.backend.utils.JwtUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Date;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    @MockBean
    private JwtUtils jwtUtils;

    @MockBean
    private AuthenticationManager authenticationManager;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    @Test
    void signupReturnsTokenWhenRequestIsValid() throws Exception {
        AuthRequest request = new AuthRequest("newuser", "Password1!", "new@example.com");

        User registered = new User();
        registered.setId("user-id");
        registered.setUsername("newuser");
        registered.setEmail("new@example.com");
        registered.setPassword("Password1!");
        registered.setRole(Role.ROLE_USER);

        when(userService.existsByUsername("newuser")).thenReturn(false);
        when(userService.existsByEmail("new@example.com")).thenReturn(false);
        when(userService.register(any(User.class))).thenReturn(registered);
        when(userService.findByUsername("newuser")).thenReturn(registered);
        when(jwtUtils.generateToken("newuser")).thenReturn("jwt-token");
        when(jwtUtils.extractExpiration("jwt-token")).thenReturn(new Date(0));

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-token"))
                .andExpect(jsonPath("$.role").value("ROLE_USER"));
    }

    @Test
    void signupReturnsBadRequestWhenUsernameExists() throws Exception {
        AuthRequest request = new AuthRequest("existing", "Password1!", "existing@example.com");

        when(userService.existsByUsername("existing")).thenReturn(true);

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void signinReturnsTokenWhenCredentialsValid() throws Exception {
        AuthRequest request = new AuthRequest("user", "Password1!");

        User existing = new User();
        existing.setId("user-id");
        existing.setUsername("user");
        existing.setPassword("Password1!");
        existing.setRole(Role.ROLE_USER);

        when(userService.findByUsername("user")).thenReturn(existing);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("user", "Password1!", existing.getAuthorities()));
        when(jwtUtils.generateToken("user")).thenReturn("jwt-token");
        when(jwtUtils.extractExpiration("jwt-token")).thenReturn(new Date(0));

        mockMvc.perform(post("/api/auth/signin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-token"));
    }

    @Test
    void signinReturnsUnauthorizedWhenUserMissing() throws Exception {
        AuthRequest request = new AuthRequest("missing", "Password1!");

        when(userService.findByUsername("missing")).thenReturn(null);
        when(userService.findByEmail("missing")).thenReturn(null);

        mockMvc.perform(post("/api/auth/signin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }
}

