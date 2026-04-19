package com.unitrack.unitrack_backend.dto.response;

import lombok.*;
import java.util.List;

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
    private TasksSummary tasks;
    private List<SubjectSummary> subjects;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AttendanceSummary {
        private double attendancePercentage;
        private double lastMonthPercentage;
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
        private List<ExpenseMonthlyRecord> monthlyHistory;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ExpenseMonthlyRecord {
        private String month;
        private double amount;
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
    public static class TasksSummary {
        private long totalTasks;
        private long pendingTasks;
        private long completedTasks;
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

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class SubjectSummary {
        private String name;
        private double attendancePercentage;
    }
}