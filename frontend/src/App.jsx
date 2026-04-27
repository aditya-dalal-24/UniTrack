import { useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Calculator } from "lucide-react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DataProvider } from "./contexts/DataContext";
import LoadingSpinner from "./components/LoadingSpinner";
import ThemeToggle from "./components/ThemeToggle";
import FloatingCalculator from "./components/FloatingCalculator";

// Lazy-loaded pages for better performance
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const SignupPage = lazy(() => import("./pages/SignupPage.jsx"));
const LandingPage = lazy(() => import("./pages/LandingPage.jsx"));
const AppLayout = lazy(() => import("./layout/AppLayout.jsx"));
const AdminLayout = lazy(() => import("./layout/AdminLayout.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Schedule = lazy(() => import("./pages/Schedule.jsx"));
const Marks = lazy(() => import("./pages/Marks.jsx"));
const Fees = lazy(() => import("./pages/Fees.jsx"));
const Expenses = lazy(() => import("./pages/Expenses.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Tasks = lazy(() => import("./pages/Tasks.jsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.jsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.jsx"));
const AdminThoughts = lazy(() => import("./pages/admin/AdminThoughts.jsx"));

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
          <Route path="schedule" element={<Schedule />} />
          <Route path="attendance" element={<Navigate to="/schedule" replace />} />
          <Route path="timetable" element={<Navigate to="/schedule" replace />} />
          <Route path="marks" element={<Marks />} />
          <Route path="fees" element={<Fees />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="tasks" element={<Tasks />} />
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
          <Route path="thoughts" element={<AdminThoughts />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function AppContent() {
  const [showCalculator, setShowCalculator] = useState(false);
  const location = useLocation();
  
  const showCalculatorButton = ["/marks", "/fees", "/expenses"].includes(location.pathname);

  return (
    <DataProvider>
      <div className="fixed bottom-24 md:bottom-8 right-6 md:right-8 z-[9999] flex items-center gap-3">
        {showCalculatorButton && (
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-indigo-600 dark:text-indigo-400 transition-all hover:scale-110 active:scale-95"
          >
            <Calculator size={20} />
          </button>
        )}
        <ThemeToggle />
      </div>
      <FloatingCalculator isOpen={showCalculator} onClose={() => setShowCalculator(false)} />
      <AppRoutes />
    </DataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
