import { useMemo } from "react";

/**
 * useInsightsEngine
 *
 * Transforms raw dashboardData + todayLectures into actionable insights.
 * Pure computation — no API calls, fully memoized.
 *
 * @param {object} dashboardData  — from useData().dashboardData
 * @param {array}  todayLectures  — from api.getTodayLectures()
 * @param {array}  tomorrowLectures — timetable slots for tomorrow
 * @param {number} minAttendanceCap — from localStorage (default 75)
 */
export function useInsightsEngine(dashboardData, todayLectures = [], tomorrowLectures = [], minAttendanceCap = 75) {
  return useMemo(() => {
    if (!dashboardData) {
      return {
        today: null,
        attendanceRisk: null,
        tasks: null,
        pressure: null,
        reminders: [],
        expenses: null,
        semesterHealth: null,
      };
    }

    // ── TODAY ──────────────────────────────────────────
    const now = new Date();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

    const parseTime = (timeStr) => {
      if (!timeStr) return 0;
      // Handle "09:00", "9:00 AM", "14:30" etc
      const cleaned = timeStr.trim().toUpperCase();
      let hours, minutes;
      if (cleaned.includes("AM") || cleaned.includes("PM")) {
        const parts = cleaned.replace(/[AP]M/, "").trim().split(":");
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1] || "0", 10);
        if (cleaned.includes("PM") && hours !== 12) hours += 12;
        if (cleaned.includes("AM") && hours === 12) hours = 0;
      } else {
        const parts = cleaned.split(":");
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1] || "0", 10);
      }
      return hours * 60 + minutes;
    };

    // Find next lecture (first one whose start time hasn't passed)
    const lecturesWithTime = todayLectures.map((l) => ({
      ...l,
      startMinutes: parseTime(l.startTime),
      endMinutes: parseTime(l.endTime),
    }));

    const nextLecture = lecturesWithTime.find(
      (l) => l.startMinutes > currentTimeMinutes
    );

    const currentLecture = lecturesWithTime.find(
      (l) => l.startMinutes <= currentTimeMinutes && l.endMinutes > currentTimeMinutes
    );

    const unmarkedLectures = todayLectures.filter((l) => !l.status);
    const completedLectures = todayLectures.filter((l) => l.status);
    const remainingLectures = lecturesWithTime.filter(
      (l) => l.startMinutes > currentTimeMinutes || (!l.status && l.endMinutes > currentTimeMinutes)
    );

    // Minutes until next lecture
    const minutesUntilNext = nextLecture
      ? nextLecture.startMinutes - currentTimeMinutes
      : null;

    // Tomorrow's first lecture
    const tomorrowFirst = tomorrowLectures.length > 0 ? tomorrowLectures[0] : null;

    const today = {
      totalLectures: todayLectures.length,
      completedCount: completedLectures.length,
      unmarkedCount: unmarkedLectures.length,
      remainingCount: remainingLectures.length,
      nextLecture,
      currentLecture,
      minutesUntilNext,
      tomorrowFirst,
      lectures: todayLectures,
    };

    // ── ATTENDANCE RISK ──────────────────────────────
    const cap = minAttendanceCap / 100;
    const subjects = dashboardData.subjects || [];
    const attendance = dashboardData.attendance || {};

    const subjectRisks = subjects.map((s) => {
      const pct = s.attendancePercentage || 0;
      const isAtRisk = pct < minAttendanceCap;
      const isCritical = pct < minAttendanceCap - 10;

      // Safe skip calculation
      // If you have P present out of T total, you can skip S more:
      // (P) / (T + S) >= cap  =>  S <= P/cap - T
      const totalLecturesForSubject = attendance.totalWorkingDays > 0
        ? Math.round((attendance.totalWorkingDays * pct) / (pct > 0 ? 100 : 1))
        : 0;
      // Approximate: use overall ratio scaled per-subject
      // Better: use the raw present/total from percentage
      // present = pct * total / 100,  so total = present * 100 / pct
      // safeSkips = floor(present / cap - total)
      let safeSkips = 0;
      if (pct > 0 && pct >= minAttendanceCap) {
        // Estimate: with N subjects and overall data, we approximate
        // present ≈ (pct/100) * estimatedTotal
        // We'll use a rough heuristic since we don't have per-subject totals
        const totalDays = attendance.totalWorkingDays || 0;
        const subjectCount = subjects.length || 1;
        const estimatedSubjectTotal = Math.round(totalDays / subjectCount);
        const estimatedPresent = Math.round((pct / 100) * estimatedSubjectTotal);
        safeSkips = Math.max(0, Math.floor(estimatedPresent / cap - estimatedSubjectTotal));
      }

      return {
        name: s.name,
        percentage: pct,
        isAtRisk,
        isCritical,
        safeSkips,
        status: isCritical ? "critical" : isAtRisk ? "warning" : "safe",
      };
    });

    const atRiskSubjects = subjectRisks.filter((s) => s.isAtRisk);
    const allSafe = atRiskSubjects.length === 0;

    const attendanceRisk = {
      subjects: subjectRisks,
      atRiskCount: atRiskSubjects.length,
      atRiskSubjects,
      allSafe,
      overallPercentage: attendance.attendancePercentage || 0,
      predictedEndOfMonth: attendance.attendancePercentage || 0, // Simplified linear prediction
    };

    // ── TASKS ──────────────────────────────────────────
    const assignments = dashboardData.assignments || {};
    const todos = dashboardData.todos || {};
    const tasksData = dashboardData.tasks || {};

    const taskInsights = {
      overdueCount: assignments.overdueAssignments || 0,
      pendingCount: tasksData.pendingTasks || 0,
      completedCount: tasksData.completedTasks || 0,
      totalCount: tasksData.totalTasks || 0,
      pendingAssignments: assignments.pendingAssignments || 0,
      pendingTodos: todos.pendingTodos || 0,
      hasOverdue: (assignments.overdueAssignments || 0) > 0,
      allCaughtUp: (tasksData.pendingTasks || 0) === 0,
    };

    // ── ACADEMIC PRESSURE ──────────────────────────────
    // Weighted score: attendance(40%) + tasks(30%) + marks(10%) + workload(20%)
    const marks = dashboardData.marks || {};

    // Attendance pressure: 0 = great (100%), 100 = terrible (0%)
    const attendancePressure = Math.max(0, Math.min(100,
      100 - (attendance.attendancePercentage || 0)
    ));

    // Task pressure: ratio of pending to total, weighted by overdue
    const taskRatio = tasksData.totalTasks > 0
      ? (tasksData.pendingTasks / tasksData.totalTasks) * 100
      : 0;
    const overdueBoost = Math.min(50, (assignments.overdueAssignments || 0) * 15);
    const taskPressure = Math.min(100, taskRatio + overdueBoost);

    // Marks pressure: inverse of CGPA (10 scale)
    const marksPressure = marks.cgpa > 0
      ? Math.max(0, (10 - marks.cgpa) * 10)
      : 50; // neutral if no data

    // Workload pressure: based on number of subjects + pending tasks
    const workloadPressure = Math.min(100,
      (subjects.length * 5) + (tasksData.pendingTasks || 0) * 8
    );

    const overallPressure = Math.round(
      attendancePressure * 0.4 +
      taskPressure * 0.3 +
      marksPressure * 0.1 +
      workloadPressure * 0.2
    );

    const pressureLevel =
      overallPressure <= 25 ? "low" :
      overallPressure <= 50 ? "medium" :
      overallPressure <= 75 ? "high" :
      "critical";

    const pressureReasons = [];
    if (attendancePressure > 60) pressureReasons.push("Attendance below targets");
    if (taskPressure > 60) pressureReasons.push("High task/assignment backlog");
    if (marksPressure > 60) pressureReasons.push("Grades need improvement");
    if (workloadPressure > 70) pressureReasons.push("Heavy daily workload");
    if (pressureReasons.length === 0 && overallPressure > 40) pressureReasons.push("General academic demands");

    const pressure = {
      overall: overallPressure,
      level: pressureLevel,
      reasons: pressureReasons,
      breakdown: {
        attendance: `${Math.round(attendance.attendancePercentage || 0)}%`,
        tasks: taskInsights.pendingCount,
        marks: Math.round(marksPressure),
        workload: Math.round(workloadPressure),
      },
    };

    // ── SMART REMINDERS ──────────────────────────────
    const reminders = [];

    // Attendance reminders
    if (unmarkedLectures.length > 0 && todayLectures.length > 0) {
      reminders.push({
        id: "unmarked-attendance",
        text: `${unmarkedLectures.length} lecture${unmarkedLectures.length > 1 ? "s" : ""} unmarked today`,
        urgency: "medium",
        icon: "calendar",
        type: "attendance",
      });
    }

    atRiskSubjects.forEach((s) => {
      // Calculate how many more consecutive classes needed to reach cap
      if (s.percentage > 0 && attendance.totalWorkingDays > 0) {
        const totalDays = attendance.totalWorkingDays || 0;
        const subjectCount = subjects.length || 1;
        const estimatedSubjectTotal = Math.round(totalDays / subjectCount);
        const estimatedPresent = Math.round((s.percentage / 100) * estimatedSubjectTotal);
        
        const target = minAttendanceCap / 100;
        if (target < 1) {
          const x = (target * estimatedSubjectTotal - estimatedPresent) / (1 - target);
          const classesNeeded = Math.ceil(Math.max(1, x));
          if (classesNeeded > 0) {
            reminders.push({
              id: `risk-${s.name}`,
              text: `${s.name}: Attend ${classesNeeded} more class${classesNeeded > 1 ? 'es' : ''} to reach ${minAttendanceCap}%`,
              urgency: s.isCritical ? "critical" : "high",
              icon: "alert",
              type: "attendance",
            });
          }
        }
      }
    });

    // Task & Assignment reminders
    if (taskInsights.hasOverdue) {
      reminders.push({
        id: "overdue-tasks",
        text: `${taskInsights.overdueCount} overdue task${taskInsights.overdueCount > 1 ? "s" : ""} need attention`,
        urgency: "critical",
        icon: "task",
        type: "task",
      });
    }
    
    if (taskInsights.pendingAssignments > 0) {
      reminders.push({
        id: "pending-assignments",
        text: `You have ${taskInsights.pendingAssignments} pending assignment${taskInsights.pendingAssignments > 1 ? "s" : ""}`,
        urgency: "high",
        icon: "task",
        type: "task",
      });
    }

    if (taskInsights.pendingTodos > 0) {
      reminders.push({
        id: "pending-todos",
        text: `You have ${taskInsights.pendingTodos} pending to-do${taskInsights.pendingTodos > 1 ? "s" : ""}`,
        urgency: "medium",
        icon: "task",
        type: "task",
      });
    }

    // Expense reminders
    const expenses = dashboardData.expenses || {};
    const monthlySpent = expenses.totalSpentThisMonth || 0;
    if (monthlySpent > 10000) {
      reminders.push({
        id: "high-spending",
        text: `₹${monthlySpent.toLocaleString()} spent this month`,
        urgency: "medium",
        icon: "expense",
        type: "expense",
      });
    }

    // Sort by urgency
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    reminders.sort((a, b) => (urgencyOrder[a.urgency] || 3) - (urgencyOrder[b.urgency] || 3));

    // ── EXPENSES ──────────────────────────────────────
    const expenseInsights = {
      todaySpent: 0, // Not directly available without separate API call
      monthlySpent: expenses.totalSpentThisMonth || 0,
      allTimeSpent: expenses.totalSpentAllTime || 0,
      monthlyHistory: expenses.monthlyHistory || [],
      lastMonthSpent: (expenses.monthlyHistory && expenses.monthlyHistory.length >= 2)
        ? expenses.monthlyHistory[expenses.monthlyHistory.length - 2]?.amount || 0
        : 0,
      trend: 0,
    };
    // Calculate trend
    if (expenseInsights.lastMonthSpent > 0) {
      expenseInsights.trend = Math.round(
        ((expenseInsights.monthlySpent - expenseInsights.lastMonthSpent) /
          expenseInsights.lastMonthSpent) * 100
      );
    }

    // ── SEMESTER HEALTH ──────────────────────────────
    const semesterHealth = {
      attendanceHealth: attendance.attendancePercentage || 0,
      sgpa: marks.currentSgpa || 0,
      cgpa: marks.cgpa || 0,
      pendingWork: tasksData.pendingTasks || 0,
      totalSubjects: subjects.length,
      attendanceStatus:
        (attendance.attendancePercentage || 0) >= minAttendanceCap ? "good" :
        (attendance.attendancePercentage || 0) >= minAttendanceCap - 10 ? "warning" :
        "critical",
      sgpaStatus:
        (marks.currentSgpa || 0) >= 8 ? "good" :
        (marks.currentSgpa || 0) >= 6 ? "warning" :
        "critical",
    };

    return {
      today,
      attendanceRisk,
      tasks: taskInsights,
      pressure,
      reminders,
      expenses: expenseInsights,
      semesterHealth,
    };
  }, [dashboardData, todayLectures, tomorrowLectures, minAttendanceCap]);
}
