package com.olehpetrov.backend.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.olehpetrov.backend.models.Cluster;
import com.olehpetrov.backend.models.Role;
import com.olehpetrov.backend.models.User;
import com.olehpetrov.backend.services.ClusterService;
import com.olehpetrov.backend.services.InverterService;
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
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ClusterController.class)
@AutoConfigureMockMvc(addFilters = false)
class ClusterControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ClusterService clusterService;

    @MockBean
    private InverterService inverterService;

    @MockBean
    private UserService userService;

    @MockBean
    private LocationService locationService;

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
    void addClusterReturnsOkForValidRequest() throws Exception {
        User user = buildUser();
        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);
        when(clusterService.addCluster(any(Cluster.class))).thenAnswer(invocation -> {
            Cluster cluster = invocation.getArgument(0);
            cluster.setId("cluster-id");
            return cluster;
        });

        Map<String, Object> request = Map.of(
                "name", "My Cluster",
                "description", "Description"
        );

        mockMvc.perform(post("/api/cluster/add")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer token")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void getClustersByUserReturnsUserClusters() throws Exception {
        User user = buildUser();
        Cluster cluster = new Cluster();
        cluster.setId("cluster-id");
        cluster.setUserId("user-id");
        cluster.setName("Cluster");

        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);
        when(clusterService.getClustersByUserId("user-id")).thenReturn(List.of(cluster));

        mockMvc.perform(get("/api/cluster/user")
                        .header("Authorization", "Bearer token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("cluster-id"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getAllClustersReturnsPagedResponse() throws Exception {
        Cluster cluster = new Cluster();
        cluster.setId("cluster-id");
        cluster.setName("Cluster");

        when(clusterService.findAll(PageRequest.of(0, 10)))
                .thenReturn(new PageImpl<>(List.of(cluster), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/cluster/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Cluster"));
    }

    @Test
    void getClusterByIdReturnsClusterForOwner() throws Exception {
        User user = buildUser();
        Cluster cluster = new Cluster();
        cluster.setId("cluster-id");
        cluster.setUserId("user-id");
        cluster.setName("Cluster");

        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);
        when(clusterService.getClusterById("cluster-id")).thenReturn(cluster);

        mockMvc.perform(get("/api/cluster/cluster-id")
                        .header("Authorization", "Bearer token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("cluster-id"));
    }

    @Test
    void getClusterByIdReturnsForbiddenForDifferentOwner() throws Exception {
        User user = buildUser();
        Cluster cluster = new Cluster();
        cluster.setId("cluster-id");
        cluster.setUserId("other-user");

        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);
        when(clusterService.getClusterById("cluster-id")).thenReturn(cluster);

        mockMvc.perform(get("/api/cluster/cluster-id")
                        .header("Authorization", "Bearer token"))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateClusterReturnsOkWhenUserOwnsCluster() throws Exception {
        User user = buildUser();
        Cluster cluster = new Cluster();
        cluster.setId("cluster-id");
        cluster.setUserId("user-id");

        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);
        when(clusterService.getClusterById("cluster-id")).thenReturn(cluster);
        when(clusterService.updateCluster(any(Cluster.class))).thenReturn(cluster);

        Map<String, Object> request = Map.of("name", "Updated");

        mockMvc.perform(put("/api/cluster/cluster-id")
                        .header("Authorization", "Bearer token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    void deleteClusterReturnsOkWhenUserOwnsCluster() throws Exception {
        User user = buildUser();
        Cluster cluster = new Cluster();
        cluster.setId("cluster-id");
        cluster.setUserId("user-id");

        when(jwtUtils.extractUsername("token")).thenReturn("user");
        when(userService.findByUsername("user")).thenReturn(user);
        when(clusterService.getClusterById("cluster-id")).thenReturn(cluster);

        mockMvc.perform(delete("/api/cluster/cluster-id")
                        .header("Authorization", "Bearer token"))
                .andExpect(status().isOk());
    }
}

