package com.unitrack.unitrack_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class UnitrackBackendApplication {
	public static void main(String[] args) {
		SpringApplication.run(UnitrackBackendApplication.class, args);
	}
}