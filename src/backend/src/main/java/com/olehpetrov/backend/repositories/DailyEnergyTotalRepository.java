package com.olehpetrov.backend.repositories;

import com.olehpetrov.backend.models.DailyEnergyTotal;
import com.olehpetrov.backend.models.Panel;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface DailyEnergyTotalRepository extends MongoRepository<DailyEnergyTotal, String> {
    DailyEnergyTotal findByPanelAndDate(Panel panel, String date);
    List<DailyEnergyTotal> findByPanelAndDateBetween(Panel panel, String startDate, String endDate);

}
