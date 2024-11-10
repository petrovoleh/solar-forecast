package com.olehpetrov.backend.models;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "cluster")
public class Cluster {
    @Id
    private String id;
    private String name;
    private String inverter;
    private Double inverterCOP;
    private String description;
    @DBRef
    private Location location;
}
