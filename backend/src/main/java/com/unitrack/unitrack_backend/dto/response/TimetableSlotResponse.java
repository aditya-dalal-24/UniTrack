package com.unitrack.unitrack_backend.dto.response;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TimetableSlotResponse {
    private Long id;
    private String dayOfWeek;
    private String startTime;
    private String endTime;
    private String subjectName;
    private String subjectFullName;
    private String courseCode;
    private String professor;
    private String roomNumber;
    private String groupInfo;
    private Long subjectId;
    private Boolean isBreak = false;
    private Integer semester;
}