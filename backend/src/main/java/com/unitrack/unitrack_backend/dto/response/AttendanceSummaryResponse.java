package com.unitrack.unitrack_backend.dto.response;

import lombok.*;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AttendanceSummaryResponse {
    private long totalWorkingDays;
    private long presentDays;
    private long absentDays;
    private double attendancePercentage;
    private List<AttendanceResponse> records;
}