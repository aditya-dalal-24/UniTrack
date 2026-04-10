package com.unitrack.unitrack_backend.dto.request;

import com.unitrack.unitrack_backend.entity.AssignmentStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDate;

@Data
public class AssignmentRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String subject;
    private LocalDate dueDate;
    private AssignmentStatus status;
}