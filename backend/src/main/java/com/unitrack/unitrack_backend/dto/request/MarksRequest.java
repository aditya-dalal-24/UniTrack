package com.unitrack.unitrack_backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MarksRequest {

    @NotBlank(message = "Subject name is required")
    private String subjectName;

    private String subjectCode;
    private Integer semester;
    private Integer credits;
    private Double midSem;
    private Double internals;
    private Double endSem;
    private Double finalScore;
    private String grade;
    private Double gradePoints;
}