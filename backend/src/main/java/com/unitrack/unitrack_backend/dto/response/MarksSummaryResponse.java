package com.unitrack.unitrack_backend.dto.response;

import lombok.*;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MarksSummaryResponse {
    private Double cgpa;
    private Double currentSgpa;
    private Integer totalSubjects;
    private Integer currentSemester;
    private List<MarksResponse> marks;
}