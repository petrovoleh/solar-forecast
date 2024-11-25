package com.olehpetrov.backend.responses;

public class ClusterResponse {
    private String name;
    private String id;


    public ClusterResponse(String name, String id) {
        this.name = name;
        this.id=id;
    }

    // Getters and Setters
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

}