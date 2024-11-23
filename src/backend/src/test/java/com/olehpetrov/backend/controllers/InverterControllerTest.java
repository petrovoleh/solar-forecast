package com.olehpetrov.backend.controllers;

import com.olehpetrov.backend.models.Inverter;
import com.olehpetrov.backend.models.User;
import com.olehpetrov.backend.services.InverterService;
import com.olehpetrov.backend.services.UserService;
import com.olehpetrov.backend.utils.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InverterControllerTest {

    @InjectMocks
    private InverterController inverterController;

    @Mock
    private InverterService inverterService;

    @Mock
    private UserService userService;

    @Mock
    private JwtUtils jwtUtils;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void getInverterById_Success() {
        // Arrange
        String inverterId = "123";
        Inverter mockInverter = new Inverter();
        mockInverter.setId(inverterId);
        when(inverterService.getInverterById(inverterId)).thenReturn(mockInverter);

        // Act
        ResponseEntity<Inverter> response = inverterController.getInverterById(inverterId);

        // Assert
        assertEquals(200, response.getStatusCodeValue());
        assertNotNull(response.getBody());
        assertEquals(inverterId, response.getBody().getId());
        verify(inverterService, times(1)).getInverterById(inverterId);
    }

    @Test
    void getInverterById_NotFound() {
        // Arrange
        String inverterId = "123";
        when(inverterService.getInverterById(inverterId)).thenReturn(null);

        // Act
        ResponseEntity<Inverter> response = inverterController.getInverterById(inverterId);

        // Assert
        assertEquals(404, response.getStatusCodeValue());
        assertNull(response.getBody());
        verify(inverterService, times(1)).getInverterById(inverterId);
    }

    @Test
    void getAllInverters_Success() {
        // Arrange
        List<Inverter> mockInverters = new ArrayList<>();
        mockInverters.add(new Inverter());
        when(inverterService.getAllInverters()).thenReturn(mockInverters);

        // Act
        ResponseEntity<List<Inverter>> response = inverterController.getAllInverters();

        // Assert
        assertEquals(200, response.getStatusCodeValue());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
        verify(inverterService, times(1)).getAllInverters();
    }

    @Test
    void addInverter_Success() {
        // Arrange
        String token = "Bearer valid.jwt.token";
        String username = "testuser";
        User mockUser = new User();
        mockUser.setUsername(username);
        Inverter mockInverter = new Inverter();

        when(jwtUtils.extractUsername("valid.jwt.token")).thenReturn(username);
        when(userService.findByUsername(username)).thenReturn(mockUser);
        doNothing().when(inverterService).addInverter(mockInverter);

        // Act
        ResponseEntity<String> response = inverterController.addInverter(token, mockInverter);

        // Assert
        assertEquals(200, response.getStatusCodeValue());
        assertEquals("Inverter added successfully.", response.getBody());
        verify(jwtUtils, times(1)).extractUsername("valid.jwt.token");
        verify(userService, times(1)).findByUsername(username);
        verify(inverterService, times(1)).addInverter(mockInverter);
    }

    @Test
    void addInverter_UserNotFound() {
        // Arrange
        String token = "Bearer valid.jwt.token";
        String username = "testuser";
        Inverter mockInverter = new Inverter();

        when(jwtUtils.extractUsername("valid.jwt.token")).thenReturn(username);
        when(userService.findByUsername(username)).thenReturn(null);

        // Act
        ResponseEntity<String> response = inverterController.addInverter(token, mockInverter);

        // Assert
        assertEquals(400, response.getStatusCodeValue());
        assertEquals("User not found.", response.getBody());
        verify(jwtUtils, times(1)).extractUsername("valid.jwt.token");
        verify(userService, times(1)).findByUsername(username);
        verify(inverterService, never()).addInverter(any());
    }
    @Test
    void addInverter_InvalidToken() {
        // Arrange
        String token = "Bearer invalid.token";
        Inverter mockInverter = new Inverter();

        when(jwtUtils.extractUsername(anyString())).thenThrow(new RuntimeException("Invalid token"));

        // Act
        ResponseEntity<String> response = inverterController.addInverter(token, mockInverter);

        // Assert
        assertEquals(400, response.getStatusCodeValue());
        verify(jwtUtils, times(1)).extractUsername(anyString());
        verify(inverterService, never()).addInverter(any());
    }
    @Test
    void addInverter_MissingToken() {
        // Arrange
        String token = ""; // Empty token
        Inverter mockInverter = new Inverter();

        // Act
        ResponseEntity<String> response = inverterController.addInverter(token, mockInverter);

        // Assert
        assertEquals(400, response.getStatusCodeValue());
        verify(jwtUtils, never()).extractUsername(anyString());
        verify(inverterService, never()).addInverter(any());
    }
    @Test
    void addInverter_NullUserFromToken() {
        // Arrange
        String token = "Bearer valid.jwt.token";
        String username = "nonexistentuser";
        Inverter mockInverter = new Inverter();

        when(jwtUtils.extractUsername("valid.jwt.token")).thenReturn(username);
        when(userService.findByUsername(username)).thenReturn(null);

        // Act
        ResponseEntity<String> response = inverterController.addInverter(token, mockInverter);

        // Assert
        assertEquals(400, response.getStatusCodeValue());
        assertEquals("User not found.", response.getBody());
        verify(jwtUtils, times(1)).extractUsername("valid.jwt.token");
        verify(userService, times(1)).findByUsername(username);
        verify(inverterService, never()).addInverter(any());
    }
    @Test
    void getAllInverters_NoInvertersAvailable() {
        // Arrange
        when(inverterService.getAllInverters()).thenReturn(new ArrayList<>());

        // Act
        ResponseEntity<List<Inverter>> response = inverterController.getAllInverters();

        // Assert
        assertEquals(200, response.getStatusCodeValue());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isEmpty());
        verify(inverterService, times(1)).getAllInverters();
    }
    @Test
    void getInverterById_NullOrEmptyId() {
        // Act
        ResponseEntity<Inverter> response = inverterController.getInverterById("");

        // Assert
        assertEquals(400, response.getStatusCodeValue());
        assertNull(response.getBody());
        verify(inverterService, never()).getInverterById(anyString());
    }
    @Test
    void addInverter_LogsSuccess() {
        // Arrange
        String token = "Bearer valid.jwt.token";
        String username = "testuser";
        User mockUser = new User();
        mockUser.setUsername(username);
        Inverter mockInverter = new Inverter();

        when(jwtUtils.extractUsername("valid.jwt.token")).thenReturn(username);
        when(userService.findByUsername(username)).thenReturn(mockUser);
        doNothing().when(inverterService).addInverter(mockInverter);

        // Act
        ResponseEntity<String> response = inverterController.addInverter(token, mockInverter);

        // Assert
        assertEquals(200, response.getStatusCodeValue());
        verify(jwtUtils, times(1)).extractUsername("valid.jwt.token");
        verify(inverterService, times(1)).addInverter(mockInverter);
        verify(userService, times(1)).findByUsername(username);
        // Logging would typically be tested using frameworks like LogCaptor or Slf4jTest.
    }
    @Test
    void getAllInverters_LargeDataSet() {
        // Arrange
        List<Inverter> mockInverters = new ArrayList<>();
        for (int i = 0; i < 1000; i++) {
            Inverter inverter = new Inverter();
            inverter.setId(String.valueOf(i));
            mockInverters.add(inverter);
        }
        when(inverterService.getAllInverters()).thenReturn(mockInverters);

        // Act
        ResponseEntity<List<Inverter>> response = inverterController.getAllInverters();

        // Assert
        assertEquals(200, response.getStatusCodeValue());
        assertNotNull(response.getBody());
        assertEquals(1000, response.getBody().size());
        verify(inverterService, times(1)).getAllInverters();
    }
    @Test
    void addInverter_WithoutAuthorizationHeader() {
        // Arrange
        Inverter mockInverter = new Inverter();

        // Act
        ResponseEntity<String> response = inverterController.addInverter(null, mockInverter);

        // Assert
        assertEquals(400, response.getStatusCodeValue());
        assertEquals("Token is missing.", response.getBody()); // Assuming logic handles missing tokens gracefully
        verify(jwtUtils, never()).extractUsername(anyString());
        verify(inverterService, never()).addInverter(any());
    }

}
