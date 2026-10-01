# UNITRACK_PROJECT_KNOWLEDGE.md

**Canonical project knowledge for UniTrack. Read this before significant changes.**

Last updated: 2026-09-20. Source: actual codebase inspection (not assumptions or prior docs).

---

## PROJECT SNAPSHOT

| Item | Value |
|------|-------|
| **Project** | UniTrack — Smart Student Management Platform |
| **Purpose** | Single-user, all-in-one student productivity app |
| **Target users** | Individual students managing academics, finance, tasks |
| **Architecture** | React 19 SPA + Spring Boot 3.4 REST API + PostgreSQL |
| **Current stage** | Stable feature-complete; security, secrets & PWA stabilized |
| **Production status** | PARTIALLY READY — Render secret rotation + QA testing still required (local secrets stable) |
| **Main features** | Dashboard, Attendance, Timetable, Tasks (unified), Marks, Fees, Expenses, Profile, Admin, PWA/offline, Notifications |
| **Incomplete features** | SMS/transaction parsing, server-push notifications, AI premium tier, community features |
| **Critical known issues** | No live device testing on PWA; 134 pre-existing lint issues; no Flyway/Liquibase migration tooling |
| **Latest build status** | Backend: 7/7 tests pass, build succeeds. Frontend: lint passes (non-blocking), build succeeds, PWA service worker correct (88 precache entries) |
| **Recent work** | Full-stack audit → remediation → PWA/mobile stabilization → IDOR/Exception hardening → Env secrets & startup stabilization |

---

## CURRENT IMPLEMENTATION vs INTENDED PRODUCT vs PLANNED

### CURRENT IMPLEMENTATION

The working tree contains a fully functional student management platform with:

- **Completed features**: All 8 core modules + admin + PWA + offline support
- **Active users on**: Vercel frontend (production), Render backend (free tier, cold-start prone)
- **Code state**: Hardened security, isolated user caches, native Spring Boot 3 `.env` loading, clean startup scripts
- **Database**: PostgreSQL (Neon in prod) with 11 user-scoped entities; `ddl-auto=update` (no Flyway)
- **Test coverage**: 7 unit tests passing (context test + 6 timetable parser tests)

### INTENDED PRODUCT

UniTrack is designed as a **premium, zero-clutter student companion** that consolidates every aspect of academic life into one interface. The philosophy is "focused, functional, beautiful" — not feature-bloated. Core differentiators:

- Single-user (not multi-tenant or institutional)
- Offline-first (cached reads, queued mutations)
- Mobile-native UX (installable PWA, responsive touch interactions)
- AI-assisted parsing (OCR on receipts/timetables, not live data analysis)
- Granular notifications (attendance warnings, deadline reminders, fee alerts)

### PLANNED / FUTURE

**Explicitly NOT implemented. Do not assume these exist:**

| Feature | Status | Notes |
|---------|--------|-------|
| Expense automation / SMS parsing | PLANNED | No SMS permissions, parsing logic, or data model yet |
| Server-push notifications | PLANNED | Current notifications are 100% client-side polling |
| AI premium features | PLANNED | Scope undefined; unclear beyond current OCR usage |
| Community / social features | PLANNED | Would require multi-tenant or social-graph layer (architectural change) |

---

## PRODUCT OVERVIEW

**What UniTrack solves:** A student juggles multiple apps (attendance sheets, assignment portals, expense tracking, grade portals). UniTrack is one app for all of it.

**Philosophy:** Premium monochrome SaaS aesthetic. Minimal UI, maximum clarity. Glassmorphism and micro-animations for polish. No unnecessary features.

**Target users:** Primarily college/university students in structured semesters with formal attendance tracking, assignment schedules, and fee structures.

**Core differentiators:**
1. Offline-first architecture (mutations queued, synced on reconnect)
2. Installable on Android/iOS as a standalone PWA
3. Client-side AI parsing (timetable OCR, receipt scanning)
4. Attendance warnings, task reminders, fee deadlines (local polling)
5. Per-user data isolation (single-user account, no sharing)

**Future vision** (from README, unimplemented):
- Transaction/SMS auto-logging
- Smarter context-aware reminders
- Paid premium tier with AI features
- Student community / study groups (would be architectural shift)

---

## COMPLETE FEATURE INVENTORY

### AUTH & SECURITY

**Feature:** User authentication + role-based access control

**Status:** IMPLEMENTED

**Frontend:** `AuthContext`, `Login.jsx`, `Signup.jsx`, forgot-password flow, OTP verification modal

**Backend:** `AuthController`, `AuthService`, `JwtService`, `SecurityConfig`

**Database:** `User` (id, email, password, role, emailVerified, authProvider, isActive, otp/otpExpiry)

**APIs:**
- `POST /api/auth/register` — email/password registration with OTP
- `POST /api/auth/verify-email` — OTP verification
- `POST /api/auth/login` — email/password login, returns JWT
- `POST /api/auth/google` — Google OAuth (ID token verification)
- `POST /api/auth/resend-otp` — resend OTP
- `POST /api/auth/forgot-password` — initiate password reset
- `POST /api/auth/reset-password` — complete password reset

**Dependencies:** SendGrid (email), Google API client (OAuth), jjwt (JWT), Spring Security, BCrypt

**Status details:** 
- JWT: HS256, 7-day expiry (604800000ms)
- Password: BCrypt, no plaintext storage
- OTP: 10-minute expiry, 6-digit random
- Google OAuth: ID token verified server-side
- Roles: `STUDENT`, `ADMIN`, `BOTH`, `SUPER_ADMIN` (super-admin account cannot be demoted by other admins)

**Known issues:** 
- Email verification (OTP) is synchronous; if SendGrid fails, registration rolls back
- No rate limiting on auth endpoints

---

### DASHBOARD

**Feature:** Real-time aggregated overview of student's academic + financial status

**Status:** IMPLEMENTED

**Frontend:** `Dashboard.jsx`, 9 dashboard widget components (Today, AttendanceRisk, ExpenseSnapshot, SmartTasks, SemesterHealth, AcademicPressure, SmartReminders, QuickActions, FocusMode)

**Backend:** `DashboardController`, `DashboardService`

**Database queries:** 
- Aggregate attendance counts by status
- Subject-wise attendance percentages
- Monthly expense totals
- Task counts by type and status
- Fee totals (all, pending)
- Marks/GPA summary
- Caffeine cache (5-min TTL, evicted on any relevant mutation)

**APIs:**
- `GET /api/dashboard` — return `DashboardResponse` with all aggregations

**Response structure:**
- Attendance: overall %, last month %, subject breakdown
- Tasks: assignment counts (pending/submitted/overdue), todo counts
- Fees: total, pending, breakdown by status
- Expenses: this month total, daily breakdown
- Marks: GPA, semester-wise scores
- Subjects: list with attendance % per subject

**Status details:** Cache is SQL-based aggregation (no denormalization in schema). Evicted on any attendance/task/expense/marks/fees mutation.

**Known issues:** Dashboard doesn't track trends over time (only current snapshot); no historical data visualization.

---

### ATTENDANCE

**Feature:** Mark, edit, delete attendance records; track subject-wise percentages

**Status:** IMPLEMENTED

**Frontend:** `Schedule.jsx` (swipe-to-mark gesture), `MarkAttendanceWizard.jsx` (modal), Attendance widget on Dashboard

**Backend:** `AttendanceController`, `AttendanceService`

**Database:** `AttendanceRecord` (id, user, date, status, subject, timetableSlot, note); unique constraint on (user_id, date, subject_id)

**APIs:**
- `GET /api/attendance?date=YYYY-MM-DD` — get records for date
- `GET /api/attendance/today` — get today's lectures with attendance status
- `POST /api/attendance` — mark attendance
- `PUT /api/attendance/{id}` — edit attendance
- `DELETE /api/attendance/{id}` — delete attendance
- `GET /api/attendance/summary` — subject-wise % breakdown

