import axios from 'axios';

// ==================== CONFIG ====================
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Increased to 60s to handle Render cold starts
});

// Diagnostic log to verify connection details
console.table({
  "UniTrack Connectivity": "Diagnostic",
  "Target Backend": API_BASE_URL,
  "Environment": import.meta.env.MODE,
  "Retry Config": "3 attempts on Network Error",
  "Status": "Initializing..."
});

/**
 * Enhanced Wake-up logic: Aggressively pings during cold start window,
 * then backs off. Also pre-warms the security filter chain.
 */
let backendAwake = false;

async function wakeUpBackend(attempts = 0) {
  if (attempts > 8 || backendAwake) return;
  
  // More aggressive early on (3s), then back off (5s)
  const delay = attempts < 3 ? 3000 : 5000;
  
  try {
    const start = Date.now();
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/actuator/health`, { 
      method: 'GET', 
      mode: 'cors',
      cache: 'no-cache'
    });
    
    if (response.ok) {
      backendAwake = true;
      const elapsed = Date.now() - start;
      console.log(`Backend is AWAKE (responded in ${elapsed}ms)`);
      
      // Pre-warm the security filter chain & JPA lazy beans
      // by making a lightweight authenticated-path request
      fetch(`${API_BASE_URL}/dashboard`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        }
      }).catch(() => {}); // Silently ignore — just warming up
    } else {
      throw new Error(`Status ${response.status}`);
    }
  } catch (err) {
    console.log(`Backend sleeping or booting (Attempt ${attempts + 1}/8)...`);
    setTimeout(() => wakeUpBackend(attempts + 1), delay);
  }
}

// Start wake-up process immediately when the JS bundle loads
wakeUpBackend();

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

// Response: handle 401 (expired token) AND perform retries on Network Errors
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, message } = error;

    // 1. Handle Token Expiry
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      localStorage.setItem('isAuthenticated', 'false');
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // 2. Handle Network Errors / Timeouts with Automatic Retry
    // This specifically targets the "Network Error" often seen during Render cold starts
    const isNetworkError = !error.response && (message === 'Network Error' || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK');
    
    if (isNetworkError && !config._retryCount) {
      config._retryCount = 0;
    }

    if (isNetworkError && config._retryCount < 3) {
      config._retryCount += 1;
      const delay = config._retryCount * 2000; // Exponential backoff: 2s, 4s, 6s
      
      console.warn(`Network error detected. Retrying request (${config._retryCount}/3) in ${delay}ms...`, config.url);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return axiosInstance(config);
    }

    return Promise.reject(error);
  }
);

// ==================== RESPONSE NORMALIZER & CACHE ====================

const apiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 mins

export const clearApiCache = () => apiCache.clear();

/**
 * Wraps every API call in a normalized { data, error } response.
 * Implements SWR (Stale-While-Revalidate) global cache for ultra-fast page speeds.
 */
async function request(method, url, body = null, params = null) {
  try {
    const config = { method, url };
    if (body) config.data = body;
    if (params) config.params = params;

    const isGet = method.toLowerCase() === 'get';
    let cacheKey = null;

    if (isGet) {
      cacheKey = url + (params ? JSON.stringify(params) : '');
      const cached = apiCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        // Fire background revalidation to keep cache fresh
        axiosInstance(config).then(res => {
          apiCache.set(cacheKey, { data: res.data, timestamp: Date.now() });
        }).catch(() => {}); 
        
        // Instantly return cached data (zero-lag rendering)
        return { data: cached.data, error: null };
      }
    } else {
      // Brutal cache invalidation on ANY mutation to guarantee cross-module consistency
      apiCache.clear();
    }

    const response = await axiosInstance(config);
    
    if (isGet && cacheKey) {
      apiCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
    }

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
      gender: formData.gender || null,
    }),

  googleLogin: (idToken) =>
    request('post', '/auth/google', { idToken }),

  verifyEmail: (email, otp) =>
    request('post', '/auth/verify-email', { email, otp }),

  resendOtp: (email) =>
    request('post', '/auth/resend-otp', { email }),

  forgotPassword: (email) =>
    request('post', '/auth/forgot-password', { email }),

  resetPassword: (email, otp, newPassword) =>
    request('post', '/auth/reset-password', { email, otp, newPassword }),

  // ==================== DASHBOARD ====================
  getDashboard: () =>
    request('get', '/dashboard'),

  // ==================== PROFILE ====================
  getProfile: () =>
    request('get', '/profile'),

  updateProfile: (profileData) =>
    request('put', '/profile', {
      ...profileData,
      gender: profileData.gender || null,
    }),

  // ==================== ATTENDANCE ====================
  getAttendance: (date = null) =>
    request('get', date ? `/attendance?date=${date}` : '/attendance'),

  updateAttendance: (id, data) =>
    request('put', `/attendance/${id}`, {
      date: data.date,
      status: data.status,
      subjectId: data.subjectId || null,
      timetableSlotId: data.timetableSlotId || null,
      note: data.note || null,
    }),

  markAttendance: (data) =>
    request('post', '/attendance', {
      date: data.date,
      status: data.status,
      subjectId: data.subjectId || null,
      timetableSlotId: data.timetableSlotId || null,
      note: data.note || null,
    }),

  deleteAttendance: (id) =>
    request('delete', `/attendance/${id}`),

  deleteAttendanceByDate: (date) =>
    request('delete', `/attendance/date/${date}`),

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

  deleteAllAssignments: () =>
    request('delete', '/assignments'),

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

  deleteAllTodos: () =>
    request('delete', '/todos'),

  // ==================== TASKS (Merged Assignments & Todos) ====================
  getTasks: (type = null, page = null, size = null) => {
    const params = {};
    if (type) params.type = type;
    if (page !== null && size !== null) {
      params.page = page;
      params.size = size;
    }
    return request('get', '/tasks', null, Object.keys(params).length ? params : null);
  },

  addTask: (data) =>
    request('post', '/tasks', data),

  updateTask: (id, data) =>
    request('put', `/tasks/${id}`, data),

  deleteTask: (id) =>
    request('delete', `/tasks/${id}`),

  deleteAllTasks: () =>
    request('delete', '/tasks'),

  // ==================== SUBJECTS ====================
  getSubjects: (semester = null) =>
    request('get', '/subjects', null, semester !== null ? { semester } : null),

  addSubject: (data) =>
    request('post', '/subjects', {
      name: data.name,
      courseCode: data.courseCode || null,
      professor: data.professor || null,
      color: data.color || null,
      semester: data.semester || null,
    }),

  updateSubject: (id, data) =>
    request('put', `/subjects/${id}`, {
      name: data.name,
      fullName: data.fullName || null,
      courseCode: data.courseCode || null,
      roomNumber: data.roomNumber || null,
      professor: data.professor || null,
      color: data.color || null,
      semester: data.semester || null,
    }),

  deleteSubject: (id) =>
    request('delete', `/subjects/${id}`),

  deleteAllSubjects: () =>
    request('delete', '/subjects'),

  // ==================== TIMETABLE — SLOTS ====================
  getTimetable: () =>
    request('get', '/timetable'),

  clearTimetable: () =>
    request('delete', '/timetable'),

  addTimetableSlot: (data) =>
    request('post', '/timetable', {
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      subjectName: data.subjectName || null,
      courseCode: data.courseCode || null,
      professor: data.professor || null,
      roomNumber: data.roomNumber || null,
      groupInfo: data.groupInfo || null,
      subjectId: data.subjectId || null,
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
      groupInfo: data.groupInfo || null,
      subjectId: data.subjectId || null,
    }),

  deleteTimetableSlot: (id) =>
    request('delete', `/timetable/${id}`),

  deleteAllTimetableSlots: () =>
    request('delete', '/timetable'),

  uploadTimetable: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('post', '/timetable/upload', formData);
  },

  saveTimetableBatch: (slots) =>
    request('post', '/timetable/batch', slots),

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
      receiptData: data.receiptData || null,
      receiptFileName: data.receiptFileName || null,
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

  getExpenseBill: (date) =>
    request('get', '/expenses/bill', null, { date }),

  // ==================== ADMIN ====================
  getAdminUsers: (page = null, size = null) => {
    const params = {};
    if (page !== null && size !== null) {
      params.page = page;
      params.size = size;
    }
    return request('get', '/admin/users', null, Object.keys(params).length ? params : null);
  },

  getAdminStats: () =>
    request('get', '/admin/stats'),

  activateUser: (id) =>
    request('put', `/admin/users/${id}/activate`),

  deactivateUser: (id) =>
    request('put', `/admin/users/${id}/deactivate`),

  changeUserRole: (id, role) =>
    request('put', `/admin/users/${id}/role`, { role }),

  deleteUser: (id) =>
    request('delete', `/admin/users/${id}`),
};

export default api;
