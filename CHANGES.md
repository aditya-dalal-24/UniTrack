# CHANGES.md — Audit, Remediation & Mobile/PWA Stabilization

This document records the work completed across three phases on the current working-tree state (none of it committed yet — see `git status`):

1. **Full-stack audit** (read-only, no code changes)
2. **Remediation** (security, caching, database, bug fixes, CI)
3. **PWA/mobile stabilization** (Android/iOS production-readiness)

Status tags used throughout: **Completed**, **Not done (deferred)**, **Known Issue**, **Manual Action Required**.

---

## 1. Full-stack audit findings and severity

A four-part parallel audit (project structure, frontend, backend, database/deployment) produced a consolidated report: **2 Critical, 6 High, 8 Medium, 15 Low** findings. Highlights:

| # | Severity | Finding |
|---|----------|---------|
| 1 | Critical | Real Gmail app password committed in `application.properties` (commented-out legacy SMTP block) |
| 2 | Critical | JWT signing secret committed as the property's default fallback value |
| 3 | High | Client-side caches (in-memory, IndexedDB, Workbox) not scoped per user — data leak risk on shared devices |
| 4 | High | Offline mutation queue could replay one user's queued edit under a different user's session |
| 5 | High | `DataMigrationRunner` ran destructive SQL (INSERT+DROP) non-transactionally on every boot |
| 6 | High | No schema migration tool — `ddl-auto=update` + hand-rolled `CommandLineRunner`/`@PostConstruct` migrations |
| 7 | High | Dead components (`Students.jsx`, `StudentTable.jsx`) shipping hardcoded mock data, unrouted |
| 8 | Medium | Missing indexes on `user_id` foreign keys across 7 entities |
| 9 | Medium | N+1 query pattern in `AttendanceService.getTodayLectures()` |
| 10 | Medium | No CI pipeline — only a Render keep-alive cron existed |
| 11 | Medium | Hardcoded fallback DB credentials in `application.properties` |
| 12+ | Low | Hikari logging left at TRACE, missing React `key`, un-memoized context, `.env.example` drift, mislabeled PWA doc claim, etc. |

Full detail (including the frontend/backend/database/API-map breakdown) exists only in this session's history — no audit artifact file was persisted to the repo.

## 2. Security fixes

**Completed:**
- Removed the leaked Gmail app password and the entire dead commented-out SMTP block from `backend/src/main/resources/application.properties`.
- Removed the hardcoded JWT secret fallback — `jwt.secret` now reads `${JWT_SECRET}` with **no default**; the app fails fast at startup if unset instead of silently signing tokens with a public value.
- Removed the hardcoded DB credential fallback the same way (`${DB_USERNAME}` / `${DB_PASSWORD}`, no default).
- Updated `docker-compose.yml` to pass `JWT_SECRET` through with a `:?` required-var error, since the in-code fallback that used to cover local `docker-compose up` runs is gone.
- Scrubbed the same leaked JWT value out of the root `.env.example` and brought both `.env.example` files (root + `backend/`) up to date with real SendGrid variable names.
- Reduced Hikari connection-pool logging from `TRACE`/`DEBUG` to `WARN`.

**Manual Action Required (not done by Claude, per explicit instruction — no secrets were rotated):**
- **Revoke the leaked Gmail app password** in that Google account's App Passwords settings.
- **Rotate `JWT_SECRET`** in Render's environment variables — treat the committed value as compromised even though it may not be the literal production secret (the same value also appeared in `.env.example`).
- **Confirm `JWT_SECRET`, `DB_USERNAME`, `DB_PASSWORD` are explicitly set** in Render — the app will now refuse to start without them.
- If the repo is or was ever public, scrub these two secrets from git history (not done — no history rewriting was performed).

**Known Issue (flagged, not fixed — explicitly out of the requested scope):**
- `application.properties` still defaults `SENDGRID_FROM_EMAIL` and `SUPER_ADMIN_EMAIL` to a real personal Gmail address. Not a credential/secret, but PII committed in source — a deliberate decision is needed on whether to genericize it.
- Root `.env.example`'s `DB_USERNAME=unitrack_user` / `DB_PASSWORD=unitrack123` are literal (not placeholder-style) values matching `docker-compose.yml`'s own local Postgres defaults. Low risk (local-only), but not a true placeholder — left alone because fixing it cleanly requires also changing `docker-compose.yml`'s Postgres service.

## 3. Client-side cache / user-isolation fixes

