package com.unitrack.unitrack_backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class TodoRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;
    private LocalDate dueDate;
    private LocalTime dueTime;
    private boolean completed;
}