import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

/**
 * useNotificationScheduler
 * 
 * Periodically checks various data sources (offline cached) to trigger local alerts.
 */
export default function useNotificationScheduler() {
  const [permission, setPermission] = useState(Notification.permission);
  const navigate = useNavigate();
  
  // Track alerted keys so we don't spam the user
  const alertedKeys = useRef(new Set());

  const requestPermission = async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      setPermission('granted');
      return true;
    }
    if (Notification.permission !== 'denied') {
      const p = await Notification.requestPermission();
      setPermission(p);
      return p === 'granted';
    }
    return false;
  };

  useEffect(() => {
    if (permission !== 'granted') return;

    const checkAlerts = async () => {
      try {
        const todayStr = new Date().toDateString();
        
        // 1. CLASS REMINDERS
        if (localStorage.getItem('notify_classes') !== 'false') {
          const res = await api.getTimetable();
          if (res.data) {
            const now = new Date();
            const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
            const todaysSlots = res.data.filter(slot => slot.dayOfWeek.toUpperCase() === days[now.getDay()]);

            for (const slot of todaysSlots) {
              const [hours, minutes] = slot.startTime.split(':').map(Number);
              const slotTime = new Date();
              slotTime.setHours(hours, minutes, 0, 0);

              const timeDiffMinutes = (slotTime.getTime() - now.getTime()) / (1000 * 60);
              const key = `class-${slot.id}-${todayStr}`;

              if (timeDiffMinutes <= 5 && timeDiffMinutes >= -2 && !alertedKeys.current.has(key)) {
                alertedKeys.current.add(key);
                triggerNotification(
                  `Attending ${slot.subjectName || 'Class'}?`,
                  `Your class ${slot.courseCode ? `(${slot.courseCode}) ` : ''}starts at ${slot.startTime}. Mark your attendance!`,
                  '/schedule',
                  [{ action: 'mark', title: 'Mark Attendance' }]
                );
              }
            }
          }
        }

        // 2. TASK ALERTS (Due Today)
        if (localStorage.getItem('notify_tasks') !== 'false') {
          const res = await api.getTasks();
          if (res.data) {
            const todayISO = new Date().toISOString().split('T')[0];
            const dueToday = res.data.filter(t => t.dueDate === todayISO && t.status !== 'COMPLETED');
            const key = `tasks-${todayStr}`;
            
            if (dueToday.length > 0 && !alertedKeys.current.has(key)) {
              alertedKeys.current.add(key);
              triggerNotification(
                'Tasks Due Today!',
                `You have ${dueToday.length} task(s) pending for today. Don't forget to complete them!`,
                '/tasks'
              );
            }
          }
        }

        // 3. ATTENDANCE WARNINGS (< 75%)
        if (localStorage.getItem('notify_attendance') !== 'false') {
          const res = await api.getDashboard();
          if (res.data && res.data.subjects) {
            const lowSubjects = res.data.subjects.filter(s => {
              if (s.totalClasses === 0) return false;
              return ((s.attendedClasses / s.totalClasses) * 100) < 75;
            });
            const key = `attendance-${todayStr}`;

            if (lowSubjects.length > 0 && !alertedKeys.current.has(key)) {
              alertedKeys.current.add(key);
              triggerNotification(
                'Low Attendance Alert',
                `Your attendance is below 75% in ${lowSubjects.length} subject(s).`,
                '/schedule'
              );
            }
          }
        }

        // 4. FEE DEADLINES (Due within 3 days)
        if (localStorage.getItem('notify_fees') !== 'false') {
          const res = await api.getFees();
          if (res.data) {
            const pendingFees = res.data.filter(f => f.status !== 'PAID');
            let approachingCount = 0;
            const now = new Date();

            for (const fee of pendingFees) {
              const dueDate = new Date(fee.dueDate);
              const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              if (daysDiff >= 0 && daysDiff <= 3) {
                approachingCount++;
              }
            }
            
            const key = `fees-${todayStr}`;
            if (approachingCount > 0 && !alertedKeys.current.has(key)) {
              alertedKeys.current.add(key);
              triggerNotification(
                'Fee Deadline Approaching',
                `You have ${approachingCount} fee(s) due within the next 3 days.`,
                '/fees'
              );
            }
          }
        }

      } catch (err) {
        console.error("Notification scheduler error:", err);
      }
    };

    // Run immediately, then every 60 seconds
    checkAlerts();
    const intervalId = setInterval(checkAlerts, 60000);

    return () => clearInterval(intervalId);
  }, [permission]);

  const triggerNotification = (title, body, url, actions = []) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          vibrate: [200, 100, 200],
          data: { url },
          actions
        });
      });
    } else {
      const notification = new Notification(title, { body, icon: '/icons/icon-192x192.png' });
      notification.onclick = () => {
        window.focus();
        navigate(url);
      };
    }
  };

  return { permission, requestPermission };
}
