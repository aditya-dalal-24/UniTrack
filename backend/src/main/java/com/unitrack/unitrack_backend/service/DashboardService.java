package com.unitrack.unitrack_backend.service;

import com.unitrack.unitrack_backend.dto.response.DashboardResponse;
import com.unitrack.unitrack_backend.entity.*;
import com.unitrack.unitrack_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

        private final UserRepository userRepository;
        private final AttendanceRepository attendanceRepository;
        private final FeesRepository feesRepository;
        private final AssignmentRepository assignmentRepository;
        private final ExpenseRepository expenseRepository;
        private final MarksRepository marksRepository;
        private final TodoRepository todoRepository;
        private final SubjectRepository subjectRepository;
        private final TaskRepository taskRepository;

        private User getUser(Principal principal) {
                return userRepository.findByEmail(principal.getName())
                                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        }

        public DashboardResponse getDashboard(Principal principal) {
                User user = getUser(principal);

                // ── Attendance ──────────────────────────────────────────
                long present = attendanceRepository.countByUserAndStatus(user, AttendanceStatus.PRESENT);
                long absent = attendanceRepository.countByUserAndStatus(user, AttendanceStatus.ABSENT);
                long workingDays = present + absent;
                double attendancePct = workingDays > 0
                                ? Math.round((present * 100.0 / workingDays) * 100.0) / 100.0
                                : 0.0;

                // Last Month Attendance
                LocalDate lastMonthDate = LocalDate.now().minusMonths(1);
                LocalDate startOfLastMonth = lastMonthDate.withDayOfMonth(1);
                LocalDate endOfLastMonth = lastMonthDate.withDayOfMonth(lastMonthDate.lengthOfMonth());
                List<AttendanceRecord> lastMonthRecords = attendanceRepository
                                .findByUserAndDateBetweenOrderByDateAsc(user, startOfLastMonth, endOfLastMonth);
                long lmPresent = lastMonthRecords.stream().filter(r -> r.getStatus() == AttendanceStatus.PRESENT)
                                .count();
                long lmAbsent = lastMonthRecords.stream().filter(r -> r.getStatus() == AttendanceStatus.ABSENT).count();
                long lmWorking = lmPresent + lmAbsent;
                double lastMonthPct = lmWorking > 0 ? Math.round((lmPresent * 100.0 / lmWorking) * 100.0) / 100.0 : 0.0;

                List<Subject> allSubjects = subjectRepository.findByUser(user);
                List<DashboardResponse.SubjectSummary> subjectSummaries = new ArrayList<>();
                for (Subject sub : allSubjects) {
                        long p = attendanceRepository.countByUserAndStatusAndSubject(user, AttendanceStatus.PRESENT,
                                        sub);
                        long a = attendanceRepository.countByUserAndStatusAndSubject(user, AttendanceStatus.ABSENT,
                                        sub);
                        long t = p + a;
                        double pct = t > 0 ? Math.round((p * 100.0 / t) * 100.0) / 100.0 : 0.0;
                        subjectSummaries.add(DashboardResponse.SubjectSummary.builder()
                                        .name(sub.getName())
                                        .attendancePercentage(pct)
                                        .build());
                }

                // ── Fees ────────────────────────────────────────────────
                List<Fees> allFees = feesRepository.findByUser(user);
                double totalFees = allFees.stream()
                                .mapToDouble(f -> f.getTotalAmount() != null ? f.getTotalAmount() : 0.0).sum();
                double totalPaid = allFees.stream()
                                .mapToDouble(f -> f.getPaidAmount() != null ? f.getPaidAmount() : 0.0).sum();

                // ── Assignments ─────────────────────────────────────────
                List<Assignment> assignments = assignmentRepository.findByUserOrderByDueDateAsc(user);
                List<Task> taskAssignments = taskRepository.findByUserAndTypeOrderByDueDateAsc(user,
                                TaskType.ASSIGNMENT);

                long pending = assignments.stream()
                                .filter(a -> a.getStatus() == AssignmentStatus.PENDING).count()
                                + taskAssignments.stream().filter(t -> t.getStatus() == TaskStatus.PENDING).count();
                long submitted = assignments.stream()
                                .filter(a -> a.getStatus() == AssignmentStatus.SUBMITTED).count()
                                + taskAssignments.stream().filter(t -> t.getStatus() == TaskStatus.SUBMITTED).count();
                long overdue = assignments.stream()
                                .filter(a -> a.getStatus() == AssignmentStatus.OVERDUE).count()
                                + taskAssignments.stream().filter(t -> t.getStatus() == TaskStatus.OVERDUE).count();
                long totalAsgn = assignments.size() + taskAssignments.size();

                // ── Expenses ────────────────────────────────────────────
                LocalDate now = LocalDate.now();
                LocalDate startOfMonth = now.withDayOfMonth(1);
                LocalDate endOfMonth = now.withDayOfMonth(now.lengthOfMonth());

                List<Expense> monthExpenses = expenseRepository
                                .findByUserAndDateBetweenOrderByDateDescTimeDesc(user, startOfMonth, endOfMonth);
                List<Expense> allExpenses = expenseRepository.findByUserOrderByDateDescTimeDesc(user);

                double monthTotal = monthExpenses.stream().mapToDouble(Expense::getAmount).sum();
                double allTimeTotal = allExpenses.stream().mapToDouble(Expense::getAmount).sum();

                // Historical Expenses (Last 6 Months)
                List<DashboardResponse.ExpenseMonthlyRecord> history = new ArrayList<>();
                for (int i = 5; i >= 0; i--) {
                        YearMonth targetMonth = YearMonth.now().minusMonths(i);
                        LocalDate start = targetMonth.atDay(1);
                        LocalDate end = targetMonth.atEndOfMonth();
                        double subtotal = expenseRepository
                                        .findByUserAndDateBetweenOrderByDateDescTimeDesc(user, start, end)
                                        .stream().mapToDouble(Expense::getAmount).sum();
                        history.add(DashboardResponse.ExpenseMonthlyRecord.builder()
                                        .month(targetMonth.getMonth().name().substring(0, 3))
                                        .amount(subtotal)
                                        .build());
                }

                // ── Marks ───────────────────────────────────────────────
                List<Marks> allMarks = marksRepository.findByUser(user);
                List<Marks> validMarks = allMarks.stream()
                                .filter(m -> m.getGradePoints() != null && m.getCredits() != null)
                                .collect(Collectors.toList());

                double totalPoints = validMarks.stream()
                                .mapToDouble(m -> m.getGradePoints() * m.getCredits()).sum();
                double totalCredits = validMarks.stream()
                                .mapToDouble(Marks::getCredits).sum();
                double cgpa = totalCredits > 0
                                ? Math.round((totalPoints / totalCredits) * 100.0) / 100.0
                                : 0.0;

                int currentSemester = allMarks.stream()
                                .filter(m -> m.getSemester() != null)
                                .mapToInt(Marks::getSemester)
                                .max().orElse(0);

                List<Marks> currentSemMarks = allMarks.stream()
                                .filter(m -> m.getSemester() != null && m.getSemester() == currentSemester)
                                .filter(m -> m.getGradePoints() != null && m.getCredits() != null)
                                .collect(Collectors.toList());

                double semPoints = currentSemMarks.stream()
                                .mapToDouble(m -> m.getGradePoints() * m.getCredits()).sum();
                double semCredits = currentSemMarks.stream()
                                .mapToDouble(Marks::getCredits).sum();
                double sgpa = semCredits > 0
                                ? Math.round((semPoints / semCredits) * 100.0) / 100.0
                                : 0.0;

                // ── Todos ───────────────────────────────────────────────
                List<Todo> allTodos = todoRepository.findByUserOrderByDueDateAsc(user);
                List<Task> taskTodos = taskRepository.findByUserAndTypeOrderByDueDateAsc(user, TaskType.TODO);

                long completedTodos = allTodos.stream().filter(Todo::isCompleted).count()
                                + taskTodos.stream().filter(t -> t.getStatus() == TaskStatus.COMPLETED).count();
                long totalTodosCount = allTodos.size() + taskTodos.size();
                long pendingTodos = totalTodosCount - completedTodos;

                // ── Tasks (Unified) ─────────────────────────────────────
                long totalTasks = totalAsgn + totalTodosCount;
                long pendingTasks = pending + pendingTodos;
                long completedTasks = submitted + completedTodos; // Submitted asgn + completed todos

                // ── Build Response ──────────────────────────────────────
                return DashboardResponse.builder()
                                .attendance(DashboardResponse.AttendanceSummary.builder()
                                                .attendancePercentage(attendancePct)
                                                .lastMonthPercentage(lastMonthPct)
                                                .presentDays(present)
                                                .absentDays(absent)
                                                .totalWorkingDays(workingDays)
                                                .build())
                                .fees(DashboardResponse.FeesSummary.builder()
                                                .totalFees(Math.round(totalFees * 100.0) / 100.0)
                                                .totalPaid(Math.round(totalPaid * 100.0) / 100.0)
                                                .totalPending(Math.round((totalFees - totalPaid) * 100.0) / 100.0)
                                                .build())
                                .assignments(DashboardResponse.AssignmentsSummary.builder()
                                                .totalAssignments(totalAsgn)
                                                .pendingAssignments(pending)
                                                .submittedAssignments(submitted)
                                                .overdueAssignments(overdue)
                                                .build())
                                .expenses(DashboardResponse.ExpensesSummary.builder()
                                                .totalSpentThisMonth(Math.round(monthTotal * 100.0) / 100.0)
                                                .totalSpentAllTime(Math.round(allTimeTotal * 100.0) / 100.0)
                                                .currentMonth(now.getMonthValue())
                                                .currentYear(now.getYear())
                                                .monthlyHistory(history)
                                                .build())
                                .marks(DashboardResponse.MarksSummary.builder()
                                                .cgpa(cgpa)
                                                .currentSgpa(sgpa)
                                                .totalSubjects(allMarks.size())
                                                .currentSemester(currentSemester)
                                                .build())
                                .todos(DashboardResponse.TodosSummary.builder()
                                                .totalTodos(totalTodosCount)
                                                .pendingTodos(pendingTodos)
                                                .completedTodos(completedTodos)
                                                .build())
                                .tasks(DashboardResponse.TasksSummary.builder()
                                                .totalTasks(totalTasks)
                                                .pendingTasks(pendingTasks)
                                                .completedTasks(completedTasks)
                                                .build())
                                .subjects(subjectSummaries)
                                .build();
        }
}