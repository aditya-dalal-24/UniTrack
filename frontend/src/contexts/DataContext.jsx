import { createContext, useContext, useState, useCallback, useRef } from "react";
import { api } from "../services/api";

const DataContext = createContext(null);

/**
 * Global data cache provider.
 * Prevents redundant API calls when navigating between pages.
 * Data is cached in memory and only refetched when explicitly invalidated
 * or when the cache TTL (5 minutes) expires.
 */
export function DataProvider({ children }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);
  const lastFetchRef = useRef(0);

  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (matches backend Caffeine TTL)

  const fetchDashboard = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    // Return cached data if it's still fresh and not forced
    if (!forceRefresh && dashboardData && (now - lastFetchRef.current < CACHE_TTL)) {
      return { data: dashboardData, error: null };
    }

    setDashboardLoading(true);
    setDashboardError(null);
    const { data, error: apiError } = await api.getDashboard();
    if (apiError) {
      setDashboardError(apiError);
    } else {
      setDashboardData(data);
      lastFetchRef.current = Date.now();
    }
    setDashboardLoading(false);
    return { data, error: apiError };
  }, [dashboardData]);

  const invalidateDashboard = useCallback(() => {
    lastFetchRef.current = 0; // Force next fetch to bypass cache
  }, []);

  const value = {
    dashboardData,
    dashboardLoading,
    dashboardError,
    fetchDashboard,
    invalidateDashboard,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
