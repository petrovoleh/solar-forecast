package com.olehpetrov.backend;

import com.olehpetrov.backend.services.SampleDataInitializer;
import com.olehpetrov.backend.services.UserService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BackendApplication implements CommandLineRunner {

    private final UserService userService;
    private final SampleDataInitializer sampleDataInitializer;

    public BackendApplication(UserService userService, SampleDataInitializer sampleDataInitializer) {
        this.userService = userService;
        this.sampleDataInitializer = sampleDataInitializer;
    }

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

    @Override
    public void run(String... args) {
        userService.createAdminUserIfNotExists();
        sampleDataInitializer.createSampleUserWithData();
    }
}
