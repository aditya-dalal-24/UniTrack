# PROGRESS.md — UniTrack Project Memory

**Read this before starting any new work on UniTrack.** It records what the product is, what's been built, what's been audited/fixed, and what decisions should not be casually reversed. Companion document: `CHANGES.md` (detailed changelog of the audit/remediation/PWA phases this file summarizes).

Status tags used throughout: **Completed**, **In Progress**, **Planned**, **Known Issue**, **Manual Action Required**.

---

## 1. Purpose, product vision, target users

UniTrack is a **personal, single-user-per-account student productivity app** — "Smart Student Management Platform" per its own README. It consolidates a student's academic and personal-finance life into one app: attendance, timetable, marks/grades, tasks (assignments + to-dos, unified), fees, and daily expenses. It is not a shared gradebook, not a class/institution-wide tool, and not multi-tenant — every table is scoped to one user's own data with no organization/classroom layer. Built as an installable PWA (Android + iOS), positioned as a polished, "zero-clutter," student-friendly tool rather than an enterprise SIS.

## 2. Current tech stack and architecture

| Layer | Technology |
|---|---|
| Frontend | React 19.2, Vite (pinned to `rolldown-vite@7.2.5` via package override — bleeding-edge, watch for build-stability regressions), Tailwind CSS 3.4.13, React Router 7 |
| PWA | `vite-plugin-pwa` 1.3.0 + Workbox (`generateSW` strategy), custom IndexedDB offline layer |
| Backend | Spring Boot 3.4.3, Java 17, Maven |
| Auth | Spring Security + JWT (`jjwt` 0.11.5, HS256), BCrypt passwords, Google OAuth2 |
| Database | PostgreSQL (Neon serverless in production), Hibernate `ddl-auto=update` (no Flyway/Liquibase) |
| Cache | Caffeine (server-side, dashboard aggregation), custom in-memory + IndexedDB + Workbox (client-side) |
| Email | SendGrid HTTP API (legacy SMTP config fully removed) |
| Docs | springdoc-openapi (Swagger UI) |
| Deployment | Vercel (frontend), Render free tier (backend, cold-start-prone), Neon (Postgres) |

**Architecture:** conventional 3-tier monolith. React SPA ↔ stateless Spring Boot REST API over JWT bearer auth ↔ single Postgres schema. Backend is a standard layered package structure (`controller`/`service`/`repository`/`entity`/`dto.request`/`dto.response`/`security`/`config`/`exception`), one controller+service pair per feature. Frontend separates `pages` (one per route), `components` (shared UI + a `dashboard/` widget subfolder), `services` (API client, offline manager, OCR/AI scanner adapters), `hooks`, `contexts` (`AuthContext`, `DataContext`).

**Entry points:** backend — `UnitrackBackendApplication.java`. Frontend — `src/main.jsx` → `App.jsx` (mounts `AuthProvider` → `DataProvider` → route tree; `React.lazy` per-page code splitting).

## 3. Existing major features (Completed, live)

