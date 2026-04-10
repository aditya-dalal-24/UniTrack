package com.unitrack.unitrack_backend.dto.response;

import com.unitrack.unitrack_backend.entity.AssignmentStatus;
import lombok.*;
import java.time.LocalDate;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AssignmentResponse {
    private Long id;
    private String title;
    private String subject;
    private LocalDate dueDate;
    private AssignmentStatus status;
}