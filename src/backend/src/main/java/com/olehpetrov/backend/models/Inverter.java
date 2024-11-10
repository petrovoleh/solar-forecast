package com.olehpetrov.backend.models;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "cluster")
public class Inverter {
    @Id
    private String id;
    private String name;
    private Double efficiency;
}
