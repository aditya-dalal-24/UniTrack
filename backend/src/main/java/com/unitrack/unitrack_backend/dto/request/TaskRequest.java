package com.unitrack.unitrack_backend.dto.request;

import com.unitrack.unitrack_backend.entity.TaskStatus;
import com.unitrack.unitrack_backend.entity.TaskType;
import lombok.Data;
import java.time.LocalDate;

@Data
public class TaskRequest {
    private String title;
    private String description;
    private String subject;
    private LocalDate dueDate;
    private String dueTime;
    private TaskStatus status;
    private TaskType type;
}
