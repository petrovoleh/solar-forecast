package com.olehpetrov.backend.services;

import com.olehpetrov.backend.models.DailyEnergyTotal;
import com.olehpetrov.backend.models.SolarPanel;
import com.olehpetrov.backend.repositories.DailyEnergyTotalRepository;
import com.olehpetrov.backend.repositories.SolarPanelRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SolarPanelService {

    @Autowired
    private SolarPanelRepository solarPanelRepository;
    @Autowired
    private DailyEnergyTotalRepository dailyEnergyTotalRepository;

    // Add a new panel
    public SolarPanel addPanel(SolarPanel solarPanel) {
        return solarPanelRepository.save(solarPanel);
    }

    // Get panels by userId
    public List<SolarPanel> getPanelsByUserId(String userId) {
        return solarPanelRepository.findByUserId(userId);
    }

    // Get panel by panelId
    public SolarPanel getPanelById(String panelId) {
        return solarPanelRepository.findById(panelId).orElse(null);
    }
    // Delete a panel by ID
    public void deletePanel(String panelId) {
        solarPanelRepository.deleteById(panelId);
    }
    public DailyEnergyTotal getDailyEnergyTotalByDate(SolarPanel panel, String date) {
        // Logic to fetch the DailyEnergyTotal by panel and date
        return dailyEnergyTotalRepository.findByPanelAndDate(panel, date);
    }

    public void saveDailyEnergyTotal(DailyEnergyTotal dailyEnergyTotal) {
        // Logic to save the DailyEnergyTotal
        dailyEnergyTotalRepository.save(dailyEnergyTotal);
    }
    public List<DailyEnergyTotal> getDailyEnergyTotalsByDateRange(SolarPanel panel, String startDate, String endDate) {
        return dailyEnergyTotalRepository.findByPanelAndDateBetween(panel, startDate, endDate);
    }
}
