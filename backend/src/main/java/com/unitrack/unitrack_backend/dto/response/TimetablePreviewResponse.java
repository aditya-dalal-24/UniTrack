package com.unitrack.unitrack_backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimetablePreviewResponse {
    private List<PreviewSlot> slots;
    private List<String> detectedDays;
    private List<String> detectedTimes;
    private List<String> availableGroups;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PreviewSlot {
        private String dayOfWeek;
        private String startTime;
        private String endTime;
        private String subjectName;
        private String subjectFullName;
        private String courseCode;
        private String professor;
        private String roomNumber;
        private String color;
        private String groupInfo;
        private Boolean isBreak = false;
    }
}
