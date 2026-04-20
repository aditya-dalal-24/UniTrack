import React, { useState, useRef, useLayoutEffect, cloneElement, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * An adaptive-width navigation bar with a "limelight" effect that highlights the active item.
 * Adapted for UniTrack (JavaScript + React Router)
 */
export const LimelightNav = ({
  items = [],
  onTabChange,
  className = "",
  limelightClassName = "",
  iconContainerClassName = "",
  iconClassName = "",
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Memoize active index to avoid flickering
  const activeIndex = useMemo(() => {
    const index = items.findIndex(item => {
      if (!item.to) return false;
      // Exact match or sub-route match
      return location.pathname === item.to || location.pathname.startsWith(item.to + "/");
    });
    return index !== -1 ? index : 0;
  }, [items, location.pathname]);

  const [isReady, setIsReady] = useState(false);
  const navItemRefs = useRef([]);
  const limelightRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!mounted || items.length === 0) return;

    const updateLimelight = () => {
      const limelight = limelightRef.current;
      const activeItem = navItemRefs.current[activeIndex];
      
      if (limelight && activeItem) {
        // Use offsetLeft but also check getBoundingClientRect for backup if needed
        const newLeft = activeItem.offsetLeft + activeItem.offsetWidth / 2 - limelight.offsetWidth / 2;
        
        limelight.style.left = `${newLeft}px`;

        if (!isReady) {
          // Double frame to ensure CSS transitions don't interfere with initial snap
          requestAnimationFrame(() => {
            requestAnimationFrame(() => setIsReady(true));
          });
        }
      }
    };

    // Initial snap
    updateLimelight();

    // Secondary pass to catch any late layout adjustments
    const timeout = setTimeout(updateLimelight, 150);

    // Re-calculate on window resize
    window.addEventListener('resize', updateLimelight);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateLimelight);
    };
  }, [activeIndex, mounted, items.length, isReady]);

  if (items.length === 0) {
    return null; 
  }

  const handleItemClick = (index, item) => {
    if (item.to) {
      navigate(item.to);
    }
    if (item.onClick) {
      item.onClick();
    }
    if (onTabChange) {
      onTabChange(index);
    }
  };

  return (
    <nav className={`relative inline-flex items-center h-16 w-full rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur border px-2 ${className}`}>
      <div className="flex items-center justify-around w-full h-full relative">
        {items.map((item, index) => (
            <a
              key={item.id}
              ref={el => (navItemRefs.current[index] = el)}
              className={`relative z-20 flex h-full cursor-pointer flex-col items-center justify-center gap-1.5 flex-1 transition-all duration-300 ${
                activeIndex === index ? 'pt-1' : ''
              } ${iconContainerClassName}`}
              onClick={() => handleItemClick(index, item)}
              aria-label={item.label}
            >
              <div className="relative">
                {cloneElement(item.icon, {
                  className: `w-6 h-6 transition-all duration-300 ease-in-out ${
                    activeIndex === index ? 'opacity-100 scale-110 text-slate-900 dark:text-white' : 'opacity-40 text-slate-400 dark:text-slate-500'
                  } ${item.icon.props.className || ''} ${iconClassName || ''}`,
                })}
              </div>
              {item.label && (
                <span className={`text-[9px] uppercase tracking-[0.15em] font-bold transition-all duration-300 ${
                  activeIndex === index ? 'opacity-100 translate-y-0 text-slate-900 dark:text-white' : 'opacity-0 translate-y-1'
                }`}>
                  {item.label}
                </span>
              )}
            </a>
        ))}

        <div 
          ref={limelightRef}
          className={`absolute top-0 z-10 w-11 h-[5px] rounded-full bg-slate-900 dark:bg-white shadow-[0_50px_15px_rgba(0,0,0,0.1)] dark:shadow-[0_50px_15px_rgba(255,255,255,0.1)] ${
            isReady ? 'transition-[left] duration-400 ease-in-out' : ''
          } ${limelightClassName}`}
          style={{ left: '-999px' }}
        >
          <div className="absolute left-[-30%] top-[5px] w-[160%] h-14 [clip-path:polygon(5%_100%,25%_0,75%_0,95%_100%)] bg-gradient-to-b from-slate-900/10 dark:from-white/10 to-transparent pointer-events-none" />
        </div>
      </div>
    </nav>
  );
};
