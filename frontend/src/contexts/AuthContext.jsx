import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

/**
 * Global auth state provider.
 * Stores: authToken, userData, isAuthenticated
 * Provides: login(), logout()
 *
 * All components should use `useAuth()` instead of direct localStorage access.
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
   * @param {object} authResponse — { token, name, email, userId }
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
  }, []);

  /**
   * Updates the global avatar state for reactive UI updates across Topbar/Dashboard.
   */
  const updateAvatar = useCallback((newUrl) => {
    setAvatarUrl(newUrl);
  }, []);

  return (
    <AuthContext.Provider value={{ authToken, userData, avatarUrl, isAuthenticated, login, logout, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state from any component.
 * Usage: const { authToken, userData, isAuthenticated, login, logout } = useAuth();
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export default AuthContext;