- **Auth:** email/password, Google OAuth, email OTP verification, forgot/reset password. Roles: `STUDENT`, `ADMIN`, `BOTH`, `SUPER_ADMIN` (one configured super-admin email always gets `SUPER_ADMIN`, a deliberate can't-lock-myself-out safety valve).
- **Dashboard:** aggregated summary (attendance %, upcoming tasks, fees, expenses, marks), server-cached 5 min (Caffeine), evicted on every relevant mutation.
- **Attendance:** mark/edit/delete per lecture or per subject-day, swipe-to-mark gesture on mobile, duplicate-record cleanup logic, unique constraint on `(user_id, date, subject_id)`.
- **Timetable/Schedule:** manual entry, bulk upload with AI/OCR-based parsing (`geminiTimetableScannerService.js`, Tabula/POI on the backend for file parsing), merged "today's lectures" view.
- **Tasks:** unified Assignments + To-Dos (see §9 — this used to be two separate features, now one `Task` entity with a `TaskType` discriminator).
- **Marks/Grades:** per-subject scores, grade/grade-points tracking.
- **Fees:** amount/due-date/paid tracking, receipt storage.
- **Expenses:** categorized daily expenses, receipt OCR scanning (`tesseract.js` + `receiptScannerService.js`), daily/monthly bill views.
- **Profile:** user details, notification preferences, avatar.
- **Admin:** user list/stats, activate/deactivate accounts, role changes (role changes and deletion require `SUPER_ADMIN`, enforced in-service), "thought of the day" content management.
- **PWA/offline:** installable on Android/iOS, offline-first with an IndexedDB mutation queue + response cache, Workbox runtime caching, install prompt, update-available toast, local notification scheduling engine (class reminders, task due dates, attendance-% warnings, fee deadlines).

## 4. Original full-codebase audit — key findings (Completed, read-only, no code changed at that stage)

A four-part parallel audit (project structure, frontend, backend, database/deployment) rated the codebase: **2 Critical, 6 High, 8 Medium, 15 Low** findings. Full detail in `CHANGES.md` §1. Summary verdict at the time: *architecturally sound — consistent DTO boundaries, per-record ownership checks on every mutation, a genuinely sophisticated offline-first PWA layer — but **not production-ready as-is** for three concentrated reasons*:

1. Two real secrets committed to the repo (Gmail app password, JWT signing secret default).
2. No real migration tooling — `ddl-auto=update` plus hand-rolled `CommandLineRunner` classes running destructive raw SQL on every boot, non-transactionally.
3. Client-side caches and the offline mutation queue were not scoped per user — a shared-device data-leak and mutation-misrouting risk.

**API surface:** ~57 REST endpoints across auth, dashboard/profile, attendance/timetable, subjects/marks/fees/tasks, expenses, admin. Cross-checked against every frontend `api.js` call site at the time — full match, no orphaned endpoints either direction.

**Authorization model:** sound. Every service that fetches a record by id compares `record.getUser().getId()` against the JWT principal before allowing read/update/delete — no controller accepts a client-supplied `studentId`/`userId` to scope another user's data. This closes off the most common IDOR pattern by construction. (In Phase 4, the exception type used for "record exists but isn't yours" was unified to `ResourceNotFoundException` across all services to prevent IDOR enumeration).

## 5. Remediation work completed after the audit (Completed unless noted)

Full detail in `CHANGES.md`. Summary by area:

- **Security:** leaked Gmail password and JWT-secret-as-default-fallback removed from source; hardcoded DB credential fallback removed; obsolete SMTP config deleted; `.env.example` files (root + backend) brought up to date and scrubbed of the leaked value; Hikari logging reduced from TRACE. **Manual Action Required:** rotate the JWT secret and revoke the Gmail app password in the real accounts — Claude cannot and did not do this.
- **Client-side user isolation:** every cache layer (in-memory, IndexedDB, 7 named Workbox caches) is now namespaced by a JWT-derived user tag; all caches are cleared on logout and on 401-expiry, awaited before navigation.
- **Offline mutation queue:** every queued mutation is now tagged with its originating user; replay/merge logic filters to the current user only, leaving mismatched entries queued (not lost, not leaked) for if that user logs back in.
- **Database safety:** `DataMigrationRunner`'s INSERT+DROP pairs are now wrapped in single transactions (atomic, rollback-safe). Indexes added on `user_id` for 7 entities via the existing `ddl-auto=update` mechanism. **Not done:** Flyway/Liquibase adoption and switching to `ddl-auto=validate` — both require live-database access to safely baseline, which was not available; explicitly deferred rather than guessed at.
- **Backend bugs:** `AttendanceService`'s ownership-check now returns 404 instead of 400 (note: this doesn't make the codebase fully consistent — 5 other services still use the old pattern, see §4 caveat and §10). N+1 query eliminated in `getTodayLectures()`.
- **Frontend bugs:** missing React `key` fixed in `Tasks.jsx`; `NaN` tile-color bug fixed for offline temp-IDs; `DataContext` memoized; diagnostic console logging gated to dev mode; two confirmed-dead files (`Students.jsx`, `StudentTable.jsx`) deleted after verification.
- **CI:** `.github/workflows/ci.yml` added — backend tests + frontend build are blocking; frontend lint runs and reports but doesn't block (149 pre-existing lint issues, unrelated to this work, would otherwise redline every run).

## 6. PWA/mobile stabilization work completed

A second, PWA-specific audit (separate from §4) covering install flow, service worker, update prompts, offline UX, notification permissions, and mobile layout/touch across every major page. Full detail in `CHANGES.md` §8. Headline fixes:

