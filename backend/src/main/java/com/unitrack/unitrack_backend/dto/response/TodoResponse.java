package com.unitrack.unitrack_backend.dto.response;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TodoResponse {
    private Long id;
    private String title;
    private String description;
    private LocalDate dueDate;
    private LocalTime dueTime;
    private boolean completed;
}