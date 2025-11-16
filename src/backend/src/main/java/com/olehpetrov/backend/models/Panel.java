package com.olehpetrov.backend.models;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;


@Data
@Document(collection = "panels")
public class Panel {

    @Id
    private String id;
    private String userId;
    private int powerRating;
    private int efficiency;
    private String name;
    private int quantity;
    @DBRef
    private Location location;
    @DBRef
    private Cluster cluster;
}
