package com.olehpetrov.backend.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class LocationRequest {
    @NotNull
    private Double lat;

    @NotNull
    private Double lon;

    @NotBlank
    private String city;

    @NotBlank
    private String district;

    @NotBlank
    private String country;
}