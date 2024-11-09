package com.olehpetrov.backend.models;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "daily_energy_totals")
public class DailyEnergyTotal {

    @Id
    private String id;

    @DBRef
    private SolarPanel panel;  // Reference to the SolarPanel document

    private String date;       // Format: "YYYY-MM-DD"
    private double totalEnergy_kwh;
}
