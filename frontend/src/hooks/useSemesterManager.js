import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export function useSemesterManager() {
  const { userData, updateUserData } = useAuth();
  const userId = userData?.userId || 'default';
  
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!userData) return;

    const checkSemesterChange = async () => {
      // 1. Get the configured change date (MM-DD)
      const changeDateStr = localStorage.getItem(`semester_change_date_${userId}`) || "06-01";
      const [targetMonth, targetDay] = changeDateStr.split('-').map(Number);
      
      const now = new Date();
      const currentYear = now.getFullYear();
      
      const today = new Date(currentYear, now.getMonth(), now.getDate());
      today.setHours(0, 0, 0, 0);
      
      const targetDateThisYear = new Date(currentYear, targetMonth - 1, targetDay);
      targetDateThisYear.setHours(0, 0, 0, 0);
      
      const diffTime = targetDateThisYear.getTime() - today.getTime();
      const daysAway = Math.round(diffTime / (1000 * 3600 * 24));
      
      const isExactDay = daysAway === 0;
      const isUpcoming = daysAway > 0 && daysAway <= 2;
      
      if (isExactDay) {
        const lastIncrementYear = localStorage.getItem(`last_semester_increment_year_${userId}`);
        const currentSem = parseInt(userData.semester) || 1;
        
        if (lastIncrementYear !== currentYear.toString()) {
          const newSem = currentSem + 1;
          try {
            const payload = {
              ...userData,
              rollNumber: userData.rollNumber || userData.enrolmentNumber || "",
              enrolmentNumber: userData.enrolmentNumber || userData.rollNumber || "",
              semester: newSem
            };
            const { error } = await api.updateProfile(payload);
            
            if (!error) {
              updateUserData({ semester: newSem });
              localStorage.setItem(`last_semester_increment_year_${userId}`, currentYear.toString());
              setNotification({ type: 'changed', newSemester: newSem });
            }
          } catch (e) {
             console.error("Failed to auto-increment semester:", e);
          }
        } else {
           // We already incremented today, show the welcome banner for today.
           // To prevent it showing every time they refresh, we can check a dismissal flag,
           // but since dismissNotification clears state, it only shows once per mount anyway.
           setNotification({ type: 'changed', newSemester: currentSem });
        }
      } else if (isUpcoming) {
         const dateString = targetDateThisYear.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
         setNotification({ type: 'upcoming', dateString, daysAway });
      }
    };

    checkSemesterChange();
  }, [userData, userId, updateUserData]);

  const dismissNotification = () => setNotification(null);

  return { notification, dismissNotification };
}
