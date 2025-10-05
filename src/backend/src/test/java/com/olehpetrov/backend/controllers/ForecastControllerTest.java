package com.olehpetrov.backend.controllers;

import com.olehpetrov.backend.models.Cluster;
import com.olehpetrov.backend.models.Inverter;
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
    void getTotalReturnsDailyForecastForPanel() throws Exception {
        User user = buildUser();
        Panel panel = buildPanel();

        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);
        when(panelService.getPanelById("panel-id")).thenReturn(panel);

        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);

        double capacity = panel.getPowerRating() / 1000.0 * (panel.getEfficiency() / 100.0);
        String expectedUrl = String.format(
                "http://localhost:8000/daily_forecast?lat=%.6f&lon=%.6f&start=%s&end=%s&kwp=%.3f",
                panel.getLocation().getLat(),
                panel.getLocation().getLon(),
                today,
                tomorrow,
                capacity
        );

        String forecastResponse = "[{\"date\":\"" + today + "\",\"pred_kWh\":5.0}]";
        when(restTemplate.exchange(eq(expectedUrl), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok(forecastResponse));

        mockMvc.perform(get("/api/forecast/getTotal")
                        .header("Authorization", "Bearer token")
                        .param("panelId", "panel-id")
                        .param("from", today + " 00:00:00")
                        .param("to", tomorrow + " 00:00:00")
                        .param("type", "panel"))
                .andExpect(status().isOk())
                .andExpect(content().json("[{\"date\":\"" + today + "\",\"totalEnergy_kwh\":5.0}]"));
    }

    @Test
    void getTotalReturnsDailyForecastForCluster() throws Exception {
        User user = buildUser();
        Cluster cluster = new Cluster();
        cluster.setId("cluster-id");
        cluster.setUserId("user-id");

        Inverter inverter = new Inverter();
        inverter.setId("inverter-id");
        inverter.setEfficiency(90.0);
        cluster.setInverter(inverter);

        Panel panel = buildPanel();
        panel.setCluster(cluster);

        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);
        when(clusterService.getClusterById("cluster-id")).thenReturn(cluster);
        when(panelService.getPanelsByClusterId("cluster-id")).thenReturn(List.of(panel));
        when(panelService.calculateTotalCapacityKwp(List.of(panel))).thenReturn(10.0);
        when(inverterService.getInverterById("inverter-id")).thenReturn(inverter);

        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);

        double expectedCapacity = 10.0 * (inverter.getEfficiency() / 100.0);
        String expectedUrl = String.format(
                "http://localhost:8000/daily_forecast?lat=%.6f&lon=%.6f&start=%s&end=%s&kwp=%.3f",
                panel.getLocation().getLat(),
                panel.getLocation().getLon(),
                today,
                tomorrow,
                expectedCapacity
        );

        String forecastResponse = "[{\"date\":\"" + today + "\",\"pred_kWh\":8.0}]";
        when(restTemplate.exchange(eq(expectedUrl), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok(forecastResponse));

        mockMvc.perform(get("/api/forecast/getTotal")
                        .header("Authorization", "Bearer token")
                        .param("panelId", "cluster-id")
                        .param("from", today + " 00:00:00")
                        .param("to", tomorrow + " 00:00:00")
                        .param("type", "cluster"))
                .andExpect(status().isOk())
                .andExpect(content().json("[{\"date\":\"" + today + "\",\"totalEnergy_kwh\":8.0}]"));
    }
}

