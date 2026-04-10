package com.unitrack.unitrack_backend.dto.response;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DashboardResponse {
    private AttendanceSummary attendance;
    private FeesSummary fees;
    private AssignmentsSummary assignments;
    private ExpensesSummary expenses;
    private MarksSummary marks;
    private TodosSummary todos;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AttendanceSummary {
        private double attendancePercentage;
        private long presentDays;
        private long absentDays;
        private long totalWorkingDays;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class FeesSummary {
        private double totalFees;
        private double totalPaid;
        private double totalPending;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AssignmentsSummary {
        private long totalAssignments;
        private long pendingAssignments;
        private long submittedAssignments;
        private long overdueAssignments;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ExpensesSummary {
        private double totalSpentThisMonth;
        private double totalSpentAllTime;
        private int currentMonth;
        private int currentYear;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MarksSummary {
        private double cgpa;
        private double currentSgpa;
        private int totalSubjects;
        private int currentSemester;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TodosSummary {
        private long totalTodos;
        private long pendingTodos;
        private long completedTodos;
    }
}