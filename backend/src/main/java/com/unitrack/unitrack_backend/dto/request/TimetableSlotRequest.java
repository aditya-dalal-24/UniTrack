package com.unitrack.unitrack_backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TimetableSlotRequest {

    @NotBlank(message = "Day of week is required")
    private String dayOfWeek;

    @NotBlank(message = "Start time is required")
    private String startTime;

    @NotBlank(message = "End time is required")
    private String endTime;

    private String subjectName;
    private String courseCode;
    private String professor;
    private String roomNumber;
}