package com.unitrack.unitrack_backend.dto.request;

import com.unitrack.unitrack_backend.entity.AttendanceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
public class AttendanceRequest {

    @NotNull(message = "Date is required")
    private LocalDate date;

    @NotNull(message = "Status is required")
    private AttendanceStatus status;

    private Long subjectId;

    private Long timetableSlotId;

    private String note;
}