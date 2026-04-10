package com.unitrack.unitrack_backend.dto.response;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SubjectResponse {
    private Long id;
    private String name;
    private String courseCode;
    private String professor;
}