- **Critical crash fixed:** unguarded `Notification.permission` access crashed the entire app (outside the ErrorBoundary) on any browser without the Notification API — iOS Safari < 16.4, some WebViews.
- **iOS install support added:** iOS Safari never fires `beforeinstallprompt`; a manual "Add to Home Screen" instructions fallback was added since none existed before.
- **Mobile layout bug fixed:** the daily-attendance card's desktop-only button block had no actual responsive hiding (stale comment vs. code) — fixed; the swipe gesture already covers mobile, so zero functionality was lost.
- **iOS safe-area handling wired up:** an existing-but-unused `.pwa-safe-top` CSS utility is now applied to the real top-of-viewport containers, preventing content from rendering under the iOS notch/status bar in standalone mode.
- **`100vh` → `100dvh`** on both authenticated-shell layouts (mobile Safari address-bar layout-jump fix).
- Drag-and-drop touch-action fix, mislabeled favicon/apple-touch-icon fix, install-prompt 7-day-dismissal fix, three touch-target size bumps.
- **Reverted mid-implementation (Known Issue, left as-is):** an attempted fix for `navigator.onLine`'s known false-positive unreliability was reverted because it would misfire "offline" during this app's routine 30-50s Render cold-starts — a worse regression than the original cosmetic bug. `useNetworkStatus.js` still uses browser-event-only detection.

No live device/emulator testing was performed — this was a rigorous code-level audit and fix pass only.

## 7. Current PWA capabilities and limitations

**Capable of:**
- Install on Android (native `beforeinstallprompt` flow) and iOS (manual instructions, now that the fallback exists).
- Full offline usage: cached GET responses served instantly, mutations queued and synced on reconnect, per-user cache/queue isolation.
- Background update detection (60-min poll + on-visibility-change), non-disruptive update-available toast.
- Local notification scheduling (class reminders, task due dates, attendance-% warnings, fee deadlines) — client-side polling engine, not real push notifications (no server-sent push).

**Known Issue / Limitation:**
- `navigator.onLine`-only connectivity detection can show a false "back online" state (see §6). Cosmetic only — doesn't affect actual API call behavior, which has its own retry/offline-fallback logic.
- `Topbar.jsx` is dead code — imported in both `AppLayout.jsx` and `AdminLayout.jsx` but never rendered in either. Not investigated further; flag before assuming it's live.
- No focus trap on the mobile nav drawer (minor accessibility gap).
- Not tested on a real device — recommend a manual QA pass (or Chrome DevTools mobile emulation) before shipping the mobile phase.

## 8. Current database/backend/frontend state

- **Database:** PostgreSQL on Neon. 11 tables/entities: `users`, `profiles` (1:1), `subjects`, `timetable_slots`, `attendance_records`, `marks`, `fees`, `expenses`, `expense_categories`, `tasks`, `thoughts`. No multi-tenant layer. Schema managed by Hibernate `ddl-auto=update` — **not** Flyway/Liquibase (see §5, §10).
- **Backend:** compiles clean, 7 unit tests pass (1 context test + 6 regex/extraction pattern tests in `TimetableParserServiceTest`).
- **Frontend:** builds clean; PWA service worker generates correctly (88 precache entries as of last verification). 134 pre-existing lint problems exist across files not touched by any of this work (reduced from 150 via safe auto-fix; non-blocking).

## 9. In Progress / recently-completed refactor (pre-dates this audit work)

The **Assignment + Todo → unified Task** migration was already underway (uncommitted in the working tree) before the audit began, and was verified — not authored — during this work:
- Old: separate `Assignment` and `Todo` entities/controllers/services/DTOs/repositories, and separate `Assignments.jsx`/`ToDo.jsx` frontend pages.
- New: a single `Task` entity with a `TaskType` (`ASSIGNMENT`/`TODO`) discriminator, one `TaskController`/`TaskService`, one `Tasks.jsx` page with a tab toggle.
- `DataMigrationRunner.java` migrates any legacy `assignments`/`todos` tables into `tasks` on startup (now transaction-safe, see §5).
- `DashboardResponse` still carries both the old `AssignmentsSummary`/`TodosSummary` fields (for frontend backward-compat) *and* the new unified `TasksSummary` — preserved since frontend widgets display granular assignment vs todo breakdowns alongside aggregate task numbers.
- Verified clean: zero dangling references, zero broken routes/imports from this refactor.

## 10. Remaining technical debt and known issues

