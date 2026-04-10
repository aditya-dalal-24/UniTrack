import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import AppLayout from "./layout/AppLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Attendance from "./pages/Attendance.jsx";
import Assignments from "./pages/Assignments.jsx";
import Marks from "./pages/Marks.jsx";
import Fees from "./pages/Fees.jsx";
import Expenses from "./pages/Expenses.jsx";
import Timetable from "./pages/Timetable.jsx";
import Profile from "./pages/Profile.jsx";
import ToDo from "./pages/ToDo.jsx";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppRoutes() {
  const { login, logout, isAuthenticated } = useAuth();

  return (
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

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout onLogout={logout} />
          </ProtectedRoute>
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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