**Completed** (`frontend/src/services/api.js`, `frontend/src/services/offlineManager.js`, `frontend/src/contexts/AuthContext.jsx`):
- Added `getUserCacheTag()` (derived from the current JWT) and namespaced **every** in-memory (`apiCache` Map) and IndexedDB cache key with it — a different user's requests can no longer read another user's cached GET responses, even without a clean logout.
- Added `clearAllOfflineCaches()` — clears the in-memory cache, the IndexedDB `apiCache` store (new `clearPersistentCache()` export in `offlineManager.js`), and all 7 named Workbox service-worker caches (verified against the actual generated `sw.js`).
- Wired `clearAllOfflineCaches()` into both `AuthContext.logout()` and the axios 401-expiry interceptor, **awaited before navigating** so the async clear can't be cut short by the page unload.

## 4. Offline mutation queue fixes

**Completed** (`frontend/src/services/api.js`, `frontend/src/services/offlineManager.js`):
- Every queued offline mutation is now tagged with `userTag` (the originating user's cache tag) at queue time.
- `processOfflineQueue()` and `applyPendingMutations()` both filter the queue to only the **currently logged-in user's** entries before replaying/merging. Mismatched entries are left in the queue untouched (not deleted, not sent) so they can still sync later if that same user logs back in on the device — no data loss, no cross-user leakage.
- Entries with no `userTag` (pre-fix legacy queue items) are treated as belonging to the current user, so nothing gets permanently stuck after the upgrade.

## 5. Database / migration safety changes

**Completed** (`backend/src/main/java/.../config/DataMigrationRunner.java`):
- Wrapped each migration's `INSERT` + `DROP TABLE` in a single `TransactionTemplate.executeWithoutResult(...)` block (PostgreSQL DDL is transactional). A process interruption mid-migration now rolls back cleanly instead of risking duplicate rows on the next boot's retry.
- Re-verified in a later pass: each migration contains exactly one INSERT + one DROP inside the transaction, nothing duplicated outside it.

**Completed** — added `@Index` on the `user_id` foreign key to 7 entities: `Marks`, `Fees`, `Expense`, `ExpenseCategory`, `Subject`, `Task`, `TimetableSlot`. Applied via the **already-active** `ddl-auto=update` (purely additive, no data altered). `AttendanceRecord` was deliberately skipped — its existing `uk_attendance_user_date_subject` unique constraint already indexes `user_id` as a leftmost prefix.

**Not done (deferred — explicitly avoided per "do not blindly introduce Flyway"):**
- **No Flyway/Liquibase adoption.** There is no live database connection available in this environment to verify the actual production schema matches the entities exactly; introducing versioned migrations blind risks a startup failure in production.
- **`ddl-auto` was NOT switched to `validate`** — same reason; would need live-schema confirmation first.
- **`AttendanceConstraintMigration.java` was left untouched** — a second, pre-existing `@PostConstruct` migration class with its own idempotency guards. It wasn't the specific target of the transactional-safety finding and touching it wasn't requested.

**Manual Action Required:** Before any future schema change, either grant DB access to properly baseline Flyway, or manually verify the live schema matches current entities and decide on `ddl-auto=validate`.

## 6. Backend bug/performance fixes

**Completed:**
- `AttendanceService.updateRecord()`/`deleteRecord()`: changed the "not your record" ownership-check exception from `RuntimeException("Unauthorized")` (→ HTTP 400) to `ResourceNotFoundException` (→ HTTP 404), matching `TaskService`'s pattern.
  - **Correction to the original audit:** this finding assumed Attendance was uniquely inconsistent. Verification showed `TimetableService`, `MarksService`, `SubjectService`, `FeesService`, and `ExpenseService` **all** still use the same `RuntimeException("Unauthorized")` pattern — only `TaskService` differs. The fix was applied as explicitly requested, but it does not make the codebase fully consistent; a broader pass across the other 5 services was not done (out of scope).
- `AttendanceService.getTodayLectures()`: eliminated an N+1 query (one `findFirstByUserAndDate...` call per timetable slot) by fetching the whole day's attendance once (`findByUserAndDate`) and matching it to slots in memory. Output shape is unchanged.

## 7. Frontend bug/UX fixes

**Completed:**
- `Tasks.jsx`: fixed a missing React `key` on a list `.map()`'s top-level element (was a bare `<>` Fragment; now `<Fragment key={task.id}>`).
- `Tasks.jsx`: fixed `TILE_COLORS[task.id % TILE_COLORS.length]` producing `NaN` for string-based offline temp IDs (`Math.abs(Number(task.id) || 0) % ...`).
- `DataContext.jsx`: memoized the provider's `value` object with `useMemo`, matching `AuthContext`'s existing pattern (was previously recreated every render, causing unnecessary consumer re-renders).
- `api.js`: gated diagnostic-only `console.table`/`console.log`/`console.warn` calls (connectivity diagnostic, retry/sync chatter) behind `import.meta.env.DEV`. `console.error` calls remain unconditional.
- Deleted `frontend/src/pages/Students.jsx` and `frontend/src/components/StudentTable.jsx` after confirming (repo-wide grep + route/nav check) they were genuinely unreferenced, hardcoded mock-data dead code.

**Not done (out of the requested scope):**
- `GlobalExceptionHandler`'s broad `RuntimeException` catch (can leak internal exception messages) — a real Medium finding from the audit, but not in the explicit fix list given by the user.
- Native `alert()` used for error UX in several places instead of a toast/banner component — cosmetic inconsistency, not fixed.
- Ownership-check boilerplate duplicated across 7 backend services — not extracted into a shared helper (maintainability only, no bug).

## 8. PWA/mobile improvements

A second, separate audit specifically targeted Android/iOS PWA production-readiness. Findings and fixes:

**Completed:**
- **(Critical)** `useNotificationScheduler.js` read `Notification.permission` with no feature-detection guard, and the hook is mounted **outside** the app's `ErrorBoundary` (via `NotificationBanner` in `App.jsx`) — this crashed the entire app on any browser without the Notification API (iOS Safari < 16.4, some in-app WebViews). Fixed with a guarded initializer.
- **(High)** iOS Safari never fires `beforeinstallprompt`, so `InstallPrompt` was permanently invisible there. Added iOS detection (`useInstallPrompt.js`) and a manual "Tap Share → Add to Home Screen" instructions fallback in `InstallPrompt.jsx`.
- **(High)** `Schedule.jsx`'s daily-attendance card had a stale comment ("hidden on small touch") but no actual responsive class on its desktop button block — rendered unconditionally, causing overflow/squeeze on phone widths on one of the most-viewed screens in the app. Fixed with `hidden md:grid`; the existing swipe-to-mark gesture already calls the identical handlers, so this is zero functionality loss.
- **(Medium)** An existing `.pwa-safe-top` CSS utility (`env(safe-area-inset-top)`) was defined but wired up nowhere. Applied it to `AppLayout.jsx`/`AdminLayout.jsx`'s actual rendered top-of-viewport scroll container and to `OfflineBanner.jsx` (a `fixed top-0` element), fixing risk of content rendering under the iOS notch/status bar in standalone mode (the app opts into `black-translucent` status bar, which specifically requires this).
- **(Medium)** `AppLayout`/`AdminLayout` used `h-screen` (100vh, which includes the address-bar area on iOS Safari, causing a layout gap/jump). Switched to `h-dvh` (100dvh, Tailwind 3.4+, near-universal browser support) — verified compiling to correct CSS.
- **(Medium)** Dashboard widget drag-and-drop handle had no `touch-action: none`, letting touch-drag fight the browser's native scroll gesture. Added `touch-none` + a small tap-target increase.
- **(Low)** `unitrack-logo.png` (used as favicon + apple-touch-icon) is actually mislabeled JPEG data, oversized for a touch icon. Repointed both `index.html` `<link>` tags to the correctly-sized real PNG in `icons/`; left the logo file itself untouched (legitimately used elsewhere as the brand logo).
- **(Low)** Install-prompt dismissal was permanent despite a comment claiming "7 days" — fixed with a real timestamp + 7-day expiry check.
- **(Low)** Bumped three under-44px touch targets: `Tasks.jsx`'s complete-toggle button, `Expenses.jsx`'s category-delete button, `Dashboard.jsx`'s semester-banner dismiss button.

**Reverted during implementation (Known Issue, intentionally left unfixed):**
- Attempted to fix `navigator.onLine`'s known false-positive unreliability (can report "online" on Wi-Fi-without-real-internet) by verifying with a backend health-check ping before trusting the browser event. **Reverted** — this app relies on a Render free-tier backend with a routine 30-50s cold-start (see `wakeUpBackend()` in `api.js`), and a short health-check timeout would very plausibly misfire "you're offline" during completely normal cold starts, which is a worse regression than the original cosmetic inaccuracy. `useNetworkStatus.js` is unchanged from before this phase.

**Verified as non-issues:**
- All three real `<table>` elements (Schedule, Expenses, Marks) are correctly wrapped in `overflow-x-auto`.
- Form inputs correctly use `type="number"`/`type="date"` (no wrong-mobile-keyboard pattern).
- The one modal with real text/number inputs (Marks add/edit) is correctly `max-h-[90vh] overflow-y-auto`; two other sampled modals have short, low-overflow-risk content.
- `Topbar.jsx` was found to be **dead code** — imported in both `AppLayout.jsx` and `AdminLayout.jsx` but never actually rendered in either. The safe-area fix was also applied there for correctness if it's ever wired up, but the real fix (item above) is on the layout containers.

**Not done (explicitly out of scope for this phase, per the user's instruction):** no SMS/transaction parsing, AI features, community features, or other new product functionality.

## 9. CI / build / testing changes

**Completed:**
- Added `.github/workflows/ci.yml`: backend `mvn test` and frontend `npm run build` are **blocking** checks on push/PR to `main`. Frontend `npm run lint` runs and its full output is visible in the Actions log, but `continue-on-error: true` means a lint failure does **not** fail the job (149 pre-existing lint problems, unrelated to this work, would otherwise make every CI run red).
- The pre-existing `.github/workflows/keep-alive.yml` (Render cold-start prevention cron) is untouched.

## 10. Files/components significantly changed

**Backend:** `application.properties`, `docker-compose.yml`, `.env.example` (root + `backend/`), `DataMigrationRunner.java`, `AttendanceService.java`, entities `Marks/Fees/Expense/ExpenseCategory/Subject/Task/TimetableSlot.java`.

**Frontend:** `api.js`, `offlineManager.js`, `AuthContext.jsx`, `DataContext.jsx`, `Tasks.jsx`, `index.html`, `InstallPrompt.jsx`, `useInstallPrompt.js`, `useNotificationScheduler.js`, `OfflineBanner.jsx`, `Topbar.jsx`, `WidgetShell.jsx`, `AppLayout.jsx`, `AdminLayout.jsx`, `Dashboard.jsx`, `Expenses.jsx`, `Schedule.jsx`. Deleted: `Students.jsx`, `StudentTable.jsx`.

**New:** `.github/workflows/ci.yml`.

**Note:** `frontend/src/pages/Assignments.jsx`, `ToDo.jsx`, and their backend counterparts (`AssignmentController`, `TodoController`, `AssignmentService`, `TodoService`, `Assignment`/`Todo`/`AssignmentStatus` entities, their repositories/DTOs) were already deleted in the working tree **before** this work began, as part of a pre-existing, uncommitted Assignment/Todo → unified `Task` refactor. `AdminService.java` and `DashboardService.java` were already modified (updated to reference `Task`/`TaskType` instead of the old entities) before this work began too — this remediation did not touch either file. `DataMigrationRunner.java` (which migrates any legacy `assignments`/`todos` tables into `tasks`, later made transaction-safe by this work — see §5) and `PWA_DOCUMENTATION.md` were also already present as untracked files before this work began. None of the above was authored by this remediation — it's documented here only so its presence in `git status` isn't mistaken for scope creep.

## 11. Remaining known issues and limitations

- **No live database connection was available** in this environment at any point — all database-related verification was static (code + compile), not a real migration run against Postgres/Neon. Recommend a staging-deploy check before production.
- **No live device/browser testing was performed** for the mobile/PWA work — it is a rigorous code-level audit and fix pass, not verification on a real Android/iOS device or emulator.
- **149 pre-existing frontend lint problems** remain (unused vars, `react-hooks/set-state-in-effect`, an impure `Math.random()` call during render, escape-character warnings, etc.), spread across many files not touched by this work. Not fixed — explicitly out of scope; CI reports them without blocking.
- Two backward-compatible dashboard response fields (`AssignmentsSummary`/`TodosSummary`, alongside the new unified `TasksSummary`) still exist in `DashboardResponse` for frontend compatibility during the Task migration — not retired.
- See sections 2, 5, 6, 7, 8 above for the full list of findings deliberately deferred or left unfixed, with reasoning.

## 12. Verification results

Every group of changes was validated incrementally; final full-repo state:

- **Backend:** `./mvnw clean test` → BUILD SUCCESS, 1/1 tests pass.
- **Frontend lint:** 149 pre-existing problems, unchanged — confirmed via before/after baseline diffs on every touched file that zero new lint issues were introduced.
- **Frontend build:** succeeds; PWA service worker regenerates correctly (88 precache entries); `h-dvh` and other new Tailwind classes confirmed compiling to correct CSS.
- **Git diff:** reviewed in full after each phase; no unintended changes found outside the files listed in section 10.

One notable incident during the mobile/PWA phase: the working tree was found reset to its pre-remediation state with all prior work auto-stashed under an unexplained `"Teleport auto-stash"` entry (not created by Claude). The stash was inspected, confirmed to exactly match the expected prior state, restored via `git stash apply`, verified with a full build/test pass, then dropped. No work was lost, but this is worth being aware of if it recurs.
