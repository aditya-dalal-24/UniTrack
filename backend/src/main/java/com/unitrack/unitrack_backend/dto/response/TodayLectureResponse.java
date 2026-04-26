package com.unitrack.unitrack_backend.dto.response;

import com.unitrack.unitrack_backend.entity.AttendanceStatus;
import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TodayLectureResponse {
    private Long slotId;
    private String subjectName;
    private String subjectFullName;
    private String startTime;
    private String endTime;
    private String professor;
    private String roomNumber;
    private String groupInfo;
    private Long subjectId;

    // Attendance info (null if not yet marked)
    private Long attendanceRecordId;
    private AttendanceStatus status;
}
