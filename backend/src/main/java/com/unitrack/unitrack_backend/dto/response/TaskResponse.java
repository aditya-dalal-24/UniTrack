package com.unitrack.unitrack_backend.dto.response;

import com.unitrack.unitrack_backend.entity.TaskStatus;
import com.unitrack.unitrack_backend.entity.TaskType;
import lombok.*;
import java.time.LocalDate;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TaskResponse {
    private Long id;
    private String title;
    private String description;
    private String subject;
    private LocalDate dueDate;
    private String dueTime;
    private TaskStatus status;
    private TaskType type;
}
