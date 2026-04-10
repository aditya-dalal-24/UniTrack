import axios from 'axios';

// ==================== CONFIG ====================
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ==================== INTERCEPTORS ====================

// Request: attach JWT Bearer token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response: handle 401 (expired token) globally
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — force logout
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      localStorage.setItem('isAuthenticated', 'false');
      // Only redirect if not already on auth pages
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==================== RESPONSE NORMALIZER ====================

/**
 * Wraps every API call in a normalized { data, error } response.
 * On success: { data: <response>, error: null }
 * On failure: { data: null, error: <message> }
 */
async function request(method, url, body = null, params = null) {
  try {
    const config = { method, url };
    if (body) config.data = body;
    if (params) config.params = params;
    const response = await axiosInstance(config);
    return { data: response.data, error: null };
  } catch (error) {
    let message = 'Something went wrong. Please try again.';
    if (error.response) {
      // Server responded with error
      const serverMsg = error.response.data?.message || error.response.data?.error;
      if (serverMsg) {
        message = serverMsg;
      } else if (error.response.status === 403) {
        message = 'Access denied. Please login again.';
      } else if (error.response.status === 404) {
        message = 'Resource not found.';
      } else if (error.response.status === 400) {
        message = 'Invalid request. Please check your input.';
      } else if (error.response.status >= 500) {
        message = 'Server error. Please try again later.';
      }
    } else if (error.request) {
      message = 'Network error. Please check your connection.';
    }
    console.error(`API ${method.toUpperCase()} ${url}:`, message, error);
    return { data: null, error: message };
  }
}

// ==================== AUTH ====================

export const api = {
  login: (email, password) =>
    request('post', '/auth/login', { email, password }),

  signup: (formData) =>
    request('post', '/auth/register', {
      name: formData.fullName,
      email: formData.email,
      password: formData.password,
      phone: formData.phone || null,
      college: formData.university || null,
      course: formData.course || null,
      semester: formData.semester ? parseInt(formData.semester) : null,
      dob: formData.dateOfBirth || null,
    }),

  // ==================== DASHBOARD ====================
  getDashboard: () =>
    request('get', '/dashboard'),

  // ==================== PROFILE ====================
  getProfile: () =>
    request('get', '/profile'),

  updateProfile: (profileData) =>
    request('put', '/profile', profileData),

  // ==================== ATTENDANCE ====================
  getAttendance: () =>
    request('get', '/attendance'),

  markAttendance: (data) =>
    request('post', '/attendance', {
      date: data.date,
      status: data.status,
      note: data.note || null,
    }),

  deleteAttendance: (id) =>
    request('delete', `/attendance/${id}`),

  // ==================== ASSIGNMENTS ====================
  getAssignments: () =>
    request('get', '/assignments'),

  addAssignment: (data) =>
    request('post', '/assignments', {
      title: data.title,
      subject: data.subject,
      dueDate: data.dueDate,
      status: data.status || 'PENDING',
    }),

  updateAssignment: (id, data) =>
    request('put', `/assignments/${id}`, {
      title: data.title,
      subject: data.subject,
      dueDate: data.dueDate,
      status: data.status,
    }),

  deleteAssignment: (id) =>
    request('delete', `/assignments/${id}`),

  // ==================== TODOS ====================
  getTodos: (completed = null) =>
    request('get', '/todos', null, completed !== null ? { completed } : null),

  addTodo: (data) =>
    request('post', '/todos', {
      title: data.title,
      description: data.description || null,
      dueDate: data.dueDate || null,
      dueTime: data.dueTime || null,
      completed: false,
    }),

  updateTodo: (id, data) =>
    request('put', `/todos/${id}`, {
      title: data.title,
      description: data.description || null,
      dueDate: data.dueDate || null,
      dueTime: data.dueTime || null,
      completed: data.completed || false,
    }),

  deleteTodo: (id) =>
    request('delete', `/todos/${id}`),

  // ==================== TIMETABLE — SUBJECTS ====================
  getSubjects: () =>
    request('get', '/timetable/subjects'),

  addSubject: (data) =>
    request('post', '/timetable/subjects', {
      name: data.name,
      courseCode: data.courseCode || null,
      professor: data.professor || null,
    }),

  deleteSubject: (id) =>
    request('delete', `/timetable/subjects/${id}`),

  // ==================== TIMETABLE — SLOTS ====================
  getTimetable: () =>
    request('get', '/timetable'),

  addTimetableSlot: (data) =>
    request('post', '/timetable', {
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      subjectName: data.subjectName || null,
      courseCode: data.courseCode || null,
      professor: data.professor || null,
      roomNumber: data.roomNumber || null,
    }),

  updateTimetableSlot: (id, data) =>
    request('put', `/timetable/${id}`, {
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      subjectName: data.subjectName || null,
      courseCode: data.courseCode || null,
      professor: data.professor || null,
      roomNumber: data.roomNumber || null,
    }),

  deleteTimetableSlot: (id) =>
    request('delete', `/timetable/${id}`),

  // ==================== MARKS ====================
  getMarks: (semester = null) =>
    request('get', '/marks', null, semester !== null ? { semester } : null),

  addMarks: (data) =>
    request('post', '/marks', data),

  updateMarks: (id, data) =>
    request('put', `/marks/${id}`, data),

  deleteMarks: (id) =>
    request('delete', `/marks/${id}`),

  // ==================== FEES ====================
  getFees: (semester = null) =>
    request('get', '/fees', null, semester !== null ? { semester } : null),

  addFee: (data) =>
    request('post', '/fees', {
      semester: data.semester,
      category: data.category,
      totalAmount: data.totalAmount,
      paidAmount: data.paidAmount || 0,
      dueDate: data.dueDate || null,
      paidDate: data.paidDate || null,
      status: data.status || 'PENDING',
    }),

  updateFee: (id, data) =>
    request('put', `/fees/${id}`, data),

  deleteFee: (id) =>
    request('delete', `/fees/${id}`),

  // ==================== EXPENSES — CATEGORIES ====================
  getExpenseCategories: () =>
    request('get', '/expenses/categories'),

  addExpenseCategory: (name) =>
    request('post', '/expenses/categories', { name }),

  deleteExpenseCategory: (id) =>
    request('delete', `/expenses/categories/${id}`),

  // ==================== EXPENSES ====================
  getExpenses: (month = null, year = null) => {
    const params = {};
    if (month !== null) params.month = month;
    if (year !== null) params.year = year;
    return request('get', '/expenses', null, Object.keys(params).length ? params : null);
  },

  addExpense: (data) =>
    request('post', '/expenses', {
      amount: data.amount,
      categoryId: data.categoryId || null,
      date: data.date || null,
      time: data.time || null,
      note: data.note || null,
    }),

  deleteExpense: (id) =>
    request('delete', `/expenses/${id}`),
};

export default api;
