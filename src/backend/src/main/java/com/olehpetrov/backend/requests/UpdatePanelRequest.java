package com.olehpetrov.backend.requests;

import com.olehpetrov.backend.models.User;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;

@Getter
@Setter
public class UpdatePanelRequest {
    @Id
    private String id;
    @DBRef
    private User user;
    private int powerRating;
    private int efficiency;
    private String name;
    private int quantity;
    private LocationRequest location;
    private String clusterId;
}