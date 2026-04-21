import { useState } from "react";
import { motion, useMotionValue, useAnimationFrame } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, CheckSquare, Calendar, Award, Wallet } from "lucide-react";

export default function InteractiveDice() {
  const navigate = useNavigate();
  // Start with a slight offset so it looks genuinely 3D initially
  const rotateX = useMotionValue(-15);
  const rotateY = useMotionValue(25);
  
  const [isInteracting, setIsInteracting] = useState(false);

  // Physics-based idle auto-rotation
  useAnimationFrame((t, delta) => {
    if (!isInteracting) {
      rotateX.set(rotateX.get() + delta * 0.012);
      rotateY.set(rotateY.get() + delta * 0.015);
    }
  });

  // Pan handlers for drag/swipe mapping to 3D rotation
  const handlePan = (e, info) => {
    setIsInteracting(true);
    rotateX.set(rotateX.get() - info.delta.y * 1.5);
    rotateY.set(rotateY.get() + info.delta.x * 1.5);
  };

  const handlePanEnd = () => {
    setIsInteracting(false);
  };

  // Aesthetic specific variables for strict monochrome & glassmorphism
  const faceStyle = "absolute inset-0 flex flex-col items-center justify-center border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-black/60 backdrop-blur-md rounded-2xl shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] cursor-pointer transition-all duration-500 hover:bg-white/90 dark:hover:bg-slate-900/90 group hover:shadow-[0_0_30px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:border-slate-400 dark:hover:border-slate-500 overflow-hidden select-none";
  
  const iconStyle = "h-16 w-16 sm:h-20 sm:w-20 text-slate-800 dark:text-slate-200 group-hover:scale-110 group-hover:drop-shadow-[0_0_15px_rgba(0,0,0,0.3)] dark:group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] transition-all duration-300 pointer-events-none";
  const labelStyle = "text-sm sm:text-base font-bold mt-4 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors duration-300 uppercase tracking-widest pointer-events-none";

  // Base size mappings (responsive scale is handled by the parent container sizing, but here we define the strict 3D parameters)
  const size = 220; // 220px cube face
  const half = size / 2;

  return (
    <div 
      className="relative flex items-center justify-center w-full my-6 sm:my-8" 
      style={{ perspective: 1200, height: size * 1.5 }}
    >
      <motion.div
        className="relative cursor-grab active:cursor-grabbing"
        style={{
          width: size,
          height: size,
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          touchAction: "none" // essential for smooth swipe on mobile
        }}
        onPanSessionStart={() => setIsInteracting(true)}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        onMouseEnter={() => setIsInteracting(true)}
        onMouseLeave={() => setIsInteracting(false)}
      >
        {/* Front Face - App Logo */}
        <div 
          className={faceStyle} 
          style={{ transform: `rotateY(0deg) translateZ(${half}px)` }}
        >
          <img src="/unitrack-logo.png" alt="UniTrack Logo" className={`${iconStyle} object-contain`} draggable={false} />
          <span className={labelStyle}>UniTrack</span>
        </div>

        {/* Right Face - Attendance */}
        <div 
          className={faceStyle} 
          style={{ transform: `rotateY(90deg) translateZ(${half}px)` }}
        >
          <ClipboardCheck className={iconStyle} strokeWidth={1.5} />
          <span className={labelStyle}>Attendance</span>
        </div>

        {/* Back Face - Tasks */}
        <div 
          className={faceStyle} 
          style={{ transform: `rotateY(180deg) translateZ(${half}px)` }}
        >
          <CheckSquare className={iconStyle} strokeWidth={1.5} />
          <span className={labelStyle}>Tasks</span>
        </div>

        {/* Left Face - Expenses */}
        <div 
          className={faceStyle} 
          style={{ transform: `rotateY(-90deg) translateZ(${half}px)` }}
        >
          <Wallet className={iconStyle} strokeWidth={1.5} />
          <span className={labelStyle}>Expenses</span>
        </div>

        {/* Top Face - Marks */}
        <div 
          className={faceStyle} 
          style={{ transform: `rotateX(90deg) translateZ(${half}px)` }}
        >
          <Award className={iconStyle} strokeWidth={1.5} />
          <span className={labelStyle}>Marks</span>
        </div>

        {/* Bottom Face - Timetable */}
        <div 
          className={faceStyle} 
          style={{ transform: `rotateX(-90deg) translateZ(${half}px)` }}
        >
          <Calendar className={iconStyle} strokeWidth={1.5} />
          <span className={labelStyle}>Schedule</span>
        </div>
      </motion.div>
    </div>
  );
}
