# 🔴 DATA NOT RETAINED - ROOT CAUSE FOUND

## Problem

**Backend server is NOT running!**

The frontend is trying to save data to the backend API, but the backend server isn't started, so:

- ❌ API calls fail silently
- ❌ Data doesn't get saved to MySQL
- ❌ On page refresh, data is lost

## Solution

### Step 1: Start the Backend Server

**Option A - Using Batch File:**

```
Double-click: d:\Trackify\frontend\START-BACKEND.bat
```

**Option B - Manual Command:**

```bash
cd d:\Trackify\frontend\student-management\student-management
mvn spring-boot:run
```

**Wait for this message:**

```
Started StudentManagementApplication in X.XXX seconds
```

### Step 2: Verify Backend is Running

Open a new terminal and run:

```bash
cd d:\Trackify\frontend
node test-backend.js
```

Should show: `✅ Backend is running!`

### Step 3: Start Frontend

**Option A - Using Batch File:**

```
Double-click: d:\Trackify\frontend\START-FRONTEND.bat
```

**Option B - Manual Command:**

```bash
cd d:\Trackify\frontend
npm run dev
```

### Step 4: Test Data Persistence

1. Open browser to http://localhost:5173
2. Login or create account
3. Add some data (attendance, subjects, etc.)
4. Refresh the page
5. Data should now persist! ✅

## Why This Happens

When backend is not running:

- Frontend API calls fail with `ECONNREFUSED` error
- Error is caught but data isn't saved
- Frontend falls back to empty state on refresh

## Quick Check

**Is backend running?**

- Open http://localhost:8080/api/subjects/student/1
- If you see JSON or "404" → Backend is running ✅
- If you see "Can't reach this page" → Backend is NOT running ❌

## Common Issues

**Backend won't start?**

1. Check MySQL is running
2. Verify database `trackify_db` exists
3. Check port 8080 is free
4. Look for errors in backend console

**Data still not saving?**

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try adding data
4. Check for failed API requests (red status)
5. Click on failed request to see error details