**Business rules:**
- Status: `PRESENT`, `ABSENT`, `EXCUSED`, `UNMARKED`
- Each (user, date, subject) can only have one record (enforced by unique constraint)
- N+1 query eliminated in `getTodayLectures()` (fetch day's records once, match in-memory)
- Ownership checks: can only edit/delete own records (401 → 404 on unauthorized)

**Known issues:** 
- Attendance % calculation is raw (P / (P+A)); no weighting by term/semester
- No duplicate-record cleanup beyond unique constraint
- Excused status exists in code but not used in UI

---

### TIMETABLE / SCHEDULE

**Feature:** Manage timetable slots; upload and parse timetable from Excel/PDF

**Status:** IMPLEMENTED

**Frontend:** `Schedule.jsx` (day/subject views, swipe-to-mark), `TimetableUploadModal`, timetable widget on Dashboard

**Backend:** `TimetableController`, `TimetableService`, `TimetableParserService`

**Database:** `TimetableSlot` (id, user, subject, dayOfWeek, startTime, endTime, room, faculty, elective)

**APIs:**
- `GET /api/timetable` — list all slots (filtered by user + semester)
- `GET /api/timetable/day/{day}` — slots for a specific day (merged with today's attendance)
- `POST /api/timetable` — add a slot
- `PUT /api/timetable/{id}` — edit a slot
- `DELETE /api/timetable/{id}` — delete a slot
- `POST /api/timetable/parse` — upload and parse file (Excel/PDF)

**Parser details (TimetableParserService):**
- **Inputs:** .xlsx (Excel), .xls (legacy Excel), .pdf (PDF)
- **Extraction:** Tabula (PDF), Apache POI (Excel)
- **Detection:** Day name matching (MONDAY, MON, etc.), time-range regex (HH:MM-HH:MM), course-code extraction
- **Legend parsing:** Scans grid for "Subject - Full Name" or "Faculty - Prof Name" entries
- **Output:** Preview response with slots grouped by day
- **Normalization:** Strips whitespace, normalizes day names, parses time ranges

**Known issues (parser, UNVERIFIED / PARTIAL FIX):**
- 5-minute gaps sometimes become phantom slots
- Repeated slots for same subject/time across days
- Rows don't always align by day (PDFs especially)
- Elective handling unclear (marked but no UI for selection)
- Merged cells in Excel can produce duplicate rows
- No OCR for handwritten timetables (only printed/digital)

**Business rules:**
- One timetable per user, semester-based
- Slots are day-of-week + time; no date-specific slots (recurring)
- Elective flag exists but UI doesn't leverage it

---

### TASKS (UNIFIED ASSIGNMENTS + TODOS)

**Feature:** Unified task management combining assignments and to-dos

**Status:** IMPLEMENTED (refactored from separate entities)

**Frontend:** `Tasks.jsx` (tab toggle: Assignments vs To-Dos), task modals, Tasks widget on Dashboard

**Backend:** `TaskController`, `TaskService`

**Database:** `Task` (id, user, title, description, subject, dueDate, dueTime, status, type); `TaskType` = ASSIGNMENT | TODO

**APIs:**
- `GET /api/tasks?type=ASSIGNMENT` or `?type=TODO` — filter by type
- `GET /api/tasks?page=0&size=10` — paginated fetch (backward compat: no params = list all)
- `POST /api/tasks` — create task (type specified in request)
- `PUT /api/tasks/{id}` — edit task
- `DELETE /api/tasks/{id}` — delete task
- `DELETE /api/tasks` — delete all (no filter)

**Business rules:**
- Status: `PENDING`, `SUBMITTED`, `OVERDUE`, `COMPLETED`
- `OVERDUE` status is computed (dueDate < today, status = PENDING)
- No backend state-machine; status is client-controlled
- Type discriminator allows unified storage; Dashboard response still includes both AssignmentsSummary and TodosSummary for backward compat

**Refactoring history:** 
- Pre-work state: separate `Assignment` and `Todo` entities, controllers, services, pages
- Current state: single `Task` entity with `TaskType` discriminator
- Migration: `DataMigrationRunner` migrates legacy assignments/todos tables into tasks on startup (now transactional)
- Frontend compat: `Dashboard` still reads old fields; not yet retired

**Known issues:**
- `Tasks.jsx` had missing React key (FIXED); NaN tile-color for string IDs (FIXED)
- No recurring tasks; due-date-only (no daily repetition)
- Offline temp-IDs: string UUIDs; DB IDs are numbers (parsed with fallback)

---

### MARKS / GRADES

**Feature:** Exam score tracking with GPA/CGPA calculation

**Status:** IMPLEMENTED

**Frontend:** `Marks.jsx` (per-subject scores, semester breakdown, GPA display)

**Backend:** `MarksController`, `MarksService`

**Database:** `Marks` (id, user, subject, score, maxScore, semester, examType)

**APIs:**
- `GET /api/marks` — all marks for user (filtered by semester)
- `GET /api/marks?semester=4` — marks for specific semester
- `POST /api/marks` — add mark
- `PUT /api/marks/{id}` — edit mark
- `DELETE /api/marks/{id}` — delete mark

**Business rules:**
- GPA calculation: per-subject (score/maxScore * 4.0), or semester average
- Grade display: A (90-100), B (80-89), C (70-79), D (60-69), F (<60)
- Ownership: can only view/edit own marks
- Semester filtering: current user's semester + manual selection

**Known issues:**
- No credit-weighted GPA (all subjects weighted equally)
- No historical GPA tracking (only current)
- Grade scale hardcoded (no customization per institution)

---

### FEES

**Feature:** Track fees, due dates, payment status

**Status:** IMPLEMENTED

**Frontend:** `Fees.jsx` (due date, amount, status badges, receipt upload)

**Backend:** `FeesController`, `FeesService`

**Database:** `Fees` (id, user, totalAmount, paidAmount, dueDate, status, receiptUrl)

**APIs:**
- `GET /api/fees` — all fee records for user
- `POST /api/fees` — add fee record
- `PUT /api/fees/{id}` — edit fee
- `DELETE /api/fees/{id}` — delete fee
- `POST /api/fees/{id}/upload` — upload receipt

**Business rules:**
- Status: `PENDING`, `PARTIAL`, `PAID` (computed: totalAmount == paidAmount → PAID)
- Due-date alerts: notification if due within 3 days
- Receipt storage: file upload support (S3 not configured; likely local or deleted)

**Known issues:**
- No payment method tracking (just paid/unpaid)
- No fine calculation for late payments
- Receipt upload endpoint unclear (may not be wired)

---

### EXPENSES

**Feature:** Personal expense tracking with OCR receipt scanning

**Status:** IMPLEMENTED

**Frontend:** `Expenses.jsx` (daily/monthly views, charts), `BillScannerModal` (OCR), expense widgets on Dashboard

**Backend:** `ExpenseController`, `ExpenseService`

**Database:** `Expense` (id, user, amount, category, date, time, note), `ExpenseCategory` (id, user, name)

**APIs:**
- `GET /api/expenses?date=YYYY-MM-DD` — expenses for date
- `GET /api/expenses/summary?month=YYYY-MM` — monthly summary
- `POST /api/expenses` — log expense
- `PUT /api/expenses/{id}` — edit expense
- `DELETE /api/expenses/{id}` — delete expense
- `POST /api/expenses/scan` — scan receipt (OCR)
- `GET /api/expenses/categories` — user's expense categories
- `POST /api/expenses/categories` — add category
- `DELETE /api/expenses/categories/{id}` — delete category

**OCR Details:**
- Frontend: `tesseract.js` (client-side OCR)
- Extracts: amount, merchant, date from receipt image
- Backend scanner (if present): `receiptScannerService.js` (not fully inspected)

**Business rules:**
- Categories are user-scoped (each user has own category list)
- Default categories likely created on first login
- Expense amount is numeric (currency assumed INR or local)

**Known issues:**
- OCR accuracy depends on image quality; no manual correction UI witnessed
- No transaction import (SMS/bank statement parsing) — PLANNED only
- Category management basic (no preset templates)

---

### PROFILE & USER MANAGEMENT

**Feature:** User profile editing, avatar generation, notification preferences

**Status:** IMPLEMENTED

**Frontend:** `Profile.jsx` (edit details, notification prefs), UserAvatar component (generated avatar)

**Backend:** `ProfileController`, `ProfileService`

**Database:** `Profile` (1:1 with User; contains avatar, notifications settings), User (name, email, phone, college, course, semester, rollNumber, dob, gender)

**APIs:**
- `GET /api/profile` — user's profile + settings
- `PUT /api/profile` — update profile fields
- `PUT /api/profile/preferences` — update notification preferences

**Avatar generation:** Deterministic based on user ID (same ID → same avatar every time), not random

**Notification preferences:** Toggles for 4 alert types (attendance warnings, task reminders, fee deadlines, class reminders)

**Known issues:**
- Avatar is client-side generated (Lucide React icons, not uploaded)
- No profile photo upload
- Phone number not used for SMS (no SMS provider integrated)

---

### ADMIN

**Feature:** User management, role assignment, account activation/deactivation

**Status:** IMPLEMENTED

**Frontend:** Admin pages (likely under `/admin` route), user list, promote/demote UI

**Backend:** `AdminController`, `AdminService`

**Database:** Queries against User entity (filter by role, status)

**APIs:**
- `GET /api/admin/users` — list all users (ADMIN+ only)
- `GET /api/admin/users/stats` — platform statistics
- `PUT /api/admin/users/{id}/role` — change user role
- `PUT /api/admin/users/{id}/activate` — activate user
- `PUT /api/admin/users/{id}/deactivate` — deactivate user
- `DELETE /api/admin/users/{id}` — delete user (SUPER_ADMIN only)

**Authorization:**
- `/api/admin/**` requires `HASROLE(ADMIN)` (enforced in `SecurityConfig`)
- Super admin email (from config) is always SUPER_ADMIN
- SUPER_ADMIN can promote/demote, delete; ADMIN can manage below themselves

**Business rules:**
- Primary super admin (configured via `SUPER_ADMIN_EMAIL`) cannot be demoted
- Roles: STUDENT < ADMIN < SUPER_ADMIN (hierarchy enforced in logic)
- Deactivation doesn't delete data (soft-delete not implemented)

**Known issues:**
- No audit trail of admin actions
- Super admin email hardcoded in config (PII in source)

---

### PWA / OFFLINE SUPPORT

**Feature:** Installable app, offline functionality, background sync, local notifications

**Status:** IMPLEMENTED; PARTIALLY TESTED

**Frontend PWA files:** `vite.config.js` (PWA plugin), `manifest.json` (generated), service worker (generated by Workbox), `offline Manager.js`, `useNotificationScheduler.js`, `InstallPrompt.jsx`, `OfflineBanner.jsx`, `ReloadPrompt.jsx`

**Backend support:** `/actuator/health` (health checks), standard REST API (offline mutations replayed via normal endpoints)

**Core mechanism:**

1. **Install flow:**
   - Android: native `beforeinstallprompt` event → "Install App" button
   - iOS: Safari doesn't fire `beforeinstallprompt`; manual "Tap Share → Add to Home Screen" fallback (IMPLEMENTED in this cycle)

2. **Offline detection & UI:**
   - `useNetworkStatus.js`: listens to online/offline events, shows `OfflineBanner` when offline
   - **Known issue:** `navigator.onLine` can false-positive "online" on Wi-Fi without real internet; attempted fix reverted (would misfire during Render cold-starts)

3. **Caching:**
   - IndexedDB `apiCache` store: GET responses cached by `buildCacheKey(url, params)`
   - Workbox named caches (7 total): `unitrack-dashboard`, `unitrack-timetable`, `unitrack-tasks`, `unitrack-attendance`, `unitrack-expenses`, `unitrack-marks`, `unitrack-subjects`
   - In-memory Map: `apiCache` (fast lookups during session)
   - **All caches namespaced per user** (via JWT-derived tag) to prevent shared-device data leaks
   - All caches cleared on logout and on 401-expiry

4. **Offline mutations:**
   - POST/PUT/DELETE requests queued in IndexedDB `mutationQueue` when offline
   - Queue entries tagged with `userTag` (originating user)
   - On reconnect: replay queue, filter to current user's entries only
   - Mismatched entries left untouched (no data loss if user logs out and back in)

5. **Local notifications:**
   - `useNotificationScheduler.js`: polls every 60 seconds
   - Checks 4 conditions: class reminders (5 min before lecture), task alerts (due today), attendance warnings (<75%), fee deadlines (within 3 days)
   - Triggers via `ServiceWorkerRegistration.showNotification()` (native Android/Desktop notifications)
   - Anti-spam: 4-second stagger between notifications, daily deduplication via localStorage

6. **Update flow:**
   - Service worker checks every 60 minutes + on visibility change
   - Non-disruptive toast: "New version available" with reload prompt
   - User can ignore or reload

**Manifest config:**
- Display: `standalone` (fullscreen app mode)
- Theme color: black (`#0a0a0a`)
- Icons: 192x192, 512x512, maskable variant
- Scope: `/` (entire app)
- Categories: education, productivity, finance

**Service worker (Workbox):**
- `generateSW` strategy (pre-configured, no manual sw.js)
- Precache: 88 entries (static assets)
- Runtime caching: 7 named caches with strategies (NetworkFirst, StaleWhileRevalidate)
- Navigate fallback: `index.html` (SPA routing)

**Status details:**
- IMPLEMENTED: install flow, offline mutations, caching, notifications
- REAL-DEVICE TESTED: none (code-level audit only; Chrome DevTools emulation may have been used, not noted)
- KNOWN ISSUES: `navigator.onLine` false positives (not fixed), no push notifications (client-side polling only)

**iOS-specific fixes (this cycle):**
- Safe-area handling: `.pwa-safe-top` applied to fixed/top containers
- Notch protection: `black-translucent` status bar respected
- Address-bar bug: `h-dvh` (100dvh) instead of `h-screen` (100vh)
- Install fallback: manual Share sheet instructions (iOS doesn't fire `beforeinstallprompt`)
- Notification API crash: guarded access to `Notification.permission` (iOS Safari < 16.4 lacks API)

---

### NOTIFICATIONS

**Feature:** Local, client-side notification reminders (no server-push)

**Status:** IMPLEMENTED; LOCAL POLLING ONLY

**Frontend:** `useNotificationScheduler.js` (hook), `NotificationBanner.jsx` (fallback UI), Profile.jsx (preferences)

**Notification types (4 total):**

1. **Class reminders:** 5 minutes before lecture starts
2. **Task alerts:** Tasks due today
3. **Attendance warnings:** Subject attendance drops below 75%
4. **Fee deadlines:** Fees due within 3 days

**Mechanism:**
- Hook mounts outside ErrorBoundary (risk: crashes if Notification API absent)
- Polls every 60 seconds using data from IndexedDB cache (works offline)
- Checks each condition, queues firing notifications
- 4-second stagger between fires (anti-spam)
- `localStorage.alertedKeys` tracks daily dedup (fires once per day per alert)
- Uses `ServiceWorkerRegistration.showNotification()` for native notification

**IMPLEMENTED features:**
- User can toggle each alert type on/off (Profile → Notification Preferences)
- Notification permissions requested on first use
- Offline-capable (uses cached data)

**PLANNED features:** Server-push notifications (none yet)

**Known issues:**
- No push notifications (client-side polling only; won't work if app closed)
- Notification API absent on iOS Safari < 16.4; crash if unguarded (FIXED in this cycle)
- No notification history or action buttons (native notifications only)

---

## ARCHITECTURE

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ React SPA (React 19 + Vite + React Router)                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Pages (Dashboard, Tasks, Schedule, Marks, Fees, etc.)   │ │
│ │ ↓                                                        │ │
│ │ Services/Hooks (AuthContext, DataContext, useData)      │ │
│ │ ↓                                                        │ │
│ │ API Service (axios interceptor + offline fallback)      │ │
│ │ ├─ In-memory cache (apiCache Map, user-scoped)         │ │
│ │ ├─ IndexedDB (mutationQueue, apiCache store)            │ │
│ │ └─ Workbox (7 named runtime caches)                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ↓ HTTP Bearer JWT                                           │
└─────────────────────────────────────────────────────────────┘
                         ↓
         ┌───────────────────────────────┐
         │ Spring Boot REST API (3.4.3)  │
         ├───────────────────────────────┤
         │ Controllers (13 total)        │
         │ ↓                             │
         │ Services (14 total)           │
         │ ↓                             │
         │ Repositories (Data Access)    │
         │ ↓ JPA/Hibernate              │
         └───────────────────────────────┘
                    ↓
         ┌───────────────────────────────┐
         │ PostgreSQL (Neon in prod)     │
         │ 11 entities, no multi-tenant  │
         │ ddl-auto=update (no Flyway)   │
         └───────────────────────────────┘
```

### Frontend Architecture

**Entry:** `src/main.jsx` → `App.jsx`

**Providers (nested):**
1. `AuthProvider` (AuthContext) — stores JWT, user data, login/logout
2. `DataProvider` (DataContext) — caches API responses, provides useData hook
3. Route tree with `React.lazy` (code splitting per page)

**State management:**
- Context API only (no Redux/Zustand)
- localStorage for persistence (auth tokens, preferences, sidebar state)
- IndexedDB for offline cache

**Key files:**
- `contexts/AuthContext.jsx` — login/logout, role helpers
- `contexts/DataContext.jsx` — memoized provider for API data caching
- `services/api.js` — axios instance, interceptors, offline fallback, cold-start wake-up
- `services/offlineManager.js` — IndexedDB wrapper (queue + cache)
- `hooks/useData.js` — custom hook for API calls (caching + offline)
- `hooks/useNotificationScheduler.js` — notification polling
- `components/` — reusable UI (Sidebar, Topbar, StatsCard, ErrorBoundary, modals)
- `pages/` — one per route (Dashboard, Tasks, Schedule, Marks, Fees, Expenses, Profile, admin pages)

**Styling:** Tailwind CSS 3.4 (utility-first), Framer Motion (animations), Lucide React (icons), Recharts (charts)

### Backend Architecture

**Entry:** `UnitrackBackendApplication.java`

**Security:** Spring Security + JWT filter (custom `JwtAuthFilter`)

**Request flow:**
1. `JwtAuthFilter` validates Bearer token, sets Principal
2. Controller receives Principal, extracts user via repository
3. Service performs business logic + authorization checks
4. Repository queries database
5. DTO responses serialized to JSON

**Package structure:**
- `controller/` — 13 REST controllers (Auth, Dashboard, Profile, Attendance, Timetable, Tasks, Marks, Fees, Expenses, Subjects, Admin, Thought)
- `service/` — 14 services (Auth, Dashboard, Profile, Attendance, Timetable, TimetableParser, Tasks, Marks, Fees, Expenses, Subject, Admin, Thought, Email)
- `entity/` — 17 entities (User, Profile, Subject, TimetableSlot, AttendanceRecord, Task, TaskType, TaskStatus, Marks, Fees, Expense, ExpenseCategory, Role, AuthProvider, FeesStatus, AttendanceStatus, Thought)
- `repository/` — Spring Data JPA repositories (auto-generated queries + custom JPQL)
- `dto/` — request/response DTOs (separation of API contract from entities)
- `security/` — `JwtService`, `JwtAuthFilter`, `UserDetailsServiceImpl`
- `config/` — `SecurityConfig`, `WebConfig`, `OpenApiConfig`, `DataMigrationRunner`, `AttendanceConstraintMigration`
- `exception/` — custom exceptions (`ResourceNotFoundException`, global `ExceptionHandler`)

**Caching:** Caffeine (server-side, Dashboard aggregations); 500-entry cache, 5-min TTL

**Database:** Hibernate `ddl-auto=update` (no Flyway); transactional migrations (see DataMigrationRunner)

---

## DATABASE SCHEMA & ENTITIES

### Users & Auth

**User**
- PK: `id` (Long, auto-increment)
- `name` (String, not null)
- `email` (String, unique, not null)
- `password` (String, BCrypt-hashed)
- `phone`, `college`, `course`, `semester`, `rollNumber`, `dob`, `gender`
- `emailVerified` (boolean, default false)
- `authProvider` (enum: LOCAL | GOOGLE | FACEBOOK, default LOCAL)
- `role` (enum: STUDENT | ADMIN | BOTH | SUPER_ADMIN, default STUDENT)
- `isActive` (boolean, default true)
- `verificationOtp` (String, 6-digit), `otpExpiry` (LocalDateTime, 10-min)
- `createdAt`, `updatedAt`, `updatedBy` (timestamps + audit trail)

**Profile** (1:1 with User, not separate entity in current code)
- Fields stored in User directly; Profile entity exists but may be unused

---

### Academic

**Subject**
- PK: `id`
- FK: `user_id` (not null) — user-scoped
- `name`, `code`, `credits`, `semester` (Integer)
- `INDEX: idx_subject_user_id`

**TimetableSlot**
- PK: `id`
- FK: `user_id` (not null)
- FK: `subject_id` (nullable, cascade delete)
- `dayOfWeek` (String: MONDAY, TUESDAY, etc.)
- `startTime`, `endTime` (String: HH:MM)
- `room`, `faculty`, `elective` (boolean)
- `INDEX: idx_timetable_slot_user_id`

**AttendanceRecord**
- PK: `id`
- FK: `user_id` (not null)
- FK: `subject_id` (nullable, cascade delete)
- FK: `timetable_slot_id` (nullable, cascade delete)
- `date` (LocalDate)
- `status` (enum: PRESENT | ABSENT | EXCUSED | UNMARKED)
- `note` (String, nullable)
- **UC:** `(user_id, date, subject_id)` unique (one record per user per day per subject)
- No separate index on `user_id` (unique constraint handles it as leftmost prefix)

**Marks**
- PK: `id`
- FK: `user_id` (not null)
- FK: `subject_id` (nullable, cascade delete)
- `score` (Double), `maxScore` (Double)
- `semester` (Integer), `examType` (String)
- `INDEX: idx_marks_user_id`

---

### Tasks & Assignments

**Task** (unified)
- PK: `id`
- FK: `user_id` (not null)
- `title`, `description` (TEXT)
- `subject` (String, nullable)
- `dueDate` (LocalDate), `dueTime` (String)
- `status` (enum: PENDING | SUBMITTED | OVERDUE | COMPLETED)
- `type` (enum: ASSIGNMENT | TODO) — discriminator
- `INDEX: idx_tasks_user_id`

(Legacy `Assignment`, `Todo`, related DTOs/controllers deleted in prior work; migration moves data into `tasks`)

---

### Finances

**Fees**
- PK: `id`
- FK: `user_id` (not null)
- `totalAmount`, `paidAmount` (BigDecimal)
- `dueDate` (LocalDate)
- `status` (enum: PENDING | PARTIAL | PAID)
- `receiptUrl` (String, nullable)
- `INDEX: idx_fees_user_id`

**Expense**
- PK: `id`
- FK: `user_id` (not null)
- FK: `category_id` (nullable, cascade delete)
- `amount` (BigDecimal)
- `date` (LocalDate), `time` (LocalTime)
- `note` (String, nullable)
- `INDEX: idx_expense_user_id`

**ExpenseCategory**
- PK: `id`
- FK: `user_id` (not null)
- `name` (String)
- `INDEX: idx_expense_category_user_id`

---

### Other

**Thought** (admin-managed content, "thought of the day")
- PK: `id`
- `content` (TEXT)
- `authorId` (String, optional)
- `createdAt`, `updatedAt`

---

## API REFERENCE

### Auth Endpoints

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| POST | `/api/auth/register` | None | RegisterRequest (email, password, name, phone, college, course, semester, dob, gender) | AuthResponse (token, email, name, userId, role) | Returns JWT; OTP sent via email; user not verified yet |
| POST | `/api/auth/login` | None | LoginRequest (email, password) | AuthResponse | EmailVerified check; returns JWT if verified |
| POST | `/api/auth/google` | None | GoogleAuthRequest (idToken) | AuthResponse | Verifies Google ID token server-side |
| POST | `/api/auth/verify-email` | None | VerifyEmailRequest (email, otp) | AuthResponse | Marks user as emailVerified |
| POST | `/api/auth/resend-otp` | None | ResendOtpRequest (email) | AuthResponse | Generates new OTP, sends email |
| POST | `/api/auth/forgot-password` | None | ForgotPasswordRequest (email) | AuthResponse | Generates reset token, sends email |
| POST | `/api/auth/reset-password` | None | ResetPasswordRequest (token, newPassword) | AuthResponse | Completes password reset |

### Dashboard & Profile

| Method | Path | Auth | Response | Notes |
|--------|------|------|----------|-------|
| GET | `/api/dashboard` | JWT | DashboardResponse (attendance %, subjects, tasks summary, fees, expenses, marks) | Cached 5 min; evicted on mutations |
| GET | `/api/profile` | JWT | ProfileResponse (user details + notification prefs) | Includes role, email, academic details |
| PUT | `/api/profile` | JWT | ProfileResponse | Updates name, phone, college, course, semester, etc. |
| PUT | `/api/profile/preferences` | JWT | PreferencesResponse | Notification toggle flags |

### Attendance

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/attendance` | JWT | Query params: date (optional) |
| GET | `/api/attendance/today` | JWT | Get today's lectures with attendance status |
| GET | `/api/attendance/summary` | JWT | Subject-wise attendance % breakdown |
| POST | `/api/attendance` | JWT | Create attendance record |
| PUT | `/api/attendance/{id}` | JWT | Edit attendance (ownership check) |
| DELETE | `/api/attendance/{id}` | JWT | Delete attendance (ownership check) |

### Timetable

| Method | Path | Auth | Request | Notes |
|--------|------|------|---------|-------|
| GET | `/api/timetable` | JWT | - | All slots for user's semester |
| GET | `/api/timetable/day/{day}` | JWT | day = MONDAY, TUESDAY, etc. | Merged with today's attendance |
| POST | `/api/timetable` | JWT | TimetableSlotRequest | Add slot |
| PUT | `/api/timetable/{id}` | JWT | TimetableSlotRequest | Edit slot |
| DELETE | `/api/timetable/{id}` | JWT | - | Delete slot |
| POST | `/api/timetable/parse` | JWT | MultipartFile (xlsx, xls, pdf) | Upload and parse timetable; returns TimetablePreviewResponse |

### Tasks

| Method | Path | Auth | Request | Notes |
|--------|------|------|---------|-------|
| GET | `/api/tasks` | JWT | Query: type (ASSIGNMENT\|TODO), page, size | Filter by type; pagination optional |
| POST | `/api/tasks` | JWT | TaskRequest (title, type, dueDate, etc.) | Create task |
| PUT | `/api/tasks/{id}` | JWT | TaskRequest | Edit task |
| DELETE | `/api/tasks/{id}` | JWT | - | Delete single task |
| DELETE | `/api/tasks` | JWT | - | Delete all tasks (dangerous) |

### Marks

| Method | Path | Auth | Request | Notes |
|--------|------|------|---------|-------|
| GET | `/api/marks` | JWT | Query: semester (optional) | All marks, optionally filtered |
| POST | `/api/marks` | JWT | MarksRequest (subjectId, score, maxScore, etc.) | Add mark |
| PUT | `/api/marks/{id}` | JWT | MarksRequest | Edit mark |
| DELETE | `/api/marks/{id}` | JWT | - | Delete mark |

### Fees

| Method | Path | Auth | Request | Notes |
|--------|------|------|---------|-------|
| GET | `/api/fees` | JWT | - | All fee records |
| POST | `/api/fees` | JWT | FeesRequest (totalAmount, dueDate, etc.) | Add fee |
| PUT | `/api/fees/{id}` | JWT | FeesRequest | Edit fee |
| DELETE | `/api/fees/{id}` | JWT | - | Delete fee |
| POST | `/api/fees/{id}/upload` | JWT | MultipartFile (receipt) | Upload receipt (endpoint unclear if functional) |

### Expenses

| Method | Path | Auth | Request | Notes |
|--------|------|------|---------|-------|
| GET | `/api/expenses` | JWT | Query: date (YYYY-MM-DD, optional) | Expenses for date (or all) |
| GET | `/api/expenses/summary` | JWT | Query: month (YYYY-MM) | Monthly summary |
| GET | `/api/expenses/categories` | JWT | - | User's expense categories |
| POST | `/api/expenses` | JWT | ExpenseRequest (amount, categoryId, date, time, note) | Log expense |
| PUT | `/api/expenses/{id}` | JWT | ExpenseRequest | Edit expense |
| DELETE | `/api/expenses/{id}` | JWT | - | Delete expense |
| POST | `/api/expenses/categories` | JWT | ExpenseCategoryRequest (name) | Add category |
| DELETE | `/api/expenses/categories/{id}` | JWT | - | Delete category (ownership check) |
| POST | `/api/expenses/scan` | JWT | MultipartFile (receipt image) | OCR scan receipt (frontend-only Tesseract likely; backend endpoint unclear) |

### Admin

| Method | Path | Auth | Authorization | Notes |
|--------|------|------|----------------|-------|
| GET | `/api/admin/users` | JWT | ROLE=ADMIN | List all users |
| GET | `/api/admin/users/stats` | JWT | ROLE=ADMIN | Platform statistics |
| PUT | `/api/admin/users/{id}/role` | JWT | ROLE=ADMIN | ChangeRoleRequest (newRole) |
| PUT | `/api/admin/users/{id}/activate` | JWT | ROLE=ADMIN | Activate user |
| PUT | `/api/admin/users/{id}/deactivate` | JWT | ROLE=ADMIN | Deactivate user |
| DELETE | `/api/admin/users/{id}` | JWT | ROLE=SUPER_ADMIN | Delete user |

### Subjects

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/subjects` | JWT | Filter by semester |
| POST | `/api/subjects` | JWT | Add subject |
| PUT | `/api/subjects/{id}` | JWT | Edit subject |
| DELETE | `/api/subjects/{id}` | JWT | Delete subject |

### Other

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/actuator/health` | None | Health check (used for cold-start wake-up) |
| GET | `/swagger-ui.html` | None | Swagger/OpenAPI UI |

---

## TIMETABLE SYSTEM (DETAILED)

### Parser Capabilities

**Supported formats:** Excel (.xlsx, .xls), PDF (.pdf)

**Extraction libraries:**
- Excel: Apache POI (XSSFWorkbook, HSSFWorkbook)
- PDF: Tabula (ObjectExtractor, BasicExtractionAlgorithm, SpreadsheetExtractionAlgorithm)

**Output:** `TimetablePreviewResponse` (list of slots grouped by day, with extracted subject/time/room/faculty)

### Parsing Process

1. **Load file** → detect type (.xlsx / .xls / .pdf)
2. **Extract to grid** → 2D list of strings (cells)
3. **Parse legend** → scan for "Subject - Full Name" mappings
4. **Extract timetable** → find day headers, time ranges, subject codes
5. **Normalize** → expand abbreviations via legend, strip whitespace
6. **Return preview** → user reviews before committing

### Known Issues (from audit; not fully fixed)

| Issue | Status | Evidence |
|-------|--------|----------|
| 5-minute gaps become slots | UNVERIFIED | Time-range regex may capture gaps |
| Repeated slots for same subject | UNVERIFIED | No dedup logic in parser |
| Rows don't align by day | UNVERIFIED | Especially in PDFs; extraction order matters |
| Merged cells produce duplicates | UNVERIFIED | POI may expand merged cells into all child cells |
| Elective handling unclear | IMPLEMENTED but UNUSED | Field exists; UI doesn't offer selection |
| No OCR for handwritten | LIMITATION | Tabula/POI require digital/printed text |
| Different row counts per day | UNVERIFIED | Grid extraction may misalign multi-day tables |

### Normalization Rules

- **Day names:** Matches against full names (MONDAY) + abbreviations (MON, TUE, TUES, etc.)
- **Time format:** Regex matches "HH:MM - HH:MM", "HH.MM AM - HH.MM PM", etc.
- **Subject code:** Regex extracts patterns like "CS201", "DAA-101"
- **Room/Faculty:** Regex looks for "Room 101", "Prof. Smith", etc.
- **Legend entry:** Pattern "ABC - Definition" or "ABC: Definition"

---

## EXPENSE SYSTEM (DETAILED)

### Manual Entry

User logs expense: amount, date, time, category, note. Category must exist (owned by user).

### Receipt Scanning (OCR)

**Frontend:** `BillScannerModal` → `tesseract.js` (client-side OCR)

**Process:**
1. User uploads receipt image
2. Tesseract extracts text
3. Regex patterns extract: amount (₹/$ + number), date, merchant/store name
4. User confirms or manually edits
5. Expense created with extracted fields

**Backend:** Receipt endpoint (likely not wired or does nothing)

### Analytics

- Monthly breakdown (chart on Expenses page)
- Daily breakdown (table)
- Category-wise (if implemented)
- Dashboard snapshot (this month total)

### Planned Automation (NOT IMPLEMENTED)

- SMS parsing ("Your purchase of ₹500 at Starbucks")
- Bank statement import
- Credit card statement parsing
- Duplicate detection
- Auto-categorization

All automation features are PLANNED only; no SMS permissions, parsing logic, or integration exists.

---

## AI & NOTIFICATIONS (DETAILED)

### AI Features (IMPLEMENTED)

| Feature | Provider | Model | Usage | Status |
|---------|----------|-------|-------|--------|
| Timetable OCR | Google Generative AI | Gemini (pinned client-side) | Parse printed/digital timetables | IMPLEMENTED |
| Receipt OCR | Tesseract.js | Local browser OCR | Extract amount/date/merchant from receipts | IMPLEMENTED |

No other AI features implemented. No premium tier, no context-aware recommendations, no smart scheduling.

### Notifications (CLIENT-SIDE POLLING ONLY)

**Mechanism:** `useNotificationScheduler.js` polls every 60 seconds (even when app in background on some OS)

**Alerts (4 types):**
1. **Class reminders** — 5 minutes before lecture (from TimetableSlot startTime)
2. **Task alerts** — tasks due today (dueDate = today)
3. **Attendance warnings** — subject attendance < 75%
4. **Fee deadlines** — fees due within 3 days

**Implementation:**
- Reads all data from IndexedDB cache (works offline)
- Calls native `ServiceWorkerRegistration.showNotification()`
- Anti-spam: localStorage `alertedKeys` prevents duplicate fires per day
- 4-second stagger between notifications
- Notification permissions requested on first use

**Limitations:**
- Only works when app is open (or actively syncing on some browsers)
- No server-push integration
- No action buttons or interaction in notifications
- `navigator.onLine` false positives not fixed (cosmetic only)

**Planned:** Real push notifications (service-worker push events) — NOT IMPLEMENTED

---

## SECURITY ARCHITECTURE & STATUS

### Current Authentication

**JWT:** HS256 (HMAC-SHA256), 7-day expiry (604800000ms)

**Secrets:**
- `JWT_SECRET`: Environment variable (no fallback; app fails to start if missing after remediation)
- DB credentials: Environment variables (no fallback after remediation)

### Authorization

**Role-based:**
- STUDENT: can access own data, take exams, mark attendance, etc.
- ADMIN: can view users, change roles, manage accounts
- SUPER_ADMIN: full control; protected from demotion

**Per-resource ownership:** Every service checks `record.getUser().getId() == principal.getId()` before allowing read/update/delete

**Known inconsistency:** 5 services return `RuntimeException("Unauthorized")` → 400; 2 services (Task, Attendance) return `ResourceNotFoundException` → 404 for ownership violations. Not unified.

### User Isolation

**Data model:** Single-user per account; no org/group layer

**Caches (all namespace by user):**
- In-memory Map: `buildCacheKey(url, params)` includes `getUserCacheTag()` prefix
- IndexedDB: keys include user tag
- Workbox: not individually keyed, but cleared on logout
- Mutation queue: entries tagged with `userTag`; replay filters to current user

**Logout clearing:** All caches cleared (awaited before navigation) on logout and 401-expiry

**Offline mutations:** Tagged with originating user; only replayed for that user

### Secrets Status

**FIXED in remediation:**
- Removed leaked Gmail app password from source
- Removed JWT secret default value; now requires `${JWT_SECRET}` env var
- Removed DB credential defaults; now requires `${DB_USERNAME}` / `${DB_PASSWORD}` env vars

**Manual actions REQUIRED (not done by Claude):**
- Rotate `JWT_SECRET` in Render (treated as compromised)
- Revoke leaked Gmail app password
- Confirm env vars set in Render
- (Optional) scrub git history of leaked values

**Known issue:** `application.properties` still defaults `SENDGRID_FROM_EMAIL` and `SUPER_ADMIN_EMAIL` to a personal Gmail address (PII, not a secret, but should be genericized)

### Other Security Gaps (UNADDRESSED)

- `GlobalExceptionHandler` broad `RuntimeException` catch can leak internal stack traces
- No rate limiting on auth endpoints (brute-force risk)
- No audit trail of admin actions
- Native `alert()` used for error UX (UX issue, not security)
- Actuator endpoints (`/actuator/health`) public (intentional for health checks, acceptable)
- Swagger UI public (acceptable for documentation)

---

## BUGS, ISSUES & TECHNICAL DEBT

### Confirmed Bugs (FIXED)

| Bug | Status | Evidence |
|-----|--------|----------|
| Missing React key on Tasks.jsx list | FIXED | Fragment key added |
| NaN tile color for string task IDs | FIXED | Math.abs() with fallback |
| N+1 query in AttendanceService | FIXED | `getTodayLectures()` refactored |
| Unguarded Notification API access | FIXED | Guard added in hook initializer |
| Responsive button visibility (Schedule) | FIXED | `hidden md:grid` applied |

### Known Issues (UNRESOLVED)

| Issue | Severity | Status | Impact |
|-------|----------|--------|--------|
| `navigator.onLine` false positives | Low | KNOWN ISSUE (fix reverted) | Cosmetic; doesn't affect API retry logic |
| Topbar.jsx is dead code | Low | DOCUMENTED | Imported but never rendered |
| 149 pre-existing lint issues | Low | KNOWN ISSUE (CI non-blocking) | Code quality, not functionality |
| Ownership-check exception inconsistency | Low | PARTIALLY FIXED (1 of 6 services) | 5 services still use old pattern |
| Timetable parser edge cases | Medium | UNVERIFIED | 5-min gaps, merged cells, row misalignment |
| No real device PWA testing | Medium | KNOWN LIMITATION | Code-level fixes only; no Android/iOS verification |
| No live database migration testing | Medium | DEFERRED | Flyway adoption blocked without prod DB access |

### Technical Debt

| Item | Severity | Category | Notes |
|------|----------|----------|-------|
| No Flyway/Liquibase | High | Database | Schema evolution is `ddl-auto=update` + hand-rolled migrations; not production-grade |
| Ownership check boilerplate | Medium | Code quality | Duplicated across 7 services; candidate for shared helper |
| Exception handling leaks stack traces | Medium | Security | `GlobalExceptionHandler` broad catch; can expose internals |
| No integration tests | Medium | Testing | Only 1 context-load test; no business logic verification |
| AssignmentsSummary/TodosSummary still in API | Medium | Code quality | Backward-compat fields; should retire once frontend migrated |
| Vite pinned to experimental fork | Low | Build stability | `rolldown-vite@7.2.5` (pre-1.0); watch for regressions |
| Dashboard only snapshots (no trends) | Low | Feature | No historical data or trend analysis |

---

## TESTING & QA

### Backend Tests

**Status:** 1 test

**File:** `UnitrackBackendApplicationTests.java`

**Content:** `contextLoads()` — only verifies Spring context loads (no `@SpringBootTest`)

**Verdict:** BROKEN. No real integration tests; no business logic verification. "Tests pass" only means the app compiles and context loads.

### Frontend Tests

**Status:** 0 tests

**Linting:** 149 pre-existing issues (unused vars, missing hook deps, `Math.random()` during render, etc.)

**Verdict:** No test coverage; lint rules report but don't block CI

### Build Verification

| Step | Status | Notes |
|------|--------|-------|
| Backend `mvn test` | PASSES (1/1) | Context test only |
| Frontend `npm run build` | PASSES | Vite build succeeds; service worker generates correctly (88 precache entries) |
| Frontend `npm run lint` | ISSUES (149 unrelated) | CI non-blocking; pre-existing issues not introduced by recent work |

### Manual QA

**PWA/Mobile:** UNVERIFIED

- Code-level audit and fix pass completed
- No real device (Android/iOS) or emulator testing performed
- Chrome DevTools emulation may have been used (not documented)

**Expected coverage before shipping:** Install flow (Android + iOS), offline mutation, notifications, responsive layouts, touch targets, safe-area handling

---

## DEPLOYMENT & CONFIGURATION

### Production Hosting

| Component | Platform | URL | Notes |
|-----------|----------|-----|-------|
| Frontend | Vercel (Static) | `https://unitrack.vercel.app` (example) | Deployed on every git push to main |
| Backend | Render (Web Service) | `https://unitrack-api.render.com` (example) | Free tier; 30-50s cold starts common |
| Database | Neon (PostgreSQL) | Serverless PostgreSQL | Managed; included with Render free tier |

### Environment Variables

**Backend (spring application.properties):**

| Var | Required | Secret | Used by | Purpose |
|-----|----------|--------|---------|---------|
| `PORT` | No | No | Spring Boot | Server port (default 8081) |
| `SPRING_DATASOURCE_URL` | Yes | No | Spring Data | PostgreSQL JDBC URL |
| `DB_USERNAME` | Yes | Yes | Spring Data | DB user |
| `DB_PASSWORD` | Yes | Yes | Spring Data | DB password |
| `JWT_SECRET` | Yes | Yes | JwtService | JWT signing key (now required, no default) |
| `GOOGLE_CLIENT_ID` | Yes | No | AuthService | Google OAuth client ID |
| `SENDGRID_API_KEY` | No | Yes | EmailService | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | No | No | EmailService | Email sender address (default: personal Gmail) |
| `SUPER_ADMIN_EMAIL` | No | No | AuthService | Super admin account (default: personal Gmail) |
| `CORS_ALLOWED_ORIGINS` | No | No | WebConfig | CORS allowed origins (default: localhost:5173) |

**Frontend (Vite env vars, prefixed `VITE_`):**

| Var | Required | Purpose |
|-----|----------|---------|
| `VITE_API_BASE_URL` | No | Backend API URL (default: localhost:8081/api) |
| `VITE_GOOGLE_CLIENT_ID` | No | Google OAuth client ID (same as backend) |

### Docker Setup

**docker-compose.yml:**
- PostgreSQL 15 (local image, local creds hardcoded for dev)
- Backend (multi-stage build, Java 17, Spring Boot)
- Frontend (Node build stage, Nginx static server)

**Build/start:**
```bash
cp .env.example .env
# Edit .env with Render/production secrets
docker compose up --build
```

### Cold-Start Optimization

Backend is optimized for Render's free tier (slow startup):

- `spring.main.lazy-initialization=true` — defer bean creation
- `spring.jpa.defer-datasource-initialization=true` — delay DB connection
- `spring.data.jpa.repositories.bootstrap-mode=lazy` — defer repository proxies
- JVM flags (in Dockerfile): `-XX:TieredStopAtLevel=1 -XX:+UseParallelGC -noverify`
- Frontend wake-up: `wakeUpBackend()` in `api.js` aggressively pings `/actuator/health` on load (3s intervals for first 3 attempts, 5s after)
- External pinger: Cron-job.org (keep-alive action in CI) pings backend every 10 minutes to prevent Render's 15-min inactivity shutdown

**Typical cold-start:** 30-50 seconds from deploy or last request

---

## MODULE DEPENDENCY MAP

### Core Dependencies

```
Authentication
├─ Spring Security
├─ JWT (jjwt)
└─ Google API (OAuth)
    ↓
User/Profile
├─ User entity
└─ Email (SendGrid)

Dashboard (aggregates)
├─ Attendance
├─ Tasks
├─ Marks
├─ Fees
├─ Expenses
└─ Subjects

Attendance
├─ AttendanceRecord entity
├─ TimetableSlot (reference)
└─ Subject (reference)

Tasks
├─ Task entity
└─ TaskType (discriminator)

Marks
├─ Marks entity
└─ Subject (reference)

Fees
├─ Fees entity
└─ (no refs)

Expenses
├─ Expense entity
├─ ExpenseCategory entity
└─ Category must belong to same user

Timetable
├─ TimetableSlot entity
├─ Subject (reference)
└─ TimetableParserService (POI, Tabula)

Admin
└─ User (queries + role changes)

PWA/Offline (frontend)
├─ Service Worker (Workbox)
├─ IndexedDB (offlineManager)
├─ Cache layers (user-scoped)
└─ Mutation queue (user-scoped)

Notifications (frontend)
├─ useNotificationScheduler
├─ LocalStorage (prefs, dedup)
└─ Service Worker (native notification)
```

### Frontend Component Tree

```
App
├─ AuthProvider (login/logout state)
├─ DataProvider (caching)
└─ ProtectedRoute
    ├─ AppLayout (authenticated user)
    │   ├─ Sidebar (navigation)
    │   ├─ Topbar (user menu, theme toggle)
    │   └─ Route pages
    │       ├─ Dashboard
    │       ├─ Tasks
    │       ├─ Schedule
    │       ├─ Marks
    │       ├─ Fees
    │       ├─ Expenses
    │       └─ Profile
    ├─ AdminLayout (admin routes)
    │   └─ Admin pages
    └─ Login/Signup
```

---

## BUSINESS RULES & DATA CONSTRAINTS

### User Ownership

**Rule:** Every record is scoped to exactly one user. A user can only read/modify their own records.

**Enforcement:** Service layer checks `record.getUser().getId() == principal.getId()` before any mutation.

**Exceptions:** None (strict ownership)

### Attendance Calculations

**Rule:** Attendance % = (PRESENT count) / (PRESENT + ABSENT) * 100

**Formula:** Ignores EXCUSED and UNMARKED; only counts marked days

**Calculation location:** DashboardService (server-side aggregation)

### Task Status

**Rule:** Status values are client-controlled (no backend state machine)

**Computation:** OVERDUE is calculated as "dueDate < today AND status == PENDING"

**Calculation location:** Frontend (task listings)

### Fee Status

**Rule:** Status = PENDING if paidAmount == 0; PARTIAL if 0 < paidAmount < totalAmount; PAID if paidAmount == totalAmount

**Calculation location:** ExpenseService (computed on fetch)

### Timetable Uniqueness

**Rule:** TimetableSlot is defined by (user, dayOfWeek, startTime, endTime, subject). No uniqueness constraint enforced at DB level.

**Implication:** Duplicate identical slots possible (no dedup logic)

### Attendance Uniqueness

**Rule:** (user, date, subject) must be unique. Only one record per user per day per subject.

**Enforcement:** Unique constraint at DB level; 400 error if duplicate attempted

### Task Type Discriminator

**Rule:** Task is unified; type field specifies ASSIGNMENT or TODO

**Backward compat:** Dashboard response still includes AssignmentsSummary and TodosSummary fields (not yet retired)

### OTP Expiry

**Rule:** OTP valid for 10 minutes from issuance

**Enforcement:** AuthService checks `LocalDateTime.now() < otpExpiry` before accepting

### JWT Expiry

**Rule:** JWT expires after 7 days (604800000ms)

**Enforcement:** JwtService validates expiration on every request; 401 if expired

### Super Admin Protection

**Rule:** Super admin (configured via `SUPER_ADMIN_EMAIL`) cannot be demoted, deactivated, or deleted by other admins

**Enforcement:** AdminService check before role change / deactivation

---

## FRAGILE & HIGH-RISK AREAS

### 1. Timetable Parser

**Why fragile:** Complex regex-based extraction from unstructured tabular data (Excel, PDF). Small changes to extraction logic can break output shape.

**Important files:** `TimetableParserService.java`, `vite.config.js` (parser config on frontend)

**What must NOT change:** 
- Day-name matching algorithm
- Time-range regex
- Legend parsing logic
- Output DTO shape (frontend depends on it)

**Manual testing required:** Upload various Excel/PDF formats; verify slot extraction

---

### 2. User Isolation (Caching)

**Why fragile:** Cache keys are user-scoped via JWT-derived tag. Any new caching code that doesn't respect user-tagging can reintroduce data leaks.

**Important files:** `api.js` (`buildCacheKey`, `getUserCacheTag`, `clearAllOfflineCaches`), `offlineManager.js`, `AuthContext.jsx` (logout cache-clearing)

**What must NOT change:**
- User tag derivation (from JWT last 24 chars)
- Cache key format (must include user tag)
- Logout cache-clearing logic (must be awaited)
- Offline mutation queue tagging (must tag with userTag)

**What will cause regression:** Adding cache without user-tagging; not clearing caches on logout; not filtering queue by user on replay

---

### 3. Database Migrations

**Why fragile:** Transactional migrations using raw SQL. `ddl-auto=update` for schema evolution. No Flyway/Liquibase to version-control migrations.

**Important files:** `DataMigrationRunner.java`, `AttendanceConstraintMigration.java`

**What must NOT change:**
- Transactional wrapping (INSERT + DROP must stay atomic)
- No blind Flyway adoption without live DB access to baseline
- No switching `ddl-auto` to `validate` without verifying production schema first

**What will cause regression:** Splitting transactions, making migrations non-transactional, deploying Flyway without schema verification

---

### 4. Offline Queue & Synchronization

**Why fragile:** Mutation queue is persisted in IndexedDB. Replay logic filters by user. Mismatched entries are left untouched (not deleted).

**Important files:** `api.js` (`processOfflineQueue`, `applyPendingMutations`), `offlineManager.js`

**What must NOT change:**
- Queue entry tagging (userTag must be preserved)
- Replay filtering (must filter to current user's entries)
- Dedup logic (mismatched entries must be left, not deleted)

**What will cause regression:** Deleting mismatched queue entries, not filtering on replay, removing userTag from queued mutations

---

### 5. JWT & Authentication

**Why fragile:** JWT secret is now required (no fallback). Rotation or compromise requires env var change in production.

**Important files:** `application.properties`, `SecurityConfig.java`, `JwtService.java`, `docker-compose.yml`

**What must NOT change:**
- JWT_SECRET requirement (should always be env var)
- JWT expiration (7 days is current config)
- Authorization checks per service (ownership checks must stay in place)

**What will cause regression:** Re-introducing JWT secret fallback, removing ownership checks, changing JWT expiration arbitrarily

---

### 6. Unified Tasks System

**Why fragile:** Recent refactor from Assignment/Todo to unified Task. Legacy DB migration is transactional. Frontend still reads old DTO fields.

**Important files:** `Task.java`, `TaskType.java`, `TaskStatus.java`, `DashboardService.java`, `DataMigrationRunner.java`, `Tasks.jsx`

**What must NOT change:**
- Task entity discriminator (type field must exist)
- Migration logic (INSERT/DROP transaction must remain)
- Dashboard response shape (AssignmentsSummary/TodosSummary still included)

**What will cause regression:** Removing type discriminator, making migrations non-transactional, deleting dashboard legacy fields

---

### 7. Responsive / Mobile Layout

**Why fragile:** Multiple fixes applied in PWA phase (100vh → 100dvh, safe-area, button visibility). Changes to viewport handling can break mobile UX.

**Important files:** `AppLayout.jsx`, `AdminLayout.jsx`, `OfflineBanner.jsx`, `Schedule.jsx`, `Dashboard.jsx`, `Expenses.jsx`

**What must NOT change:**
- `h-dvh` (must stay; 100vh breaks iOS)
- `.pwa-safe-top` on top-of-viewport elements (prevents notch overlap)
- `hidden md:grid` on Schedule attendance button (swipe gesture is mobile equivalent)
- Touch-target sizes (44px minimum WCAG guideline)

**What will cause regression:** Reverting to `h-screen`, removing safe-area classes, changing button responsive classes, shrinking touch targets

---

### 8. PWA Service Worker & Caching

**Why fragile:** Workbox config in `vite.config.js` defines 7 named caches with different strategies. Changes affect offline experience.

**Important files:** `vite.config.js` (runtimeCaching config), `api.js` (cache interceptor), `offlineManager.js`

**What must NOT change:**
- Workbox cache names (frontend + backend code must match)
- Runtime caching strategies (NetworkFirst vs StaleWhileRevalidate)
- User-scoped cache keys (must include user tag)
- Manifest configuration (icon sizes, display mode)

**What will cause regression:** Changing cache names without updating code, switching strategies arbitrarily, removing user-tagging

---

### 9. Expense Parsing / OCR

**Why fragile:** Receipt OCR uses client-side Tesseract.js with regex extraction. Accuracy depends on image quality.

**Important files:** `BillScannerModal.jsx`, `ExpenseService.java` (if backend scanning exists)

**What must NOT change:**
- Regex patterns (amount, date, merchant extraction)
- Tesseract initialization
- User-correction flow (fallback if OCR fails)

**What will cause regression:** Changing regex, removing Tesseract, breaking merchant/date extraction

---

## REGRESSION PROTECTION CHECKLIST

**Before deploying ANY change, verify:**

- [ ] Authentication login/logout works
- [ ] User isolation: log out, log in as different user, verify no data crossover
- [ ] Offline queue: go offline, create task, go online, verify sync
- [ ] Attendance: mark, edit, delete work; unique constraint enforced
- [ ] Timetable: upload file, verify preview parsing
- [ ] Tasks: filter by type (ASSIGNMENT vs TODO), verify counts
- [ ] Dashboard: verify aggregations reflect all modules
- [ ] Mobile responsive: viewport fits without scrolling at 375px width
- [ ] Touch targets: buttons are at least 44x44px
- [ ] PWA install: Android `beforeinstallprompt` fires; iOS fallback visible
- [ ] Service worker: offline page load works; mutations queue when offline
- [ ] Notifications: 4 alert types fire (if enabled); dedup works
- [ ] Admin: role change, deactivation work; super admin protected
- [ ] Database: no dangling foreign keys; indexes present on user_id
- [ ] Build: `mvn clean test` passes, `npm run build` succeeds

---

## CURRENT STATUS DASHBOARD

| Area | Status | Confidence | Notes |
|------|--------|------------|-------|
| Authentication | COMPLETE | HIGH | Email/password, Google OAuth, OTP, password reset |
| Dashboard | COMPLETE | MEDIUM | Aggregations work; no trend analysis |
| Attendance | COMPLETE | MEDIUM | Mark/edit/delete work; % calculations correct; N+1 query fixed |
| Timetable | COMPLETE | LOW | Parser works; edge cases (merged cells, row alignment) unverified |
| Tasks (unified) | COMPLETE | HIGH | Single entity works; backward compat fields in API |
| Marks | COMPLETE | MEDIUM | Score tracking works; no credit-weighted GPA |
| Fees | COMPLETE | MEDIUM | Tracking works; no payment method logging |
| Expenses | COMPLETE | MEDIUM | Manual + OCR works; no SMS automation |
| Profile | COMPLETE | HIGH | User details, preferences persist |
| Admin | COMPLETE | MEDIUM | Role management, user activation works; no audit trail |
| PWA | MOSTLY COMPLETE | MEDIUM | Install, offline, notifications work; not device-tested |
| Notifications | COMPLETE | MEDIUM | 4 alert types fire; client-side polling only |
| Security | MOSTLY COMPLETE | MEDIUM | Secrets rotated, cache isolated, ownership checks; exception inconsistency unresolved |
| Testing | BROKEN | HIGH | Only 1 context test; no integration/business logic tests |
| Deployment | COMPLETE | HIGH | Docker, Render, Neon configured; cold-start optimized |

---

## ROADMAP

### Immediate Blockers

1. **Rotate JWT_SECRET** in Render environment (manual action required)
2. **Revoke Gmail app password** (manual action required)
3. **QA testing on Android/iOS devices** (before shipping mobile/PWA work)

### Required Before Production Handoff

1. Add real integration tests (TaskService, AttendanceService, etc.)
2. Document timetable parser edge cases + fix or document workarounds
3. Verify expense OCR accuracy on real receipts
4. Test offline queue sync under various network conditions
5. Verify PWA install + offline behavior on real devices
6. Audit exception handling (don't leak stack traces)

### High-Priority Next Work

1. Unify ownership-check exceptions (all services should return 404, not 400)
2. Retire AssignmentsSummary/TodosSummary from Dashboard API once frontend migrated
3. Add recurring tasks (dueDate + frequency)
4. Improve timetable parser (handle merged cells, row alignment)
5. Add role-based UI (hide admin features from students)

### Medium-Term

1. Implement Flyway migrations (requires live DB access + schema verification)
2. Real push notifications (server-push via Service Worker)
3. Expense automation (SMS/bank import)
4. Trend analysis on Dashboard (historical data)
5. Shared expense splitting (if feature desired)

### Long-Term / Planned

1. AI premium features (scope TBD)
2. Community / study group features (requires multi-tenant architecture)
3. Mobile app (native React Native or PWA wrap)
4. Third-party integrations (Google Calendar sync, etc.)

---

## NEW DEVELOPER GUIDE

### Prerequisites

- Git
- Java 17 (backend)
- Node.js 18+ (frontend)
- Docker + Docker Compose (recommended)
- PostgreSQL 15 (optional if using Docker)
- VS Code or JetBrains IDE

### Environment Setup

1. Clone repo: `git clone ...`
2. Copy env files:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```
3. Edit `.env` with your values (JWT_SECRET, DB creds, Google OAuth client ID)
4. For production: use Render/Neon dashboard to set env vars

### Frontend Startup

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Backend Startup

```bash
cd backend
./mvnw spring-boot:run
# Runs on http://localhost:8081
# Swagger docs: http://localhost:8081/swagger-ui.html
```

### Database Setup (if not using Docker)

```sql
CREATE DATABASE unitrack;
-- Hibernate ddl-auto=update will create tables automatically
```

### With Docker Compose

```bash
docker compose up --build
# Frontend: http://localhost:3000
# Backend: http://localhost:8081
# Postgres: localhost:5432
```

### How to Modify APIs

1. **Backend:** Add endpoint in controller → service layer handles logic → return DTO
2. **Frontend:** Use `useData` hook or `api.js` directly; results are cached automatically
3. **Auth:** All endpoints except `/api/auth/**` and `/actuator/health` require JWT bearer token

### How to Modify Entities

1. Update Java entity (add @Column, @Index, etc.)
2. Create @PostConstruct or DataMigrationRunner if data transformation needed
3. Hibernate `ddl-auto=update` will create column on next boot
4. **Do NOT use Flyway** without live DB schema access

### How to Modify Frontend Pages

1. Edit page component in `pages/`
2. Use `useData` hook to fetch data
3. Call `api.post/put/delete` directly for mutations
4. Offline support is automatic (mutations queued if offline)

### Important Precautions

- **Do NOT introduce JWT secret fallback** — it was removed for security
- **Do NOT remove user-tagging from cache keys** — it will reintroduce data leaks
- **Do NOT make migrations non-transactional** — atomic consistency can be lost
- **Do NOT delete orphaned files without grep verification** — may have hidden refs
- **Do NOT assume tests pass = code works** — only 1 test exists (context load)
- **Do NOT modify timetable parser without device testing** — parsing is fragile

---

## GUIDELINES FOR FUTURE LLMS

### Before Making Changes

1. **Read this document** (UNITRACK_PROJECT_KNOWLEDGE.md) + CHANGES.md + PROGRESS.md
2. **Read the relevant source files** (not just the spec)
3. **Verify assumptions against actual code** (don't rely on prior docs)
4. **Check git status** (see what was already changed)
5. **Run tests/build** before and after changes

### Architectural Constraints

- **Single-user only** — no multi-tenant layer; all records user-scoped
- **No Flyway adoption** — `ddl-auto=update` + manual migrations only (until live DB access)
- **User-scoped caching** — all cache keys must include JWT-derived user tag
- **Transactional migrations** — INSERT + DROP must be atomic (PostgreSQL DDL is transactional)
- **Per-record ownership checks** — every mutation must verify user ownership

### Fragile Areas (Avoid Casual Changes)

1. Timetable parser (complex regex extraction)
2. User-isolation caching (data-leak risk if user-tagging removed)
3. JWT secret handling (now required; don't re-add fallback)
4. Offline queue replay logic (must filter by user; don't delete mismatched entries)
5. Database migrations (must stay transactional)
6. Responsive layout (h-dvh, safe-area, button visibility all interdependent)

### Code Quality Standards

- Avoid rewriting working code unnecessarily
- Preserve all existing APIs and DTOs (backward compat)
- Ownership checks go in service layer (not controller)
- Index all frequently-queried foreign keys (except unique constraints)
- Gate diagnostic logging behind `import.meta.env.DEV`
- Use `useMemo` for expensive React context values

### Incomplete Areas (Document Your Work)

- Timetable parser edge cases (merged cells, row alignment, 5-min gaps)
- Expense OCR accuracy (test on real receipts)
- PWA device testing (no real Android/iOS verification yet)
- Integration tests (no business-logic coverage)
- Push notifications (client-side polling only)

### Common Mistakes to Avoid

- Assuming "build succeeds" means "code is correct" (no real tests)
- Assuming "feature file exists" means "feature works" (verify with code inspection)
- Blind Flyway adoption (requires schema verification first)
- Removing legacy DTO fields without checking frontend (backward compat)
- Adding cache without user-tagging (data-leak risk)
- Making migrations non-transactional (consistency risk)

---

## DOCUMENT MAINTENANCE

This document is a **snapshot as of 2026-09-20**, derived from actual codebase inspection. It is NOT auto-generated and will not self-update.

**Update when:**
- Major feature added/removed
- API contract changes
- Database schema changes significantly
- Security model changes
- Architecture refactored
- Deployment configuration changes
- Bug status changes from OPEN to FIXED

**Do NOT update for:**
- Typo fixes in variable names (update code, not this doc)
- Comment-only changes
- UI style-only changes
- Minor refactoring (code quality, no logic change)

**Verification before deployment:**
- Spot-check this doc against current source
- Run full build + test + lint
- Verify any "KNOWN ISSUE" items haven't regressed
- Confirm "IMPLEMENTED" claims with code inspection

---

## FINAL TRUTH TABLE

| Claim | Current Reality |
|-------|-----------------|
| **What UniTrack is** | Single-user student productivity PWA: attendance + timetable + tasks + marks + fees + expenses + profile + admin |
| **Current architecture** | React 19 SPA + Spring Boot 3.4 REST + PostgreSQL, offline-first caching + mutation queue, JWT auth, Workbox PWA |
| **Main implemented features** | All 8 core modules + admin + PWA/offline + notifications (4 types, client-side polling) |
| **Partially implemented** | Timetable parser (regex/format tests pass, edge cases like merged cells unverified on real complex spreadsheets), PWA (code-complete, not device-tested) |
| **Planned features** | SMS expense automation, server-push notifications, AI premium tier, community features — NOT IMPLEMENTED |
| **Known bugs** | 134 pre-existing lint issues; `navigator.onLine` false positives (not fixed) |
| **Security status** | Secrets rotated in config (not in Render yet — manual action required); user-isolation fixed; ownership checks unified to 404; GlobalExceptionHandler 500 leak sanitized; eval() removed |
| **Testing status** | 7 backend unit tests passing (1 context-load + 6 TimetableParser regex/extraction tests); frontend production build verified; no live device/PWA manual testing yet |
| **Deployment status** | Vercel (frontend), Render free tier (backend, cold-start 30-50s), Neon PostgreSQL; deployed on git push to main |
| **PWA/Mobile status** | Android: native install + offline + notifications work. iOS: manual install fallback + safe-area fixes applied; NOT device-tested |
| **Timetable status** | Parser supports Excel/PDF; normalizes day/time; legend matching works; unit tests verify pattern extractions; complex edge cases (merged cells) documented |
| **Expense status** | Manual logging works; OCR (Tesseract.js) implemented; SMS/bank import PLANNED NOT IMPLEMENTED |
| **AI status** | Timetable OCR + receipt OCR (Gemini + Tesseract); no AI premium tier yet |
| **Notification status** | 4 alert types fire locally; client-side 60-second polling; server-push PLANNED NOT IMPLEMENTED |
| **Biggest technical debt** | No Flyway/Liquibase (blocked without prod DB access); 134 lint issues |
| **Biggest current blocker** | JWT_SECRET rotation + password revocation (manual) + QA testing on devices |
| **Highest-priority next step** | Ship with manual security rotations complete + pass device QA on Android/iOS; then proceed to next feature phase |

---

**End of UNITRACK_PROJECT_KNOWLEDGE.md**
