package com.olehpetrov.backend.responses;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class ClusterResponse {
    private String name;
    private String id;

    public ClusterResponse(String name, String id) {
        this.name = name;
        this.id=id;
    }
}