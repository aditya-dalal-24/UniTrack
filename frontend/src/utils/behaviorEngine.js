/**
 * behaviorEngine.js
 *
 * Unified client-side intelligence engine for UniTrack.
 * Generalizes the frequency + recency + context scoring pattern from
 * expenseSuggestions.js to work across ALL modules.
 *
 * Zero backend dependencies. Persists to localStorage.
 *
 * Capabilities:
 * - Record user actions with timestamped context
 * - Frequency / recency / temporal scoring
 * - Smart defaults for forms
 * - Contextual quick-action suggestions
 * - Streak detection for recurring patterns
 */

const STORAGE_KEY = "unitrack_behavior_engine";
const MAX_EVENTS = 500; // Cap stored events to keep localStorage lean
const DECAY_DAYS = 14; // Recency half-life in days

// ==================== PERSISTENCE ====================

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migration guard: if schema version is outdated, reset
      if (parsed._v !== 2) return createEmptyStore();
      return parsed;
    }
  } catch (_) {}
  return createEmptyStore();
}

function createEmptyStore() {
  return { _v: 2, events: [], streaks: {}, quickActionOverrides: {} };
}

function saveStore(store) {
  try {
    // Trim events to MAX_EVENTS (keep most recent)
    if (store.events.length > MAX_EVENTS) {
      store.events = store.events.slice(-MAX_EVENTS);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (_) {
    // localStorage full — silently ignore
  }
}

// ==================== CORE: RECORD ACTIONS ====================

/**
 * Record a user action with context.
 *
 * @param {string} module - Module name: "attendance", "expense", "task", "marks", "fees"
 * @param {string} action - Action name: "mark_present", "mark_absent", "add_expense", "add_task", etc.
 * @param {Object} context - Contextual data: { day, subject, category, amount, ... }
 */
export function recordAction(module, action, context = {}) {
  const store = loadStore();
  const now = new Date();

  store.events.push({
    m: module,
    a: action,
    c: context,
    t: now.toISOString(),
    h: now.getHours(),
    dow: now.getDay(), // 0=Sun, 1=Mon, ...
  });

  // Update streak tracking
  const streakKey = `${module}:${action}`;
  if (!store.streaks[streakKey]) {
    store.streaks[streakKey] = { count: 0, lastDate: null, contexts: [] };
  }
  const streak = store.streaks[streakKey];
  const todayStr = now.toISOString().split("T")[0];

  if (streak.lastDate !== todayStr) {
    // Check if this is consecutive (within 1 day gap allowing weekends)
    if (streak.lastDate) {
      const lastDate = new Date(streak.lastDate);
      const diffDays = Math.round((now - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays <= 3) {
        // Allow up to 3-day gap (weekend + holiday)
        streak.count += 1;
      } else {
        streak.count = 1; // Reset streak
      }
    } else {
      streak.count = 1;
    }
    streak.lastDate = todayStr;

    // Store recent context patterns (keep last 10)
    if (Object.keys(context).length > 0) {
      streak.contexts.push(context);
      if (streak.contexts.length > 10) {
        streak.contexts = streak.contexts.slice(-10);
      }
    }
  }

  saveStore(store);
}

// ==================== SCORING HELPERS ====================

function daysSince(isoStr) {
  if (!isoStr) return 365;
  const then = new Date(isoStr);
  if (isNaN(then.getTime())) return 365;
  return Math.max(0, (Date.now() - then.getTime()) / (1000 * 60 * 60 * 24));
}

function recencyScore(isoStr) {
  return 1 / (1 + daysSince(isoStr) / (DECAY_DAYS / 2));
}

// ==================== PREDICTIONS ====================

/**
 * Get the most likely next actions for a module based on behavior history.
 *
 * @param {string} module - Module to predict for
 * @param {Object} currentContext - Current context (time of day, day of week, etc.)
 * @returns {{ action: string, confidence: number, context: Object }[]}
 */
export function predictActions(module, currentContext = {}) {
  const store = loadStore();
  const now = new Date();
  const currentHour = currentContext.hour ?? now.getHours();
  const currentDow = currentContext.dow ?? now.getDay();

  // Filter events for this module
  const moduleEvents = store.events.filter((e) => e.m === module);
  if (moduleEvents.length === 0) return [];

  // Group by action
  const actionGroups = {};
  moduleEvents.forEach((evt) => {
    if (!actionGroups[evt.a]) {
      actionGroups[evt.a] = { count: 0, events: [] };
    }
    actionGroups[evt.a].count += 1;
    actionGroups[evt.a].events.push(evt);
  });

  const maxCount = Math.max(1, ...Object.values(actionGroups).map((g) => g.count));

  const scored = Object.entries(actionGroups).map(([action, group]) => {
    // Frequency score (0-1)
    const freqScore = group.count / maxCount;

    // Recency score (0-1) — based on most recent event
    const latestEvent = group.events[group.events.length - 1];
    const recScore = recencyScore(latestEvent.t);

    // Temporal context score (0-1) — does user usually do this at this time / day?
    let temporalScore = 0;
    const sameHourEvents = group.events.filter(
      (e) => Math.abs(e.h - currentHour) <= 1
    );
    const sameDayEvents = group.events.filter((e) => e.dow === currentDow);
    temporalScore =
      0.5 * (sameHourEvents.length / Math.max(1, group.events.length)) +
      0.5 * (sameDayEvents.length / Math.max(1, group.events.length));

    const confidence =
      0.35 * freqScore + 0.3 * recScore + 0.35 * temporalScore;

    // Extract the most common context for this action
    const contextFreq = {};
    group.events.forEach((e) => {
      const key = JSON.stringify(e.c);
      contextFreq[key] = (contextFreq[key] || 0) + 1;
    });
    const topContextStr = Object.entries(contextFreq).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];
    const topContext = topContextStr ? JSON.parse(topContextStr) : {};

    return { action, confidence, context: topContext };
  });

  return scored.sort((a, b) => b.confidence - a.confidence);
}

// ==================== SMART DEFAULTS ====================

/**
 * Get smart default values for a form in a given module.
 * Returns an object of field → suggested value pairs.
 *
 * @param {string} module - Module name
 * @param {string} formType - Type of form: "add_expense", "add_task", "add_fee", etc.
 * @returns {Object} Field-value pairs for suggested defaults
 */
export function getSmartDefaults(module, formType) {
  const store = loadStore();

  // Find events matching this form type
  const relevantEvents = store.events.filter(
    (e) => e.m === module && e.a === formType
  );

  if (relevantEvents.length === 0) return {};

  // Build frequency maps for each context field
  const fieldMaps = {};
  relevantEvents.forEach((evt) => {
    Object.entries(evt.c).forEach(([field, value]) => {
      if (value === null || value === undefined || value === "") return;
      if (!fieldMaps[field]) fieldMaps[field] = {};
      const key = String(value);
      if (!fieldMaps[field][key]) {
        fieldMaps[field][key] = { count: 0, lastDate: "" };
      }
      fieldMaps[field][key].count += 1;
      if (evt.t > fieldMaps[field][key].lastDate) {
        fieldMaps[field][key].lastDate = evt.t;
      }
    });
  });

  // For each field, pick the value with the highest combined score
  const defaults = {};
  Object.entries(fieldMaps).forEach(([field, valueMap]) => {
    const maxCount = Math.max(1, ...Object.values(valueMap).map((v) => v.count));

    let best = { value: null, score: -1 };
    Object.entries(valueMap).forEach(([value, stats]) => {
      const score =
        0.6 * (stats.count / maxCount) + 0.4 * recencyScore(stats.lastDate);
      if (score > best.score) {
        best = { value, score };
      }
    });

    if (best.value !== null) {
      defaults[field] = best.value;
    }
  });

  return defaults;
}

// ==================== QUICK ACTIONS ====================

/**
 * Get contextual quick actions for the current page/time.
 * These are pre-built action suggestions the user can execute with one tap.
 *
 * @param {Object} appState - Current app state:
 *   { page, hour, dow, unmarkedLectures, pendingTasks, pendingFees, todayExpenseCount }
 * @returns {{ id: string, label: string, module: string, action: string, context: Object, priority: number }[]}
 */
export function getQuickActions(appState = {}) {
  const store = loadStore();
  const actions = [];
  const now = new Date();
  const hour = appState.hour ?? now.getHours();
  const dow = appState.dow ?? now.getDay();
  const isWeekday = dow >= 1 && dow <= 5;

  // --- Attendance Quick Actions ---
  if (appState.unmarkedLectures > 0 && isWeekday) {
    // Check if user typically marks all present
    const attEvents = store.events.filter(
      (e) => e.m === "attendance" && e.a === "mark_all_present"
    );
    const allPresentCount = attEvents.length;
    const allAbsentEvents = store.events.filter(
      (e) => e.m === "attendance" && e.a === "mark_all_absent"
    );

    if (allPresentCount > allAbsentEvents.length) {
      actions.push({
        id: "att-all-present",
        label: `Mark all ${appState.unmarkedLectures} lectures present`,
        module: "attendance",
        action: "mark_all_present",
        context: {},
        priority: hour >= 8 && hour <= 18 ? 95 : 60, // Higher during class hours
      });
    } else {
      actions.push({
        id: "att-mark",
        label: `Mark attendance (${appState.unmarkedLectures} lectures)`,
        module: "attendance",
        action: "open_attendance",
        context: {},
        priority: hour >= 8 && hour <= 18 ? 85 : 50,
      });
    }
  }

  // --- Expense Quick Actions ---
  // Find the user's most common expense pattern
  const expenseEvents = store.events.filter(
    (e) => e.m === "expense" && e.a === "add_expense"
  );
  if (expenseEvents.length >= 3) {
    // Build frequency of category+amount combos
    const combos = {};
    expenseEvents.forEach((e) => {
      const key = `${e.c.categoryName || ""}|${e.c.amount || ""}`;
      if (!combos[key]) combos[key] = { count: 0, lastDate: "", ctx: e.c };
      combos[key].count += 1;
      if (e.t > combos[key].lastDate) combos[key].lastDate = e.t;
    });

    const topCombos = Object.values(combos)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    topCombos.forEach((combo, i) => {
      if (combo.count >= 2 && combo.ctx.categoryName && combo.ctx.amount) {
        actions.push({
          id: `exp-quick-${i}`,
          label: `₹${combo.ctx.amount} ${combo.ctx.categoryName}`,
          module: "expense",
          action: "quick_add_expense",
          context: combo.ctx,
          priority: hour >= 11 && hour <= 22 ? 70 - i * 10 : 40 - i * 10,
        });
      }
    });
  } else {
    actions.push({
      id: "exp-quick-default",
      label: "Log New Expense",
      module: "expense",
      action: "quick_add_expense",
      context: { amount: "", categoryName: "" },
      priority: 60,
    });
  }

  // --- Task Quick Actions ---
  if (appState.pendingTasks > 0) {
    actions.push({
      id: "task-pending",
      label: `${appState.pendingTasks} task${appState.pendingTasks > 1 ? "s" : ""} pending`,
      module: "task",
      action: "view_tasks",
      context: {},
      priority: 50,
    });
  }

  // --- Fee Quick Actions ---
  if (appState.pendingFees > 0) {
    actions.push({
      id: "fee-pending",
      label: `${appState.pendingFees} fee${appState.pendingFees > 1 ? "s" : ""} due`,
      module: "fee",
      action: "view_fees",
      context: {},
      priority: 65,
    });
  }

  // Sort by priority descending, take top 4
  return actions.sort((a, b) => b.priority - a.priority).slice(0, 4);
}

// ==================== STREAKS ====================

/**
 * Get streak data for a specific module/action.
 *
 * @param {string} module
 * @param {string} action
 * @returns {{ count: number, lastDate: string|null, contexts: Object[] } | null}
 */
export function getStreak(module, action) {
  const store = loadStore();
  return store.streaks[`${module}:${action}`] || null;
}

/**
 * Get all active streaks (count >= 3).
 *
 * @returns {{ key: string, count: number, lastDate: string }[]}
 */
export function getActiveStreaks() {
  const store = loadStore();
  return Object.entries(store.streaks)
    .filter(([_, s]) => s.count >= 3)
    .map(([key, s]) => ({
      key,
      count: s.count,
      lastDate: s.lastDate,
    }))
    .sort((a, b) => b.count - a.count);
}

// ==================== ATTENDANCE BEHAVIOR ====================

/**
 * Get the user's dominant attendance behavior.
 * Returns "mostly_present" | "mostly_absent" | "mixed" | "unknown"
 */
export function getAttendanceBehavior() {
  const store = loadStore();
  const attEvents = store.events.filter((e) => e.m === "attendance");
  if (attEvents.length < 5) return "unknown";

  const presentCount = attEvents.filter(
    (e) => e.a === "mark_present" || e.a === "mark_all_present"
  ).length;
  const absentCount = attEvents.filter(
    (e) => e.a === "mark_absent" || e.a === "mark_all_absent"
  ).length;
  const total = presentCount + absentCount;

  if (total === 0) return "unknown";
  if (presentCount / total >= 0.8) return "mostly_present";
  if (absentCount / total >= 0.8) return "mostly_absent";
  return "mixed";
}

/**
 * Check if the user's common pattern for a given day-of-week is "all present".
 *
 * @param {number} dow - Day of week (0=Sun, 6=Sat)
 * @returns {boolean}
 */
export function isAllPresentDay(dow) {
  const store = loadStore();
  const dayEvents = store.events.filter(
    (e) => e.m === "attendance" && e.dow === dow
  );

  if (dayEvents.length < 3) return false;

  const allPresentEvents = dayEvents.filter(
    (e) => e.a === "mark_all_present"
  );
  return allPresentEvents.length / dayEvents.length >= 0.7;
}

// ==================== EXPENSE PATTERNS ====================

/**
 * Get the user's top recurring expense patterns (category + approximate amount).
 *
 * @param {number} minOccurrences - Minimum number of times to qualify as recurring
 * @returns {{ categoryId: string, categoryName: string, amount: number, count: number }[]}
 */
export function getRecurringExpenses(minOccurrences = 3) {
  const store = loadStore();
  const expEvents = store.events.filter(
    (e) => e.m === "expense" && e.a === "add_expense" && e.c.amount
  );

  const combos = {};
  expEvents.forEach((e) => {
    // Bucket amount to nearest 5 for clustering
    const bucketed = Math.round((parseFloat(e.c.amount) || 0) / 5) * 5;
    if (bucketed <= 0) return;
    const key = `${e.c.categoryId || ""}:${bucketed}`;
    if (!combos[key]) {
      combos[key] = {
        categoryId: e.c.categoryId || "",
        categoryName: e.c.categoryName || "",
        amount: bucketed,
        count: 0,
      };
    }
    combos[key].count += 1;
  });

  return Object.values(combos)
    .filter((c) => c.count >= minOccurrences)
    .sort((a, b) => b.count - a.count);
}

/**
 * Generate context-aware expense suggestions based on spending patterns.
 * @param {Array} expenses - List of current month's expenses
 * @param {number} monthlyBudget - Configured monthly budget
 * @returns {Array} List of suggested actions
 */
export function getExpenseSuggestions(expenses = [], monthlyBudget = 5000, selectedMonth = null, selectedYear = null) {
  const suggestions = [];
  
  if (expenses.length === 0) {
    suggestions.push({
      type: "INITIALIZE",
      title: "Initialize Tracker",
      description: "Start logging expenses to unlock budget warnings and insights.",
      urgency: 100
    });
    return suggestions;
  }

  // Determine the context month/year from expenses if not provided
  let contextMonth = selectedMonth;
  let contextYear = selectedYear;
  if (contextMonth === null || contextYear === null) {
    const validDates = expenses.filter(e => e.date).map(e => new Date(e.date));
    if (validDates.length > 0) {
      contextMonth = validDates[0].getMonth();
      contextYear = validDates[0].getFullYear();
    } else {
      const now = new Date();
      contextMonth = now.getMonth();
      contextYear = now.getFullYear();
    }
  }

  const thisMonthExpenses = expenses.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return d.getMonth() === contextMonth && d.getFullYear() === contextYear;
  });

  if (thisMonthExpenses.length === 0) {
    suggestions.push({
      type: "INITIALIZE_MONTH",
      title: "New Month",
      description: "Log your first expense for this month to start tracking spending.",
      urgency: 100
    });
    return suggestions;
  }

  const totalSpent = thisMonthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  
  if (totalSpent > monthlyBudget) {
    suggestions.push({
      type: "BUDGET_OVERRUN",
      title: "Budget Exceeded",
      description: `You've exceeded your monthly budget of ₹${monthlyBudget}.`,
      urgency: 100
    });
  } else if (totalSpent > monthlyBudget * 0.8) {
    suggestions.push({
      type: "BUDGET_WARNING",
      title: "Budget Warning",
      description: `At this rate, you'll exceed ₹${monthlyBudget}.`,
      urgency: 80
    });
  }

  // Advanced Insights
  const now = new Date();
  const isCurrentMonth = (now.getMonth() === contextMonth && now.getFullYear() === contextYear);
  const daysInMonth = new Date(contextYear, contextMonth + 1, 0).getDate();
  
  // 1. Safe Daily Spend
  if (isCurrentMonth && totalSpent < monthlyBudget) {
    const remainingDays = Math.max(1, daysInMonth - now.getDate() + 1);
    const remainingBudget = monthlyBudget - totalSpent;
    const safeDaily = Math.floor(remainingBudget / remainingDays);
    
    suggestions.push({
      type: "SAFE_DAILY_SPEND",
      title: "Pacing Advice",
      description: `To stay under budget, keep daily spending below ₹${safeDaily}.`,
      urgency: 60
    });
  }

  // 2. Projected Spend (Burn Rate)
  if (isCurrentMonth && now.getDate() > 3) {
    const currentDay = now.getDate();
    const dailyAverage = totalSpent / currentDay;
    const projectedSpend = Math.round(dailyAverage * daysInMonth);
    
    if (projectedSpend > monthlyBudget && totalSpent <= monthlyBudget) {
      suggestions.push({
        type: "PROJECTED_OVERRUN",
        title: "Burn Rate Alert",
        description: `You are projected to spend ₹${projectedSpend} by month-end.`,
        urgency: 85
      });
    }
  }

  // 3. Heavy Category Detection
  const categoryTotals = {};
  thisMonthExpenses.forEach(e => {
    const catName = e.categoryName || "Other";
    categoryTotals[catName] = (categoryTotals[catName] || 0) + (parseFloat(e.amount) || 0);
  });

  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  if (topCategory && topCategory[1] > 0) {
    const categoryPercentage = Math.round((topCategory[1] / totalSpent) * 100);
    if (categoryPercentage >= 30) {
      suggestions.push({
        type: "HIGH_SPEND_CATEGORY",
        title: `${topCategory[0]} Spending`,
        description: `${topCategory[0]} accounts for ${categoryPercentage}% of your expenses.`,
        urgency: 70
      });
    }
  }
  
  // 4. Weekend vs Weekday Analysis
  let weekendSpend = 0;
  let weekdaySpend = 0;
  thisMonthExpenses.forEach(e => {
    if (!e.date) return;
    const day = new Date(e.date).getDay();
    const amount = parseFloat(e.amount) || 0;
    if (day === 0 || day === 6) weekendSpend += amount;
    else weekdaySpend += amount;
  });
  
  if (weekendSpend > weekdaySpend && weekendSpend > totalSpent * 0.5) {
    suggestions.push({
      type: "WEEKEND_SPENDER",
      title: "Weekend Spender",
      description: `Over 50% of your expenses happen on weekends.`,
      urgency: 50
    });
  }

  return suggestions.sort((a, b) => b.urgency - a.urgency).slice(0, 4); // Show top 4 insights max
}