- No Flyway/Liquibase — schema evolution is `ddl-auto=update` + occasional hand-rolled startup migration classes. **The single largest structural debt item.**
- Native `alert()` used for error UX in several frontend places instead of a toast/banner component.
- Ownership checks unified to return HTTP 404 (`ResourceNotFoundException`) preventing IDOR enumeration; can optionally be refactored into a shared helper in future.
- 134 pre-existing frontend lint issues (unused vars, missing hook deps, one impure `Math.random()` call during render, escape-character warnings) — reported by CI (non-blocking), partially autofixed.
- `frontend/vite.config.js` pins `rolldown-vite@7.2.5` — an experimental, pre-1.0 Vite fork. Low current risk, but a build-stability item to watch.

## 11. Manual actions still required (production-specific)

- **Rotate `JWT_SECRET` in Render dashboard** and confirm it matches production requirements (the app fails fast without it; a fresh secret has already been generated and configured locally in `backend/.env`).
- **Revoke the leaked Gmail app password** in that Google account's security settings.
- **Confirm `DB_USERNAME`/`DB_PASSWORD` are set in Render** (required, no fallback in `application.properties`).
- Scrub git history of the two leaked secrets if the repo is/was ever public.
- Decide whether to genericize the PII email defaults (`SENDGRID_FROM_EMAIL`, `SUPER_ADMIN_EMAIL`) in `application.properties`.
- Grant a future session live database access before attempting Flyway adoption or `ddl-auto=validate`.
- Manual QA / real-device testing pass for the mobile/PWA work before shipping.

## 12. Product roadmap and planned next phases

**None of the following are implemented.** They are explicitly future work — do not assume any exist in the codebase. All are **Planned**, not started:

- **Expense automation / transaction detection** — likely SMS or bank-notification parsing to auto-log expenses. No parsing logic, permissions, or data model for this exists yet.
- **Smart notifications** — beyond the current local polling-based reminder engine (§7); likely means real push notifications and/or smarter, context-aware triggers. No server-push infrastructure exists yet (current notifications are 100% client-side/local).
- **AI premium features** — scope undefined in current context; the app already uses Gemini client-side for timetable OCR scanning, but no "premium"/paid-tier gating or additional AI features exist.
- **Community features** — scope undefined; the app is currently single-user/no-social-graph by design (see §1). Adding this would be a meaningful architectural expansion (would need a multi-tenant or social-graph layer that doesn't currently exist), not a small addition.

These were explicitly excluded from the PWA/mobile stabilization phase by direct instruction. When work on them begins, start by re-reading this file and `CHANGES.md`, and treat the "should not be changed without consideration" list in §13 as binding constraints on the implementation approach.

## 13. Important decisions made — do not change without consideration

- **JWT/DB credentials have no property-file fallback by design.** Do not reintroduce a default value "for convenience" — this was the exact Critical security finding that was fixed. Local dev must set real env vars (README already documents this).
- **Client-side caches and the offline mutation queue are namespaced per user.** Any new caching logic added to `api.js`/`offlineManager.js` must go through `getUserCacheTag()` / respect `userTag` filtering, or it will silently reintroduce the cross-user data-leak this work fixed.
- **`DataMigrationRunner`'s transactional wrapping must be preserved** if that file is touched again — do not split the INSERT and DROP back into separate non-transactional statements.
- **Do not adopt Flyway or switch `ddl-auto` to `validate` without live database access to verify the actual production schema first.** This was deliberately deferred, not overlooked — doing it blind risks a production startup failure.
- **The swipe-to-mark gesture in `Schedule.jsx`'s `SwipeableLectureRow` is the mobile equivalent of the desktop Present/Absent buttons** (`hidden md:grid`). If redesigning this component, preserve both interaction paths — don't just delete the "unused-looking" mobile-hidden buttons without confirming the swipe gesture still exists.
- **`AttendanceRecord` intentionally has no standalone `user_id` index** — its unique constraint `(user_id, date, subject_id)` already serves that purpose as a leftmost prefix. Don't add a redundant index without checking this first.
- **`AssignmentsSummary`/`TodosSummary` in `DashboardResponse` are still read by live frontend code** (`useInsightsEngine.js`, `SmartTasksWidget.jsx`). Do not remove them from the backend response without first updating those frontend consumers to the unified `TasksSummary`.
- **This project has no live CI test coverage beyond one no-op context test.** Don't assume "tests pass" means business logic is verified — it currently only confirms the app compiles and the Spring context class loads without a real `@SpringBootTest`.
- **Nothing in this document or `CHANGES.md` has been committed to git** as of this writing — all changes described are in the working tree only. Check `git status` before assuming any of this is deployed or even committed.
