import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";

/**
 * Reusable UserAvatar component and logic provider.
 * Handles namespaced localStorage lookup and professional initials-based fallback.
 */
export default function UserAvatar({ name, userId, src, className = "h-10 w-10" }) {
  const { userData, avatarUrl: contextAvatar } = useAuth();

  // 1. Determine the avatar to show
  const activeAvatar = useMemo(() => {
    // Priority: Explicit prop > Reactive Context (if same user) > namespaced localStorage
    if (src) return src;
    
    // Only use the real-time context avatar if this component is rendering the current user
    if (contextAvatar && userId && userId === userData?.userId) {
      return contextAvatar;
    }
    
    if (!userId) return null;
    return localStorage.getItem(`profile_avatar_${userId}`);
  }, [userId, src, contextAvatar, userData?.userId]);

  // 2. Generate deterministic professional gradient based on userId or name
  const gradientStyles = useMemo(() => {
    const seed = userId || name || "default";
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Professional slate-indigo-teal inspired color palette
    const hue1 = Math.abs(hash % 360);
    const hue2 = (hue1 + 40) % 360;
    
    return {
      background: `linear-gradient(135deg, hsl(${hue1}, 45%, 55%), hsl(${hue2}, 45%, 45%))`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontWeight: "700",
      userSelect: "none"
    };
  }, [userId, name]);

  // 3. Extract Initials
  const initials = useMemo(() => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }, [name]);

  if (activeAvatar) {
    return (
      <img
        src={activeAvatar}
        alt={name}
        className={`${className} rounded-full object-cover shadow-sm border-2 border-white dark:border-slate-800`}
      />
    );
  }

  return (
    <div 
      style={gradientStyles}
      className={`${className} rounded-full shadow-sm border-2 border-white dark:border-slate-800`}
    >
      {initials}
    </div>
  );
}
