// ==================== ENUMS & CONSTANTS ====================
// Mirrors backend entity enums exactly — used across all frontend modules

export const ATTENDANCE_STATUS = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  HOLIDAY: 'HOLIDAY',
  EXAM: 'EXAM',
};

export const ASSIGNMENT_STATUS = {
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  OVERDUE: 'OVERDUE',
};

export const FEES_STATUS = {
  PAID: 'PAID',
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
};

export const TASK_STATUS = {
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  OVERDUE: 'OVERDUE',
  COMPLETED: 'COMPLETED',
};

export const TASK_TYPE = {
  ASSIGNMENT: 'ASSIGNMENT',
  TODO: 'TODO',
};

// Days used in timetable
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Default time slots for timetable
export const DEFAULT_TIME_SLOTS = [
  { id: 1, start: '09:00', end: '10:00' },
  { id: 2, start: '10:00', end: '11:00' },
  { id: 3, start: '11:00', end: '12:00' },
  { id: 4, start: '12:00', end: '13:00' },
  { id: 5, start: '13:00', end: '14:00' },
  { id: 6, start: '14:00', end: '15:00' },
  { id: 7, start: '15:00', end: '16:00' },
  { id: 8, start: '16:00', end: '17:00' },
  { id: 9, start: '17:00', end: '18:00' },
];

// Expense category defaults (fallback when backend has none)
export const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 1, name: 'Food & Beverages' },
  { id: 2, name: 'Transportation' },
  { id: 3, name: 'Books & Stationery' },
  { id: 4, name: 'Shopping' },
  { id: 5, name: 'Entertainment' },
];
