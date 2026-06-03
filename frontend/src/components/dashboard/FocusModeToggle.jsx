import { memo } from "react";
import { Eye, EyeOff } from "lucide-react";

function FocusModeToggleInner({ focusMode, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-bold border transition-colors ${
        focusMode
          ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:text-slate-200"
      }`}
      title={focusMode ? "Exit Focus Mode" : "Enter Focus Mode — show only urgent items"}
    >
      {focusMode ? (
        <>
          <EyeOff className="h-3.5 w-3.5" strokeWidth={2.5} />
          Focus Mode
        </>
      ) : (
        <>
          <Eye className="h-3.5 w-3.5" strokeWidth={2.5} />
          Focus
        </>
      )}
    </button>
  );
}

const FocusModeToggle = memo(FocusModeToggleInner);
export default FocusModeToggle;
