import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoadingSpinner from "./components/LoadingSpinner";

// Lazy-loaded pages for better performance
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const SignupPage = lazy(() => import("./pages/SignupPage.jsx"));
const LandingPage = lazy(() => import("./pages/LandingPage.jsx"));
const AppLayout = lazy(() => import("./layout/AppLayout.jsx"));
const AdminLayout = lazy(() => import("./layout/AdminLayout.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Attendance = lazy(() => import("./pages/Attendance.jsx"));
const Assignments = lazy(() => import("./pages/Assignments.jsx"));
const Marks = lazy(() => import("./pages/Marks.jsx"));
const Fees = lazy(() => import("./pages/Fees.jsx"));
const Expenses = lazy(() => import("./pages/Expenses.jsx"));
const Timetable = lazy(() => import("./pages/Timetable.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const ToDo = lazy(() => import("./pages/ToDo.jsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.jsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.jsx"));

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function StudentRoute({ children }) {
  const { isAuthenticated, isStudent } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isStudent) return <Navigate to="/admin/dashboard" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { login, logout, isAuthenticated } = useAuth();

  return (
    <Suspense fallback={<LoadingSpinner fullPage message="Loading page..." />}>
      <Routes>
        <Route
          path="/login"
          element={<LoginPage onLogin={login} />}
        />

        <Route
          path="/signup"
          element={<SignupPage onLogin={login} />}
        />

        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />
          }
        />

        {/* Student Routes */}
        <Route
          path="/*"
          element={
            <StudentRoute>
              <AppLayout onLogout={logout} />
            </StudentRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="marks" element={<Marks />} />
          <Route path="fees" element={<Fees />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="todo" element={<ToDo />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
