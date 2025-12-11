package com.olehpetrov.backend.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.olehpetrov.backend.models.Panel;
import com.olehpetrov.backend.models.Role;
import com.olehpetrov.backend.models.User;
import com.olehpetrov.backend.services.ClusterService;
import com.olehpetrov.backend.services.LocationService;
import com.olehpetrov.backend.services.SolarPanelService;
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
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SolarPanelController.class)
@AutoConfigureMockMvc(addFilters = false)
class SolarPanelControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private SolarPanelService panelService;

    @MockBean
    private LocationService locationService;

    @MockBean
    private ClusterService clusterService;

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
        user.setRole(Role.ROLE_USER);
        return user;
    }

    @Test
    void addPanelReturnsOkForValidRequest() throws Exception {
        User user = buildUser();
        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);
        when(panelService.addPanel(any(Panel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Map<String, Object> request = Map.of(
                "name", "Panel",
                "powerRating", 400,
                "efficiency", 20,
                "quantity", 2,
                "location", Map.of(
                        "lat", 10.0,
                        "lon", 10.0,
                        "city", "City",
                        "district", "District",
                        "country", "Country"
                )
        );

        mockMvc.perform(post("/api/panel/add")
                        .header("Authorization", "Bearer token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void getPanelsByUserReturnsPanels() throws Exception {
        User user = buildUser();
        Panel panel = new Panel();
        panel.setId("panel-id");
        panel.setUserId("user-id");

        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);
        when(panelService.getPanelsByUserId("user-id")).thenReturn(List.of(panel));

        mockMvc.perform(get("/api/panel/user")
                        .header("Authorization", "Bearer token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("panel-id"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getAllPanelsReturnsPage() throws Exception {
        Panel panel = new Panel();
        panel.setId("panel-id");
        panel.setName("Panel");

        when(panelService.findAll(PageRequest.of(0, 10)))
                .thenReturn(new PageImpl<>(List.of(panel), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/panel/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Panel"));
    }

    @Test
    void getPanelByIdReturnsPanelForOwner() throws Exception {
        User user = buildUser();
        Panel panel = new Panel();
        panel.setId("panel-id");
        panel.setUserId("user-id");

        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);
        when(panelService.getPanelById("panel-id")).thenReturn(panel);

        mockMvc.perform(get("/api/panel/panel-id")
                        .header("Authorization", "Bearer token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("panel-id"));
    }

    @Test
    void updatePanelReturnsOkForOwner() throws Exception {
        User user = buildUser();
        Panel panel = new Panel();
        panel.setId("panel-id");
        panel.setUserId("user-id");

        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);
        when(panelService.getPanelById("panel-id")).thenReturn(panel);

        Map<String, Object> request = Map.of(
                "name", "Updated",
                "powerRating", 420,
                "efficiency", 21,
                "quantity", 3,
                "location", Map.of(
                        "lat", 20.0,
                        "lon", 20.0,
                        "city", "City",
                        "district", "District",
                        "country", "Country"
                )
        );

        mockMvc.perform(put("/api/panel/panel-id")
                        .header("Authorization", "Bearer token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void deletePanelReturnsOkForOwner() throws Exception {
        User user = buildUser();
        Panel panel = new Panel();
        panel.setId("panel-id");
        panel.setUserId("user-id");

        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);
        when(panelService.getPanelById("panel-id")).thenReturn(panel);

        mockMvc.perform(delete("/api/panel/panel-id")
                        .header("Authorization", "Bearer token"))
                .andExpect(status().isOk());
    }

    @Test
    void addPanelReturnsBadRequestWhenPowerRatingMissing() throws Exception {
        User user = buildUser();
        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);

        Map<String, Object> request = Map.of(
                "name", "Panel",
                "efficiency", 20,
                "quantity", 2,
                "location", Map.of(
                        "lat", 10.0,
                        "lon", 10.0,
                        "city", "City",
                        "district", "District",
                        "country", "Country"
                )
        );

        mockMvc.perform(post("/api/panel/add")
                        .header("Authorization", "Bearer token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void addPanelReturnsBadRequestWhenLocationMissing() throws Exception {
        User user = buildUser();
        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);

        Map<String, Object> request = Map.of(
                "name", "Panel",
                "powerRating", 400,
                "efficiency", 20,
                "quantity", 2
        );

        mockMvc.perform(post("/api/panel/add")
                        .header("Authorization", "Bearer token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}

