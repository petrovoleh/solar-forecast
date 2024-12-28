package com.olehpetrov.backend.requests;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class LocationRequest {
    private double lat;
    private double lon;
    private String city;
    private String district;
    private String country;
}