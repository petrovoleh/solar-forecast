package com.olehpetrov.backend.models;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "location")
public class Location {

    @Id
    private String id;
    private double lat;
    private double lon;
    private String city;
    private String district;
    private String country;

}
