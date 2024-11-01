package com.olehpetrov.backend.services;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.util.UriComponentsBuilder;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class WeatherService {

    private static final String API_KEY = "1cae7fa6c5cd96a987b5f12a69379432";
    private static final String BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

    private final RestTemplate restTemplate;

    public WeatherService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String getWeatherForCity(String city) {
        String url = UriComponentsBuilder.fromHttpUrl(BASE_URL)
                .queryParam("q", city)
                .queryParam("appid", API_KEY)
                .queryParam("units", "metric")
                .build()
                .toUriString();

        try {
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                // Parse the response body to extract desired weather information
                return parseWeatherResponse(response.getBody());
            } else {
                return "Failed to retrieve weather data. Status code: " + response.getStatusCode();
            }
        } catch (Exception e) {
            return "An error occurred while fetching the weather data: " + e.getMessage();
        }
    }

    private String parseWeatherResponse(String responseBody) throws Exception {
        // Parse the JSON response
        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode root = objectMapper.readTree(responseBody);

        // Extract weather details
        String cityName = root.path("name").asText();
        double temperature = root.path("main").path("temp").asDouble();
        String weatherDescription = root.path("weather").get(0).path("description").asText();

        return String.format("Weather in %s: %s, Temperature: %.2f°C", cityName, weatherDescription, temperature);
    }
}
