package com.unitrack.unitrack_backend.dto.response;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MarksResponse {
    private Long id;
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