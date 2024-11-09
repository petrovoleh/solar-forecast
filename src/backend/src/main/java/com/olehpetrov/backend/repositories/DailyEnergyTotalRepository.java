package com.olehpetrov.backend.repositories;

import com.olehpetrov.backend.models.DailyEnergyTotal;
import com.olehpetrov.backend.models.SolarPanel;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface DailyEnergyTotalRepository extends MongoRepository<DailyEnergyTotal, String> {
    DailyEnergyTotal findByPanelAndDate(SolarPanel panel, String date);
    List<DailyEnergyTotal> findByPanelAndDateBetween(SolarPanel panel, String startDate, String endDate);

}
