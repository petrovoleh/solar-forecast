package com.olehpetrov.backend.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.olehpetrov.backend.models.Inverter;
import com.olehpetrov.backend.models.Role;
import com.olehpetrov.backend.models.User;
import com.olehpetrov.backend.repositories.InverterRepository;
import com.olehpetrov.backend.services.InverterService;
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

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(InverterController.class)
@AutoConfigureMockMvc(addFilters = false)
class InverterControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private InverterService inverterService;

    @MockBean
    private UserService userService;

    @MockBean
    private JwtUtils jwtUtils;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    @MockBean
    private InverterRepository inverterRepository;

    private User buildAdmin() {
        User user = new User();
        user.setId("admin-id");
        user.setUsername("admin");
        user.setRole(Role.ROLE_ADMIN);
        return user;
    }

    @Test
    void getInverterByIdReturnsInverter() throws Exception {
        Inverter inverter = new Inverter();
        inverter.setId("inv-1");
        inverter.setName("Inverter");

        when(inverterService.getInverterById("inv-1")).thenReturn(inverter);

        mockMvc.perform(get("/api/inverter/inv-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("inv-1"));
    }

    @Test
    void getAllInvertersReturnsPage() throws Exception {
        Inverter inverter = new Inverter();
        inverter.setId("inv-1");
        inverter.setName("Inverter");

        when(inverterService.findAll(PageRequest.of(0, 15)))
                .thenReturn(new PageImpl<>(List.of(inverter), PageRequest.of(0, 15), 1));

        mockMvc.perform(get("/api/inverter/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Inverter"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void addInverterReturnsOkForAdmin() throws Exception {
        User admin = buildAdmin();
        when(jwtUtils.extractUsername("token")).thenReturn("admin");
        when(userService.findByUsername("admin")).thenReturn(admin);

        Map<String, Object> request = Map.of(
                "name", "New Inverter",
                "manufacturer", "Manufacturer",
                "efficiency", 98.0,
                "capacity", 10.0
        );

        mockMvc.perform(post("/api/inverter/add")
                        .header("Authorization", "Bearer token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateInverterReturnsOkForExistingInverter() throws Exception {
        User admin = buildAdmin();
        Inverter inverter = new Inverter();
        inverter.setId("inv-1");

        when(jwtUtils.extractUsername("token")).thenReturn("admin");
        when(userService.findByUsername("admin")).thenReturn(admin);
        when(inverterService.getInverterById("inv-1")).thenReturn(inverter);

        Map<String, Object> request = Map.of(
                "name", "Updated",
                "manufacturer", "Manufacturer",
                "efficiency", 95.0,
                "capacity", 8.0
        );

        mockMvc.perform(put("/api/inverter/inv-1")
                        .header("Authorization", "Bearer token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createInvertersReturnsOk() throws Exception {
        mockMvc.perform(post("/api/inverter/create"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void deleteInverterReturnsOkWhenExists() throws Exception {
        Inverter inverter = new Inverter();
        inverter.setId("inv-1");

        when(inverterService.getInverterById("inv-1")).thenReturn(inverter);

        mockMvc.perform(delete("/api/inverter/inv-1")
                        .header("Authorization", "Bearer token"))
                .andExpect(status().isOk());
    }
}

