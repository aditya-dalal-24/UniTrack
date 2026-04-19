package com.unitrack.unitrack_backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SubjectRequest {

    @NotBlank(message = "Subject name is required")
    private String name;

    private String courseCode;
    private String professor;
    private String roomNumber;
    private String color;
    private Integer semester;
}