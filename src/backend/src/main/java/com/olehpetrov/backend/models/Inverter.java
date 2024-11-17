package com.olehpetrov.backend.models;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "inverter")
public class Inverter {
    @Id
    private String id;
    private String name;
    private String manufacturer;
    private Double efficiency;
    private Double capacity;
}
