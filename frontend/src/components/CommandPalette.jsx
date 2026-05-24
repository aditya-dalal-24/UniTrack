import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  CalendarCheck,
  CheckSquare,
  BarChart2,
  ReceiptIndianRupee,
  Wallet,
  Users,
  Plus,
  ArrowRight,
  Command,
  CornerDownLeft,
} from "lucide-react";

// ==================== COMMAND REGISTRY ====================

const NAVIGATION_COMMANDS = [
  { id: "nav-dashboard", label: "Go to Dashboard", keywords: "home overview", icon: LayoutDashboard, route: "/dashboard", type: "navigation" },
  { id: "nav-schedule", label: "Go to Schedule", keywords: "attendance timetable calendar classes", icon: CalendarCheck, route: "/schedule", type: "navigation" },
  { id: "nav-tasks", label: "Go to Tasks", keywords: "assignments todos homework", icon: CheckSquare, route: "/tasks", type: "navigation" },
  { id: "nav-marks", label: "Go to Marks", keywords: "grades cgpa sgpa results", icon: BarChart2, route: "/marks", type: "navigation" },
  { id: "nav-fees", label: "Go to Fees", keywords: "payment tuition dues", icon: ReceiptIndianRupee, route: "/fees", type: "navigation" },
  { id: "nav-expenses", label: "Go to Expenses", keywords: "spending money budget", icon: Wallet, route: "/expenses", type: "navigation" },
  { id: "nav-profile", label: "Go to Profile", keywords: "settings account user info", icon: Users, route: "/profile", type: "navigation" },
];

const ACTION_COMMANDS = [
  { id: "add-expense", label: "Add Expense", keywords: "new spend money", icon: Plus, route: "/expenses", type: "action", actionData: { openAdd: true } },
  { id: "add-task", label: "Add Task", keywords: "new assignment todo homework", icon: Plus, route: "/tasks", type: "action", actionData: { openAdd: true } },
  { id: "add-fee", label: "Add Fee", keywords: "new payment", icon: Plus, route: "/fees", type: "action", actionData: { openAdd: true } },
  { id: "mark-attendance", label: "Mark Attendance", keywords: "present absent class today", icon: CalendarCheck, route: "/schedule", type: "action", actionData: { openAttendance: true } },
];

const ALL_COMMANDS = [...ACTION_COMMANDS, ...NAVIGATION_COMMANDS];

// ==================== FUZZY SEARCH ====================

function fuzzyMatch(query, text) {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Exact substring match gets highest score
  if (t.includes(q)) return 1.0;

  // Word-start matching
  const words = t.split(/\s+/);
  const queryWords = q.split(/\s+/);
  let matchedWords = 0;

  for (const qw of queryWords) {
    if (words.some((w) => w.startsWith(qw))) {
      matchedWords++;
    }
  }

  if (matchedWords > 0) {
    return 0.5 + 0.5 * (matchedWords / queryWords.length);
  }

  // Character-by-character fuzzy
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  if (qi === q.length) return 0.3;

  return 0;
}

// ==================== COMPONENT ====================

/**
 * CommandPalette — Global Ctrl+K search & command palette.
 *
 * Features:
 * - Navigate to any page
 * - Quick add actions (expense, task, fee)
 * - Fuzzy search with keyword matching
 * - Keyboard navigation (arrow keys + enter)
 * - Recent commands memory
 *
 * Must be rendered once at app level (e.g., in AppLayout or App).
 */
export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Load recent commands from localStorage
  const [recentIds, setRecentIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("unitrack_recent_commands") || "[]");
    } catch {
      return [];
    }
  });

  // Global keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter and rank commands
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Show recent commands first, then all commands
      const recents = recentIds
        .map((id) => ALL_COMMANDS.find((c) => c.id === id))
        .filter(Boolean)
        .slice(0, 3);

      const rest = ALL_COMMANDS.filter(
        (c) => !recentIds.includes(c.id)
      );

      return [
        ...(recents.length > 0 ? [{ type: "header", label: "Recent" }] : []),
        ...recents,
        { type: "header", label: "Actions" },
        ...ACTION_COMMANDS.filter((c) => !recentIds.includes(c.id)),
        { type: "header", label: "Navigate" },
        ...NAVIGATION_COMMANDS.filter((c) => !recentIds.includes(c.id)),
      ];
    }

    const scored = ALL_COMMANDS.map((cmd) => {
      const labelScore = fuzzyMatch(query, cmd.label);
      const keywordScore = fuzzyMatch(query, cmd.keywords || "");
      const score = Math.max(labelScore, keywordScore * 0.8);
      return { ...cmd, score };
    })
      .filter((cmd) => cmd.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored;
  }, [query, recentIds]);

  // Get selectable items (excluding headers)
  const selectableItems = useMemo(
    () => filteredCommands.filter((c) => c.type !== "header"),
    [filteredCommands]
  );

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, selectableItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = selectableItems[selectedIndex];
        if (selected) executeCommand(selected);
      }
    },
    [selectableItems, selectedIndex]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll("[data-command-item]");
      const item = items[selectedIndex];
      if (item) {
        item.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const executeCommand = useCallback(
    (cmd) => {
      // Save to recents
      const newRecents = [cmd.id, ...recentIds.filter((id) => id !== cmd.id)].slice(0, 5);
      setRecentIds(newRecents);
      try {
        localStorage.setItem("unitrack_recent_commands", JSON.stringify(newRecents));
      } catch {}

      setIsOpen(false);

      // Navigate + pass action data via state
      if (cmd.route) {
        if (location.pathname === cmd.route && cmd.actionData) {
          // Already on the page — dispatch a custom event
          window.dispatchEvent(
            new CustomEvent("unitrack:command", { detail: cmd.actionData })
          );
        } else {
          navigate(cmd.route, { state: cmd.actionData || {} });
        }
      }
    },
    [navigate, location, recentIds]
  );

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Track selectable index for rendering
  let selectableIdx = -1;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[201] w-[92vw] max-w-[540px]"
          >
            <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-2xl shadow-black/20 border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/60">
                <Search className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search commands, navigate, or take action..."
                  className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                  autoComplete="off"
                  spellCheck="false"
                />
                <kbd className="hidden md:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-200 dark:border-slate-700">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div
                ref={listRef}
                className="max-h-[50vh] overflow-y-auto py-2"
              >
                {filteredCommands.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">
                    No results found for "{query}"
                  </div>
                )}

                {filteredCommands.map((cmd, i) => {
                  if (cmd.type === "header") {
                    return (
                      <div
                        key={`header-${cmd.label}-${i}`}
                        className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest"
                      >
                        {cmd.label}
                      </div>
                    );
                  }

                  selectableIdx++;
                  const isSelected = selectableIdx === selectedIndex;
                  const Icon = cmd.icon;
                  const currentIdx = selectableIdx;

                  return (
                    <button
                      key={cmd.id}
                      data-command-item
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(currentIdx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected
                          ? "bg-slate-100 dark:bg-slate-800"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-lg flex-shrink-0 ${
                          cmd.type === "action"
                            ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                        {cmd.label}
                      </span>
                      {isSelected && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <CornerDownLeft className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[9px]">↑↓</kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[9px]">↵</kbd>
                    select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[9px]">esc</kbd>
                    close
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Command className="h-3 w-3" />
                  <span>UniTrack</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
