import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

const AuthContext = createContext(null);

/**
 * Global auth state provider.
 * Stores: authToken, userData (including role), isAuthenticated
 * Provides: login(), logout(), role helpers
 */
export function AuthProvider({ children }) {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("authToken"));
  const [userData, setUserData] = useState(() => {
    try {
      const stored = localStorage.getItem("userData");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem("darkMode");
    return stored === null ? true : stored === "true";
  });

  // Sync theme with document class immediately
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    }
  }, [isDark]);

  // Initialize/Update avatar when user changes
  useEffect(() => {
    if (userData?.userId) {
      const saved = localStorage.getItem(`profile_avatar_${userData.userId}`);
      setAvatarUrl(saved);
    } else {
      setAvatarUrl(null);
    }
  }, [userData?.userId]);

  const isAuthenticated = !!authToken;

  // Derive role helpers
  const role = userData?.role || "STUDENT";
  const isAdmin = role === "ADMIN" || role === "BOTH" || role === "SUPER_ADMIN";
  const isStudent = role === "STUDENT" || role === "BOTH" || role === "SUPER_ADMIN";

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (authToken) {
      localStorage.setItem("authToken", authToken);
    } else {
      localStorage.removeItem("authToken");
    }
  }, [authToken]);

  useEffect(() => {
    if (userData) {
      localStorage.setItem("userData", JSON.stringify(userData));
    } else {
      localStorage.removeItem("userData");
    }
  }, [userData]);

  // Keep legacy "isAuthenticated" flag in sync for ProtectedRoute backward compat
  useEffect(() => {
    localStorage.setItem("isAuthenticated", isAuthenticated ? "true" : "false");
  }, [isAuthenticated]);

  /**
   * Called after successful login/signup.
   * @param {object} authResponse — { token, name, email, userId, role }
   * @param {object} [extraData]  — additional user fields to store
   */
  const login = useCallback((authResponse, extraData = {}) => {
    setAuthToken(authResponse.token);
    setUserData({
      ...authResponse,
      ...extraData,
    });
  }, []);

  /**
   * Clears all auth state and stored data.
   */
  const logout = useCallback(() => {
    setAuthToken(null);
    setUserData(null);
    setAvatarUrl(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    localStorage.setItem("isAuthenticated", "false");
    window.location.href = "/login"; // Force complete app recreation and clear history
  }, []);

  /**
   * Updates the global avatar state for reactive UI updates across Topbar/Dashboard.
   */
  const updateAvatar = useCallback((newUrl) => {
    setAvatarUrl(newUrl);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  /**
   * Updates specific fields in the global user state.
   */
  const updateUserData = useCallback((newFields) => {
    setUserData((prev) => {
      if (!prev) return prev;
      return { ...prev, ...newFields };
    });
  }, []);

  const value = useMemo(() => ({
    authToken, userData, avatarUrl, isAuthenticated,
    role, isAdmin, isStudent, isDark,
    login, logout, updateAvatar, updateUserData, toggleDarkMode
  }), [authToken, userData, avatarUrl, isAuthenticated, role, isAdmin, isStudent, isDark, login, logout, updateAvatar, updateUserData, toggleDarkMode]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state from any component.
 * Usage: const { authToken, userData, isAuthenticated, role, isAdmin, isStudent, login, logout } = useAuth();
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export default AuthContext;