// ==================== FEE PATTERNS ====================

/**
 * Generate context-aware fee suggestions based on the user's current fee data.
 * @param {Object} feesSummary - Current semester fees from the API
 * @returns {Array} List of suggested actions
 */
export function getFeeSuggestions(feesSummary) {
  if (!feesSummary) return [];
  const suggestions = [];
  const now = new Date();
  
  const fees = feesSummary.fees || [];
  
  // 1. Check for urgent unpaid fees (due within 7 days)
  const urgentFees = fees.filter(f => f.status === "PENDING" && f.dueDate && new Date(f.dueDate) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
  urgentFees.forEach(fee => {
    suggestions.push({
      type: "URGENT_PAY",
      fee: fee,
      title: `Pay ${fee.category} Fee`,
      urgency: 100
    });
  });
  
  // 2. Check for missing core fees (College, Hostel)
  const hasCollege = fees.some(f => f.category === "College");
  const hasHostel = fees.some(f => f.category === "Hostel");
  
  if (!hasCollege) {
    suggestions.push({
      type: "LOG_MISSING",
      category: "College",
      title: "Log Semester Tuition",
      urgency: 80
    });
  }
  
  // Predict if they usually log hostel based on behavior history
  const store = loadStore();
  const hostelEvents = store.events.filter(e => e.m === "fees" && e.a === "add_fee" && e.c.category === "Hostel");
  
  if (!hasHostel && hostelEvents.length > 0) {
    suggestions.push({
      type: "LOG_MISSING",
      category: "Hostel",
      title: "Log Hostel Fee",
      urgency: 70
    });
  }

  return suggestions.sort((a, b) => b.urgency - a.urgency);
}

// ==================== MARKS / ACADEMICS PATTERNS ====================

/**
 * Generate context-aware marks suggestions based on the user's ledger data.
 * @param {Array} subjects - Current semester subjects/marks array
 * @param {Object} examConfig - Exam weightage configuration
 * @returns {Array} List of suggested actions
 */
export function getMarksSuggestions(subjects, examConfig) {
  if (!subjects || !Array.isArray(subjects)) return [];
  const suggestions = [];

  if (subjects.length === 0) {
    suggestions.push({
      type: "INITIALIZE",
      title: "Initialize Ledger",
      description: "Add your core subjects",
      urgency: 100
    });
    return suggestions;
  }

  // Find subjects missing End-Sem marks but having Mid-Sem or Internals
  const missingEndSem = subjects.filter(s => 
    (s.midSem > 0 || s.internals > 0) && (s.endSem === null || s.endSem === undefined || s.endSem === "")
  );

  if (missingEndSem.length > 0) {
    suggestions.push({
      type: "LOG_ENDSEM",
      subject: missingEndSem[0], // just pick the first one as a suggestion
      title: `Log ${missingEndSem[0].subjectName} End-Sem`,
      description: "Finish your ledger",
      urgency: 90
    });
  }

  // Find at-risk subjects (Extremely low midSem/internals compared to max)
  const config = examConfig || {
    mid: { max: 25, weight: 25 },
    int: { max: 25, weight: 25 },
    end: { max: 100, weight: 50 }
  };
  
  const atRisk = subjects.filter(s => {
    if (s.endSem !== null && s.endSem !== undefined && s.endSem !== "") return false; // Already finished
    const midRatio = s.midSem ? s.midSem / Math.max(config.mid.max, 1) : 0;
    const intRatio = s.internals ? s.internals / Math.max(config.int.max, 1) : 0;
    
    // If they have less than 40% in internal assessments, they are at risk
    if ((s.midSem !== null && s.internals !== null) && (midRatio + intRatio) / 2 < 0.4) {
      return true;
    }
    return false;
  });

  if (atRisk.length > 0) {
    suggestions.push({
      type: "REVIEW_RISK",
      subject: atRisk[0],
      title: `Review ${atRisk[0].subjectName} Performance`,
      description: "At-Risk Trajectory",
      urgency: 80
    });
  }

  return suggestions.sort((a, b) => b.urgency - a.urgency);
}

// ==================== UTILITY ====================

/**
 * Clear all behavior data. For development/testing.
 */
export function clearBehaviorData() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get raw store for debugging.
 */
export function debugGetStore() {
  return loadStore();
}
