package com.olehpetrov.backend.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.olehpetrov.backend.models.Location;
import com.olehpetrov.backend.models.Role;
import com.olehpetrov.backend.models.User;
import com.olehpetrov.backend.services.LocationService;
import com.olehpetrov.backend.services.UserDetailsServiceImpl;
import com.olehpetrov.backend.services.UserService;
import com.olehpetrov.backend.utils.JwtUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private LocationService locationService;

    @MockBean
    private UserService userService;

    @MockBean
    private JwtUtils jwtUtils;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    private User buildUser() {
        User user = new User();
        user.setId("user-id");
        user.setUsername("user");
        user.setEmail("user@example.com");
        user.setPassword("Password1!");
        user.setRole(Role.ROLE_USER);
        return user;
    }

    @Test
    void createAdminReturnsOk() throws Exception {
        mockMvc.perform(post("/api/user/create_admin"))
                .andExpect(status().isOk());
    }

    @Test
    void updateUserReturnsOkForValidRequest() throws Exception {
        User user = buildUser();
        Location location = new Location();
        location.setLat(10.0);
        location.setLon(20.0);

        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);
        when(userService.existsByEmail("new@example.com")).thenReturn(false);
        when(locationService.register(any(Location.class))).thenReturn(location);
        when(userService.register(any(User.class))).thenReturn(user);

        Map<String, Object> request = Map.of(
                "email", "new@example.com",
                "password", "Password1!",
                "location", Map.of(
                        "lat", 10.0,
                        "lon", 20.0,
                        "city", "City",
                        "district", "District",
                        "country", "Country"
                )
        );

        mockMvc.perform(put("/api/user/update")
                        .header("Authorization", "Bearer token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateUserByIdReturnsOkForAdmin() throws Exception {
        User user = buildUser();
        Location location = new Location();

        when(userService.getById("user-id")).thenReturn(user);
        when(userService.existsByEmail("admin@example.com")).thenReturn(false);
        when(locationService.register(any(Location.class))).thenReturn(location);
        when(userService.register(any(User.class))).thenReturn(user);

        Map<String, Object> request = Map.of(
                "email", "admin@example.com",
                "password", "Password1!",
                "role", "ROLE_ADMIN",
                "location", Map.of(
                        "lat", 11.0,
                        "lon", 22.0,
                        "city", "City",
                        "district", "District",
                        "country", "Country"
                )
        );

        mockMvc.perform(put("/api/user/user-id")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void updateLocationReturnsOk() throws Exception {
        User user = buildUser();
        Location location = new Location();
        location.setLat(10.0);
        location.setLon(20.0);

        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);
        when(userService.setUserLocation(anyString(), any(Location.class))).thenReturn(user);

        Map<String, Object> request = Map.of(
                "lat", 10.0,
                "lon", 20.0,
                "city", "City",
                "district", "District",
                "country", "Country"
        );

        mockMvc.perform(put("/api/user/location")
                        .header("Authorization", "Bearer token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void getProfileReturnsUserDetails() throws Exception {
        User user = buildUser();
        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);

        mockMvc.perform(get("/api/user/profile")
                        .header("Authorization", "Bearer token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("user"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getUserByIdReturnsUser() throws Exception {
        User user = buildUser();
        when(userService.getById("user-id")).thenReturn(user);

        mockMvc.perform(get("/api/user/user-id"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("user"));
    }

    @Test
    void getLocationReturnsUserLocation() throws Exception {
        User user = buildUser();
        Location location = new Location();
        location.setLat(10.0);
        location.setLon(20.0);
        user.setLocation(location);

        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);

        mockMvc.perform(get("/api/user/location")
                        .header("Authorization", "Bearer token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lat").value(10.0));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getAllUsersReturnsPage() throws Exception {
        User user = buildUser();
        when(userService.findAll(PageRequest.of(0, 100)))
                .thenReturn(new PageImpl<>(List.of(user), PageRequest.of(0, 100), 1));

        mockMvc.perform(get("/api/user/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("user"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void deleteUserReturnsOk() throws Exception {
        User user = buildUser();
        when(userService.getById("user-id")).thenReturn(user);
        doNothing().when(userService).delete("user-id");

        mockMvc.perform(delete("/api/user/user-id")
                        .header("Authorization", "Bearer token"))
                .andExpect(status().isOk());
    }
}

