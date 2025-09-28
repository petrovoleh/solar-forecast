package com.olehpetrov.backend.controllers;

import com.olehpetrov.backend.models.DailyEnergyTotal;
import com.olehpetrov.backend.models.Location;
import com.olehpetrov.backend.models.Panel;
import com.olehpetrov.backend.models.Role;
import com.olehpetrov.backend.models.User;
import com.olehpetrov.backend.services.ClusterService;
import com.olehpetrov.backend.services.InverterService;
import com.olehpetrov.backend.services.SolarPanelService;
import com.olehpetrov.backend.services.UserDetailsServiceImpl;
import com.olehpetrov.backend.services.UserService;
import com.olehpetrov.backend.utils.JwtUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ForecastController.class)
@AutoConfigureMockMvc(addFilters = false)
class ForecastControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SolarPanelService panelService;

    @MockBean
    private ClusterService clusterService;

    @MockBean
    private InverterService inverterService;

    @MockBean
    private UserService userService;

    @MockBean
    private JwtUtils jwtUtils;

    @MockBean
    private RestTemplate restTemplate;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    private User buildUser() {
        User user = new User();
        user.setId("user-id");
        user.setUsername("user");
        user.setRole(Role.ROLE_USER);
        return user;
    }

    private Panel buildPanel() {
        Panel panel = new Panel();
        panel.setId("panel-id");
        panel.setUserId("user-id");
        panel.setPowerRating(400);
        panel.setEfficiency(20);
        Location location = new Location();
        location.setLat(50.0);
        location.setLon(30.0);
        panel.setLocation(location);
        return panel;
    }

    @Test
    void getForecastReturnsDataForPanel() throws Exception {
        User user = buildUser();
        Panel panel = buildPanel();

        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);
        when(panelService.getPanelById("panel-id")).thenReturn(panel);
        when(restTemplate.exchange(eq("http://localhost:8000/forecast"), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok("[{\"datetime\":\"2024-01-01T00:00:00\",\"power_kw\":1.5}]"));

        LocalDate today = LocalDate.now();
        String from = today.toString() + " 00:00:00";
        String to = today.plusDays(1).toString() + " 00:00:00";

        mockMvc.perform(post("/api/forecast/getForecast")
                        .header("Authorization", "Bearer token")
                        .param("panelId", "panel-id")
                        .param("from", from)
                        .param("to", to)
                        .param("type", "panel"))
                .andExpect(status().isOk())
                .andExpect(content().json("[{\"datetime\":\"2024-01-01T00:00:00\",\"power_kw\":1.5}]"));
    }

    @Test
    void getForecastReturnsBadRequestForInvalidType() throws Exception {
        User user = buildUser();
        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);

        LocalDate today = LocalDate.now();
        String from = today.toString() + " 00:00:00";
        String to = today.plusDays(1).toString() + " 00:00:00";

        mockMvc.perform(post("/api/forecast/getForecast")
                        .header("Authorization", "Bearer token")
                        .param("panelId", "panel-id")
                        .param("from", from)
                        .param("to", to)
                        .param("type", "invalid"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getTotalReturnsCachedTotalsForPanel() throws Exception {
        User user = buildUser();
        Panel panel = buildPanel();
        DailyEnergyTotal total = new DailyEnergyTotal();
        total.setPanel(panel);
        LocalDate today = LocalDate.now();
        total.setDate(today.toString());
        total.setTotalEnergy_kwh(5.0);

        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);
        when(panelService.getPanelById("panel-id")).thenReturn(panel);
        when(panelService.getDailyEnergyTotalsByDateRange(eq(panel), anyString(), anyString()))
                .thenReturn(List.of(total));

        mockMvc.perform(get("/api/forecast/getTotal")
                        .header("Authorization", "Bearer token")
                        .param("panelId", "panel-id")
                        .param("from", today.toString() + " 00:00:00")
                        .param("to", today.toString() + " 00:00:00")
                        .param("type", "panel"))
                .andExpect(status().isOk())
                .andExpect(content().json("[{\"date\":\"" + today + "\",\"totalEnergy_kwh\":5.0}]"));
    }
}

