# UniTrack PWA Architecture & Documentation

This document summarizes the major architectural changes and features implemented during the conversion of UniTrack into an offline-first Progressive Web App (PWA).

## 1. PWA Foundation & Service Worker
* **File:** `vite.config.js`
* **Implementation:** We integrated `vite-plugin-pwa` to generate a Service Worker and `manifest.json`.
* **Key Features:**
  * Configured `registerType: 'prompt'` to allow users to control when they update the app.
  * Defined Workbox caching strategies to aggressively cache static assets (HTML, JS, CSS, images).
  * Automatically generates necessary iOS and Android meta tags for standalone home-screen installation.

## 2. Offline Sync Engine (IndexedDB)
* **File:** `src/services/offlineManager.js`
* **Implementation:** Built a custom IndexedDB wrapper using the native browser `indexedDB` API (no external library) to handle persistent offline storage.
* **Key Features:**
  * **`mutationQueue` Store:** Saves any POST/PUT/DELETE requests made while offline so they can be synced later.
  * **`apiCache` Store:** Saves snapshots of all GET request responses. This allows the app to load instantly even if the browser is completely closed and reopened without internet.

## 3. Resilient API Interceptor
* **File:** `src/services/api.js`
* **Implementation:** Overhauled the Axios API service to seamlessly integrate with the `offlineManager`.
* **Key Features:**
  * **Fast Fallback:** Implemented a 2.5-second timeout on GET requests. If the network is spotty and takes longer than 2.5s, it instantly aborts the network call and falls back to the `apiCache` to prevent infinite loading spinners.
  * **Optimistic UI:** When offline, if a user performs an action (e.g., marking a task complete), the API interceptor catches the failed request, saves it to the `mutationQueue`, and returns a "mocked" successful HTTP 200 response to the React frontend so the UI updates instantly.
  * **Background Sync:** The app actively listens for the `online` window event and instantly flushes the `mutationQueue` to the server in the background.

## 4. PWA UI Components
* **Files:** `src/components/InstallPrompt.jsx`, `OfflineBanner.jsx`, `ReloadPrompt.jsx`
* **Implementation:** Added user-facing UI to manage the PWA lifecycle.
* **Key Features:**
  * **InstallPrompt:** Custom UI guiding iOS/Android users on how to "Add to Home Screen".
  * **OfflineBanner:** A sticky top banner that warns the user when they lose connection, and displays a "Syncing..." status when connection is restored.
  * **ReloadPrompt:** A toast notification that slides up when a new version of the app is deployed. It includes a `visibilitychange` listener to ensure it immediately checks for updates when the app is brought back to the foreground from the OS home screen.

## 5. Offline-Capable Notification Engine
* **Files:** `src/hooks/useNotificationScheduler.js`, `src/components/NotificationBanner.jsx`
* **Implementation:** Bypassed the need for a complex backend Push server by building a local polling engine that runs while the PWA is active.
* **Key Features:**
  * Fetches data from the instant offline IDB cache, meaning notifications work perfectly even without cellular reception.
  * Evaluates 4 metrics every 60 seconds:
    1. **Class Reminders:** 5 minutes before a lecture starts.
    2. **Task Alerts:** Tasks due today.
    3. **Attendance Warnings:** Subjects falling below 75%.
    4. **Fee Deadlines:** Fees due within the next 3 days.
  * Triggers native Android/Desktop system notifications using `ServiceWorkerRegistration.showNotification`.
  * **Anti-Spam:** Uses a Queue system to stagger notifications by 4 seconds if multiple fire at once, and uses `localStorage` (`alertedKeys`) to ensure daily alerts only fire once per day.

## 6. Notification Settings
* **File:** `src/pages/Profile.jsx`
* **Implementation:** Added a "Notification Preferences" UI.
* **Key Features:**
  * Users can individually toggle the 4 alert types on or off.
  * Preferences are persisted to `localStorage` and respected by the `useNotificationScheduler` engine.
