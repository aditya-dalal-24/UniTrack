# Trackify - Quick Start Guide

## 🚀 Start Your Application

### Option 1: Using Batch Scripts (Windows)

1. **Start Backend** (in one terminal):

   ```
   Double-click: d:\Trackify\frontend\START-BACKEND.bat
   ```

   Wait for "Started StudentManagementApplication" message

2. **Start Frontend** (in another terminal):
   ```
   Double-click: d:\Trackify\frontend\START-FRONTEND.bat
   ```
   Open browser to http://localhost:5173

### Option 2: Manual Start

**Terminal 1 - Backend:**

```bash
cd d:\Trackify\frontend\student-management\student-management
mvn spring-boot:run
```

**Terminal 2 - Frontend:**

```bash
cd d:\Trackify\frontend
npm run dev
```

## ✅ What's Integrated

Your frontend now communicates with the backend for:

- ✅ User authentication (signup/login)
- ✅ Attendance tracking
- ✅ Subject management
- ✅ Assignments
- ✅ Expenses
- ✅ Timetable
- ✅ Calendar events
- ✅ Todos
- ✅ Fees

## 📝 Test It Out

1. Create an account (data saves to MySQL)
2. Login with your credentials
3. Add subjects, mark attendance, create assignments
4. All data persists in the database!

## 🔧 Troubleshooting

**Backend won't start?**

- Ensure MySQL is running
- Check port 8080 is free

**Frontend can't connect?**

- Verify backend is running on port 8080
- Check browser console for errors

**Need help?**

- Check [`walkthrough.md`](file:///C:/Users/Asus/.gemini/antigravity/brain/5b73d32b-ea65-4dba-ac06-36a35420a814/walkthrough.md) for detailed documentation
- Run `node test-backend.js` to test connection
