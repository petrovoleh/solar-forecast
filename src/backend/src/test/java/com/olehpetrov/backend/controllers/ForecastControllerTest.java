package com.olehpetrov.backend.controllers;

import com.olehpetrov.backend.models.Cluster;
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
import org.mockito.ArgumentCaptor;
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
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
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


    @Test
    void getTotalFetchesMissingPanelDatesAndSavesTotals() throws Exception {
        User user = buildUser();
        Panel panel = buildPanel();

        DailyEnergyTotal cachedTotal = new DailyEnergyTotal();
        cachedTotal.setPanel(panel);
        LocalDate today = LocalDate.now();
        cachedTotal.setDate(today.toString());
        cachedTotal.setTotalEnergy_kwh(5.0);

        LocalDate tomorrow = today.plusDays(1);

        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);
        when(panelService.getPanelById("panel-id")).thenReturn(panel);
        when(panelService.getDailyEnergyTotalsByDateRange(eq(panel), anyString(), anyString()))
                .thenReturn(List.of(cachedTotal));

        String forecastResponse = "[{\"datetime\":\"" + tomorrow + "T00:00:00\",\"power_kw\":4.0},{\"datetime\":\"" + tomorrow + "T00:15:00\",\"power_kw\":2.0}]";
        when(restTemplate.exchange(eq("http://localhost:8000/forecast"), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok(forecastResponse));

        mockMvc.perform(get("/api/forecast/getTotal")
                        .header("Authorization", "Bearer token")
                        .param("panelId", "panel-id")
                        .param("from", today.toString() + " 00:00:00")
                        .param("to", tomorrow.toString() + " 00:00:00")
                        .param("type", "panel"))
                .andExpect(status().isOk())
                .andExpect(content().json("[{\"date\":\"" + today + "\",\"totalEnergy_kwh\":5.0},{\"date\":\"" + tomorrow + "\",\"totalEnergy_kwh\":1.5}]"));

        ArgumentCaptor<DailyEnergyTotal> captor = ArgumentCaptor.forClass(DailyEnergyTotal.class);
        verify(panelService).saveDailyEnergyTotal(captor.capture());
        DailyEnergyTotal savedTotal = captor.getValue();
        org.junit.jupiter.api.Assertions.assertEquals(tomorrow.toString(), savedTotal.getDate());
        org.junit.jupiter.api.Assertions.assertEquals(1.5, savedTotal.getTotalEnergy_kwh());
    }

    @Test
    void getTotalAggregatesClusterRecordsAndForecast() throws Exception {
        User user = buildUser();
        Cluster cluster = new Cluster();
        cluster.setId("cluster-id");
        cluster.setUserId("user-id");

        Panel panel1 = buildPanel();
        panel1.setId("panel-1");
        panel1.setCluster(cluster);

        Panel panel2 = buildPanel();
        panel2.setId("panel-2");
        panel2.setCluster(cluster);

        DailyEnergyTotal panel1Total = new DailyEnergyTotal();
        panel1Total.setPanel(panel1);
        LocalDate today = LocalDate.now();
        panel1Total.setDate(today.toString());
        panel1Total.setTotalEnergy_kwh(5.0);

        DailyEnergyTotal panel2Total = new DailyEnergyTotal();
        panel2Total.setPanel(panel2);
        panel2Total.setDate(today.toString());
        panel2Total.setTotalEnergy_kwh(3.0);

        LocalDate tomorrow = today.plusDays(1);

        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);
        when(clusterService.getClusterById("cluster-id")).thenReturn(cluster);
        when(panelService.getPanelsByClusterId("cluster-id")).thenReturn(List.of(panel1, panel2));
        when(panelService.calculateTotalCapacityKwp(anyList())).thenReturn(10.0);
        when(panelService.getDailyEnergyTotalsByDateRange(eq(panel1), anyString(), anyString()))
                .thenReturn(List.of(panel1Total));
        when(panelService.getDailyEnergyTotalsByDateRange(eq(panel2), anyString(), anyString()))
                .thenReturn(List.of(panel2Total));

        String forecastResponse = "[{\"datetime\":\"" + tomorrow + "T00:00:00\",\"power_kw\":4.0}]";
        when(restTemplate.exchange(eq("http://localhost:8000/forecast"), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok(forecastResponse));

        mockMvc.perform(get("/api/forecast/getTotal")
                        .header("Authorization", "Bearer token")
                        .param("panelId", "cluster-id")
                        .param("from", today.toString() + " 00:00:00")
                        .param("to", tomorrow.toString() + " 00:00:00")
                        .param("type", "cluster"))
                .andExpect(status().isOk())
                .andExpect(content().json("[{\"date\":\"" + today + "\",\"totalEnergy_kwh\":8.0},{\"date\":\"" + tomorrow + "\",\"totalEnergy_kwh\":1.0}]"));
    }
}

