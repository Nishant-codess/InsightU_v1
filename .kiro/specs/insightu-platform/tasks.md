# Implementation Plan: InsightU Platform

## Overview

This implementation plan breaks down the InsightU platform into incremental, testable steps. The platform is built with TypeScript, React, Node.js/Express, PostgreSQL, and Redis. Each task builds on previous work, with property-based tests integrated throughout to validate correctness early. The plan follows a bottom-up approach: core infrastructure → authentication → user management → academic features → real-time features → UI polish.

All 79 correctness properties from the design document are mapped to specific property-based test tasks, ensuring comprehensive validation of system behavior.

## Tasks

- [x] 1. Set up project infrastructure and core dependencies
  - Initialize monorepo with frontend (React + TypeScript) and backend (Node.js + Express + TypeScript)
  - Configure Prisma ORM with PostgreSQL schema
  - Set up Redis connection for caching and sessions
  - Configure Jest and fast-check for testing
  - Set up ESLint, Prettier, and TypeScript strict mode
  - Create base error handling utilities and types
  - _Requirements: All (foundational)_

- [x] 2. Implement database schema and models
  - [x] 2.1 Create Prisma schema for all entities
    - Define User, Student, Teacher, Parent, Admin models
    - Define LectureNote, Quiz, QuizSession, Assignment, Exam models
    - Define Performance, AcademicHealth, Notification models
    - Define Timetable, AcademicCalendar models
    - Define relationships and indexes
    - _Requirements: All data models_
  
  - [x] 2.2 Run migrations and seed test data
    - Generate and run Prisma migrations
    - Create seed script with sample data for development
    - _Requirements: All data models_


- [ ] 3. Implement authentication service
  - [x] 3.1 Create JWT token generation and validation
    - Implement generateTokens() and validateToken() functions
    - Configure token expiration (15 min access, 7 days refresh)
    - _Requirements: 1.1, 1.2_
  
  - [x]* 3.2 Write property tests for token operations
    - **Property 1: OAuth authentication produces valid tokens**
    - **Validates: Requirements 1.1**
  
  - [x] 3.3 Implement Google OAuth flow
    - Set up Passport.js with Google strategy
    - Implement initiateGoogleOAuth() and handleGoogleCallback()
    - _Requirements: 1.1_
  
  - [x] 3.4 Implement email/password authentication
    - Create password hashing with bcrypt
    - Implement registerWithEmail() and loginWithEmail()
    - _Requirements: 1.2, 1.3_
  
  - [x]* 3.5 Write property tests for authentication
    - **Property 2: Credential validation is consistent**
    - **Property 5: Authentication failure handling**
    - **Validates: Requirements 1.2, 1.5**
  
  - [x] 3.6 Implement session management
    - Create session storage in Redis
    - Implement createSession() and invalidateSession()
    - _Requirements: 19.5_
  
  - [x]* 3.7 Write property test for session expiration
    - **Property 7: Session expiration enforcement**
    - **Validates: Requirements 19.5**

- [ ] 4. Implement user service and RBAC
  - [x] 4.1 Create user registration functions
    - Implement registerStudent() with validation
    - Implement registerTeacher() and registerParent()
    - Validate registration number format (RA + digits)
    - Compute group from section and batch
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  
  - [x]* 4.2 Write property tests for student registration
    - **Property 3: Parent registration enforces email/password**
    - **Property 4: Institutional email acceptance**
    - **Property 8: Required field validation**
    - **Property 9: Registration number format validation**
    - **Property 10: Year value constraints**
    - **Property 11: Section format validation**
    - **Property 12: Batch value constraints**
    - **Property 13: Group computation**
    - **Property 14: Registration round-trip consistency**
    - **Validates: Requirements 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
  
  - [x] 4.3 Implement role-based access control
    - Create checkPermission() function
    - Define permission matrix for all roles and resources
    - Implement middleware for route protection
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x]* 4.4 Write property test for RBAC
    - **Property 6: Role-based access control**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [x] 5. Checkpoint - Ensure authentication and user management tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 6. Implement lecture notes service
  - [x] 6.1 Create file upload handling
    - Set up Multer for file uploads
    - Implement file type validation (PDF, images, slides)
    - Integrate with file storage (S3 or local for dev)
    - _Requirements: 5.1_
  
  - [x] 6.2 Implement note upload and metadata storage
    - Create uploadNote() function
    - Validate required metadata (subject, topic, lecture date)
    - Store file URL and metadata in database
    - _Requirements: 5.2, 5.3_
  
  - [ ]* 6.3 Write property tests for note uploads
    - **Property 21: File type acceptance**
    - **Property 22: Metadata requirement enforcement**
    - **Property 23: Note metadata round-trip consistency**
    - **Validates: Requirements 5.1, 5.2, 5.3**
  
  - [x] 6.4 Implement note retrieval and organization
    - Create getNotesBySubject() and getNotesByTopic()
    - Implement sorting by subject, topic, and date
    - _Requirements: 5.4, 5.5_
  
  - [ ]* 6.5 Write property tests for note retrieval
    - **Property 24: Note accessibility to students**
    - **Property 25: Note organization**
    - **Property 26: Note viewer data provision**
    - **Property 27: Download functionality**
    - **Validates: Requirements 5.4, 5.5, 6.1, 6.2**
  
  - [x] 6.6 Implement student note interactions
    - Create bookmarkNote() and unbookmarkNote()
    - Implement addAnnotation() and getAnnotations()
    - Ensure annotations don't modify original notes
    - _Requirements: 6.3, 6.4_
  
  - [ ]* 6.7 Write property tests for bookmarks and annotations
    - **Property 28: Bookmark round-trip consistency**
    - **Property 29: Annotation isolation**
    - **Validates: Requirements 6.3, 6.4**

- [x] 7. Implement notification service
  - [x] 7.1 Create notification data models and storage
    - Implement Notification schema in database
    - Create notification preferences storage
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_
  
  - [x] 7.2 Implement notification sending and retrieval
    - Create sendNotification() and sendBulkNotifications()
    - Implement getUserNotifications() with filtering
    - Create markAsRead() and markAllAsRead()
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_
  
  - [ ]* 7.3 Write property tests for notifications
    - **Property 30: Note upload notifications**
    - **Property 71: Event-triggered notifications**
    - **Property 72: Performance alert distribution**
    - **Property 73: Notification round-trip consistency**
    - **Validates: Requirements 6.5, 15.1, 15.2, 15.3, 15.4, 15.5**
  
  - [x] 7.4 Integrate notifications with note uploads
    - Trigger notifications when teachers upload notes
    - Send to all students in relevant course
    - _Requirements: 6.5_


- [x] 8. Implement quiz service core functionality
  - [x] 8.1 Create quiz definition and storage
    - Implement createQuiz() with question validation
    - Validate multiple-choice format and topic tags
    - Store quiz definitions in database
    - _Requirements: 7.1_
  
  - [ ]* 8.2 Write property test for quiz creation
    - **Property 31: Quiz question validation**
    - **Validates: Requirements 7.1**
  
  - [x] 8.3 Implement quiz session management
    - Create startQuizSession() with unique code generation
    - Generate QR codes using qrcode library
    - Store session state in Redis for fast access
    - _Requirements: 7.2_
  
  - [ ]* 8.4 Write property test for session codes
    - **Property 32: Session code uniqueness**
    - **Validates: Requirements 7.2**

- [x] 9. Implement real-time quiz features with WebSocket
  - [x] 9.1 Set up Socket.io server and client
    - Configure Socket.io on Express server
    - Create WebSocket connection handling
    - Implement room-based communication for quiz sessions
    - _Requirements: 7.3, 18.1_
  
  - [x] 9.2 Implement student joining and participation
    - Create joinSession() for students
    - Implement submitAnswer() with timestamp recording
    - Store answers in Redis during session, persist to DB on completion
    - _Requirements: 8.1, 8.3_
  
  - [ ]* 9.3 Write property tests for quiz participation
    - **Property 36: Session joining**
    - **Property 37: Question options provision**
    - **Property 38: Answer recording round-trip**
    - **Validates: Requirements 8.1, 8.2, 8.3**
  
  - [x] 9.4 Implement live leaderboard
    - Create updateLeaderboard() function
    - Calculate scores in real-time as answers submitted
    - Broadcast leaderboard updates via WebSocket
    - _Requirements: 7.4, 8.4_
  
  - [ ]* 9.5 Write property tests for leaderboard
    - **Property 33: Live leaderboard availability**
    - **Property 39: Leaderboard updates**
    - **Validates: Requirements 7.4, 8.4, 18.3**
  
  - [x] 9.6 Implement quiz completion and results
    - Create endQuizSession() function
    - Persist all answers from Redis to database
    - Calculate final scores and rankings
    - Generate topic-level analytics from quiz results
    - _Requirements: 7.5, 7.6, 8.5_
  
  - [ ]* 9.7 Write property tests for quiz results
    - **Property 34: Topic-level quiz analytics**
    - **Property 35: Quiz results accessibility**
    - **Property 40: Response persistence on session end**
    - **Validates: Requirements 7.5, 7.6, 8.5, 18.5**

- [x] 10. Checkpoint - Ensure quiz system tests pass
  - Ensure all tests pass, ask the user if questions arise.



- [x] 11. Implement dynamic theme system
  - [x] 11.1 Create ThemeContext and ThemeProvider
    - Define `ThemeDefinition` interface and `ThemeId` union type (`'spiderman' | 'doraemon' | 'dark-professional' | 'standard-professional' | 'anime'`)
    - Implement `applyTheme(themeId: ThemeId): void` using CSS custom properties on `:root`
    - Create `ThemeProvider` component wrapping the app in `main.tsx`
    - Implement role-based default theme resolution: STUDENT→spiderman, TEACHER→standard-professional, PARENT→doraemon, ADMIN→dark-professional
    - Persist selected theme to `localStorage` and PATCH `/api/user/preferences`
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.9_

  - [x] 11.2 Implement all 5 theme definitions
    - Spiderman theme: primary `#E23636`, dark bg `#0A0A0F`, web-pattern decorative CSS variables
    - Doraemon theme: primary `#1E90FF`, dark bg `#0D1B2A`, floating gadget particle CSS variables
    - Dark Professional theme: primary `#66FCF1`, bg `#0B0C10`, particle mesh CSS variables
    - Standard Professional theme: primary `#4F46E5`, light bg `#F8FAFC`, clean minimal CSS variables
    - Anime/Cartoon theme: primary `#FF6B9D`, bg `#1A0A2E`, star/sparkle particle CSS variables
    - Update `tailwind.config.js` to use CSS variables for all theme colors (e.g., `brand: 'var(--color-brand)'`)
    - _Requirements: 18.8, 18.9_

  - [x] 11.3 Build ThemeSwitcher UI component
    - Create `ThemeSwitcher` component accessible from all pages (floating button or settings panel)
    - Display theme preview swatches for each of the 5 themes
    - Animate theme transition on switch (CSS transition on `:root` variables)
    - _Requirements: 18.1, 18.6_

  - [ ]* 11.4 Write property tests for theme system
    - **Property 80: Role-based default theme assignment** — for any UserRole, `resolveDefaultTheme(role)` returns the correct ThemeId
    - **Property 81: Theme application sets all required CSS variables** — for any ThemeId, `applyTheme()` sets all required CSS custom properties on `:root`
    - **Property 82: Theme preference round-trip** — persisting then loading a theme preference returns the same ThemeId
    - **Property 83: Theme switching is idempotent** — applying the same theme twice produces the same CSS variable state as applying it once
    - **Validates: Requirements 18.2, 18.3, 18.4, 18.5, 18.6, 18.7**

- [x] 12. Implement background animations and 3D elements
  - [x] 12.1 Implement SpidermanBackground component
    - Animated web-pattern SVG overlay with CSS keyframe animations
    - Comic-style decorative elements (halftone dots, action lines)
    - Respect `prefers-reduced-motion` media query
    - _Requirements: 19.2_

  - [x] 12.2 Implement DoraemonBackground component
    - Canvas-based floating particle system using `requestAnimationFrame`
    - Futuristic gadget-style particles (circles, diamonds)
    - Cap at 80 particles on mobile (viewport width < 768px)
    - _Requirements: 19.3_

  - [x] 12.3 Implement DarkProBackground component
    - Canvas-based particle mesh / grid animation
    - Subtle, professional aesthetic with low-opacity connecting lines
    - _Requirements: 19.4_

  - [x] 12.4 Implement AnimeBackground component
    - Star/sparkle particle field using canvas with twinkle animation
    - _Requirements: 19.1_

  - [x] 12.5 Implement Framer Motion page transitions
    - Create `PageTransition` wrapper component with `opacity` + `y` variants
    - Wrap all route-level components in `App.tsx` with `PageTransition`
    - _Requirements: 19.7_

  - [x] 12.6 Add micro-animations to interactive elements
    - Add hover scale/glow/lift CSS transitions (≤150ms) to all card and button components
    - Add chart entry animations (animate data on initial render) to Chart.js charts
    - Add pulsing CSS animation to the currently-ongoing timetable class card
    - _Requirements: 19.5, 19.6, 19.8_

- [x] 13. Implement HTML scraper and timetable engine
  - [x] 13.1 Implement Puppeteer portal login and HTML fetch
    - Install `puppeteer` in the backend
    - Create `backend/src/services/timetable/portalFetcher.ts`
    - Implement `fetchPortalHTML(loginId: string, password: string): Promise<string>` using headless Chromium
    - Navigate to SRM academia portal, fill login form, detect login failure, navigate to timetable page, return `page.content()`
    - Wrap browser launch/close in try/finally to guarantee credential cleanup
    - Define `PortalAuthError` class with codes: `INVALID_CREDENTIALS`, `PORTAL_UNREACHABLE`, `SESSION_TIMEOUT`
    - Ensure the API route for this endpoint excludes request body from Winston logs
    - _Requirements: 20.1, 20.7, 20.8, 20.9_

  - [x] 13.2 Implement cheerio HTML parser service
    - Create `backend/src/services/timetable/scraper.ts`
    - Implement `parsePortalHTML(html: string): ScraperOutput`
    - Implement `parseProfileTable()`: extract Registration Number, Name, Program, Department, Semester, Batch from first HTML table
    - Implement `parseSlotTable()`: extract Course Code, Course Title, Faculty Name, Slot, Room No from second HTML table
    - Classify slot type: `"lab"` if slot identifier contains `"+"`, `"theory"` otherwise
    - Define `ScraperError` class with `TABLE_1_NOT_FOUND` / `TABLE_2_NOT_FOUND` error codes
    - _Requirements: 20.3, 20.4, 20.5, 20.6_

  - [x] 13.3 Compose full sync pipeline and API endpoints
    - Create `syncTimetable(input: PortalSyncInput): Promise<ScraperOutput>` — called once, stores PersonalSlot records permanently
    - Create `syncAttendanceAndMarks(input: PortalSyncInput): Promise<AttendanceMarksOutput>` — called on-demand, overwrites Last_Synced_Data in DB
    - Create `POST /api/student/timetable/sync` route (one-time timetable import)
    - Create `POST /api/student/portal/sync` route (on-demand attendance + marks refresh)
    - Both routes: never log request body, discard credentials immediately after Puppeteer session closes
    - _Requirements: 20.5, 20.6, 20.7, 20.8, 20.9_

  - [ ]* 13.4 Write property tests for cheerio parser
    - **Property 84: Slot type classification** — for any slot string, contains `"+"` ↔ type is `"lab"`
    - **Property 85: Scraper idempotence** — parsing the same HTML twice produces identical PersonalSlot records
    - **Property 86: Profile field completeness** — for any valid HTML, all 6 profile fields are present in output
    - **Property 87: Slot row count preservation** — number of output slots equals number of data rows in second table
    - **Property 88: Error on missing tables** — HTML without expected table structure returns `ScraperError` with correct code
    - **Validates: Requirements 20.3, 20.4, 20.5, 20.6, 20.10**

  - [x] 13.3 Implement Day Order timetable engine
    - Create `getDailySchedule(studentId: string, date: Date, batch: string): Promise<DailySchedule | HolidayResult>`
    - Look up `date` in `CalendarDay` table to get `dayOrder`
    - Join student's `PersonalSlot` records with `UnifiedSlot` by slot identifier and batch for that `dayOrder`
    - Implement `computeIsOngoing(startMinutes: number, endMinutes: number): boolean`
    - Mark the next upcoming period in the returned schedule
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6_

  - [ ]* 13.4 Write property tests for timetable engine
    - **Property 89: Day Order lookup completeness** — for any date in the active calendar, `getDailySchedule` returns a result (schedule or holiday)
    - **Property 90: Daily schedule ordering invariant** — returned periods are always ordered by `startTime` ascending
    - **Property 91: Ongoing class detection correctness** — `computeIsOngoing(start, end)` returns true iff `start ≤ now < end`
    - **Validates: Requirements 21.1, 21.2, 21.3, 21.4**

  - [x] 13.5 Implement Admin Academic Calendar upload endpoint
    - Create `POST /api/admin/calendar` route
    - Validate JSON body: all keys are valid ISO date strings, all values are integers 1–5 or `"Holiday"`
    - On valid upload, store entries as active `CalendarDay` records and deactivate previous active calendar
    - Return list of invalid entries on validation failure
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

  - [ ]* 13.6 Write property tests for calendar validation
    - **Property 94: Calendar validation rejects invalid entries** — for any JSON with at least one invalid date key or out-of-range value, the endpoint returns a rejection with all invalid entries listed
    - **Validates: Requirements 22.2, 22.3**

  - [x] 13.7 Build portal sync UI (student-facing)
    - **Timetable sync (one-time):** Add "Import Timetable from SRM" form to `TimetableDetail.tsx` — shown only if no PersonalSlot records exist yet. Fields: SRM Login ID + SRM Password. Show loading spinner (10–20s), success with slot count, or error message. Privacy notice: "Your SRM credentials are used only to fetch your timetable and are never stored."
    - **Attendance & marks sync (on-demand):** Add "Refresh from SRM Portal" button to the student dashboard and performance pages. Clicking it opens a modal asking for SRM Login ID + Password. On submit, triggers attendance + marks scrape, updates displayed data, shows last-synced timestamp. Same privacy notice.
    - Both forms: `type="password"` for SRM password field, clear state after submit regardless of outcome
    - _Requirements: 20.1, 20.6, 20.8, 20.9, 21.6_

- [x] 14. Implement vacation predictor
  - [x] 14.1 Implement vacation predictor backend
    - Create `backend/src/services/holiday/vacationPredictor.ts`
    - Implement `countWorkingDays(startDate: Date, endDate: Date, calendar: CalendarDay[]): number` excluding holidays
    - Implement `computeRiskScore(projectedAttendance: number): number` returning 0–10 score
    - Create `POST /api/student/holiday-planner/risk` endpoint accepting `{ startDate, endDate, currentAttendance }`
    - _Requirements: 23.1, 23.2, 23.3, 23.6_

  - [ ]* 14.2 Write property tests for vacation predictor
    - **Property 92: Risk score monotonicity** — for any two projected attendance values `a < b`, `computeRiskScore(a) >= computeRiskScore(b)`
    - **Property 93: Working day count excludes holidays** — for any date range, `countWorkingDays` ≤ total calendar days in range
    - **Validates: Requirements 23.1, 23.2, 23.3**

  - [x] 14.3 Build vacation predictor UI
    - Update `HolidayPlanner.tsx` with date range picker for `startDate`/`endDate`
    - Add subject attendance input fields
    - Display Survival Risk Score as a 0–10 gauge/progress indicator
    - Show critical red warning with alert animation when projected attendance < 75%
    - Show "Danger Zone" warning banner when risk score ≥ 8
    - Animate risk score reveal on calculation
    - _Requirements: 23.4, 23.5_

- [x] 15. Implement academic health analytics dashboard
  - [x] 15.1 Implement analytics backend service
    - Implement `calculateAcademicHealthScore(studentId: string): Promise<number>` in `backend/src/services/analytics/performance.ts`
    - Implement `identifyWeakSubjects(studentId: string, threshold = 60): Promise<string[]>`
    - Implement `identifyWeakTopics(studentId: string, threshold = 50): Promise<TopicPerformance[]>`
    - Implement `getPerformanceTrends(studentId: string): Promise<PerformanceTrend[]>`
    - Implement `getStudyRecommendations(studentId: string): Promise<StudyRecommendation[]>`
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7_

  - [ ]* 15.2 Write property tests for analytics
    - **Property 15: Subject-wise marks visualization** — for any student with performance data, all subjects with recorded marks appear in chart data
    - **Property 17: Academic health score calculation** — score is always in range [0, 100]
    - **Property 18: Weak subject identification** — every subject returned by `identifyWeakSubjects` has average score < threshold
    - **Property 19: Weak topic identification** — every topic returned by `identifyWeakTopics` has average score < 50%
    - **Validates: Requirements 24.1, 24.2, 24.3, 24.4, 24.5**

  - [x] 15.3 Build analytics dashboard UI
    - Add Academic Health Score ring/gauge chart to `PerformanceDetail.tsx`
    - Show "At Risk" badge when score < 60%
    - Add subject-wise performance bar or radar chart with Chart.js
    - Add weak subject and weak topic cards with distinct visual indicators
    - Add performance trend line chart with animation on render
    - Display recommended lecture notes for each weak area
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7_

- [x] 16. Implement collaborative section feed
  - [x] 16.1 Implement section feed backend
    - Add `SectionComment` Prisma model with `postId`, `authorId`, `authorName`, `content`, `createdAt` fields
    - Add `sectionKey` denormalized column to `SectionPost` (format: `"{year}-{section}-{department}"`)
    - Run Prisma migration for new models/columns
    - Implement `createPost(authorId, sectionKey, content, attachments)`, `getPosts(sectionKey, cursor)` with cursor pagination, `addComment(postId, authorId, content)`
    - Implement `assertMembership(userId, sectionKey)` authorization check
    - Set up Multer for file attachment support on post creation
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.7_

  - [ ]* 16.2 Write property tests for section feed
    - **Property 95: Section feed scoping** — `getPosts` for sectionKey A never returns posts created for sectionKey B
    - **Property 96: Section post data completeness** — every post returned includes authorName, role, timestamp, content
    - **Property 97: Section comment round-trip** — a comment added to a post is returned when fetching that post's comments
    - **Validates: Requirements 25.1, 25.2, 25.3, 25.5, 25.6**

  - [x] 16.3 Build section feed UI
    - Update `SectionDashboard.tsx` with GCR-style post feed scoped to user's section
    - Add post creation form with text input and file attachment button
    - Render comment thread per post (expandable)
    - Display author name, role badge (Student/Teacher), and timestamp on each post
    - Subscribe to WebSocket room for real-time new post updates
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.7_

- [x] 17. Implement real-time smart board and notes sync
  - [x] 17.1 Implement smart board backend
    - Update `backend/src/services/sync/smartBoard.ts` with teacher note upload handler
    - Store note with subject, topic, and file metadata via `LectureNote` model
    - On upload, broadcast WebSocket event to section room: `{ type: 'NEW_NOTE', noteId, title, subject }`
    - Implement student annotation storage: `createAnnotation(studentId, noteId, page, x, y, text)`
    - Enforce annotation isolation: `getAnnotations(studentId, noteId)` returns only that student's annotations
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.6_

  - [ ]* 17.2 Write property tests for smart board
    - **Property 29: Annotation isolation** — `getAnnotations(studentA, noteId)` never returns annotations created by studentB
    - **Property 30: Note upload notifications** — for any note upload, a WebSocket event is emitted to the correct section room
    - **Validates: Requirements 26.4, 26.5, 26.6**

  - [x] 17.3 Build smart board UI (teacher)
    - Add note upload form to teacher dashboard: subject, topic, and file fields
    - Show upload progress indicator
    - Display list of uploaded notes with subject/topic/date
    - _Requirements: 26.1_

  - [x] 17.4 Build smart board UI (student)
    - Integrate PDF.js (or `react-pdf`) in `NotesViewer.tsx` for in-app document viewing
    - Add bookmark button per note
    - Implement click-to-annotate on document pages (capture page number + click coordinates)
    - Add annotation sidebar showing saved annotations for the current note
    - Show real-time notification banner when a new note is uploaded (via WebSocket)
    - _Requirements: 26.2, 26.3, 26.4, 26.5, 26.6_

- [x] 18. Final checkpoint - Full integration test
  - Run all property-based tests (Properties 1–97) and ensure all pass
  - Verify theme switching applies correct CSS variables across all 4 role dashboards
  - Verify HTML scraper correctly parses sample portal HTML and produces PersonalSlot records
  - Verify timetable daily timeline shows correct Day Order schedule for a given date
  - Verify vacation predictor risk score is monotonically non-increasing as projected attendance increases
  - Verify section feed scoping prevents cross-section data leakage
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Implement live quiz power-ups and enhanced UI
  - [x] 19.1 Implement power-up system backend
    - Add `PowerUp` model: type (`FIFTY_FIFTY` | `TIME_FREEZE` | `DOUBLE_POINTS` | `SHIELD`), used flag, sessionId, studentId
    - Grant one of each power-up to every student when they join a session
    - Implement `activatePowerUp(sessionId, studentId, type)` with effect logic per type
    - _Requirements: 8.6, 8.7, 8.8, 8.9, 8.10, 8.11_

  - [x] 19.2 Build animated live quiz UI
    - Redesign `LiveQuiz.tsx` with fun animated question cards, countdown ring timer, and bouncing answer buttons
    - Add power-up tray at the bottom of the question screen — each power-up shows as an icon button, greys out after use
    - Add animated waiting lobby showing player avatars joining in real-time
    - Add post-question score reveal animation (correct = green burst, wrong = red shake)
    - Add final leaderboard screen with top-3 podium, confetti animation, and rank reveal
    - _Requirements: 7.4, 7.7, 8.2, 8.6_

  - [x]* 19.3 Write property tests for power-ups
    - Each power-up can only be used once per session per student
    - 50/50 always removes exactly 2 incorrect options, never the correct one
    - Double Points exactly doubles the awarded score for that question
    - _Requirements: 8.7, 8.8, 8.9, 8.10_

- [x] 20. Implement "Make Your Own Quiz" feature
  - [x] 20.1 Build quiz builder backend
    - Add `quizVisibility` field to Quiz model (`PRIVATE` | `SHAREABLE`)
    - Implement `createQuiz(authorId, definition, visibility)` — available to both students and teachers
    - Implement `getUserQuizLibrary(userId)` returning all quizzes created by the user
    - Reuse existing `startQuizSession()` for shareable student quizzes
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.6_

  - [x] 20.2 Build quiz builder UI
    - Create `/quiz/builder` page with question editor: text input, 4 option inputs, correct answer selector, topic tag, points
    - Add "Add Question" / "Remove Question" controls
    - Add visibility toggle (Private / Shareable)
    - Add "My Quiz Library" section on student dashboard showing created quizzes with play/share/edit actions
    - _Requirements: 28.1, 28.2, 28.3, 28.6_

  - [x] 20.3 Implement solo practice mode
    - Create solo quiz runner: presents questions one at a time with timer, no WebSocket needed
    - Show results summary at end: score, correct/incorrect per question, topic breakdown
    - Store attempt in quiz history
    - _Requirements: 28.5, 28.7_

- [x] 21. Implement AI-powered mock test generator
  - [x] 21.1 Build AI provider configuration
    - Add `AIProviderConfig` model: userId, provider (`OPENAI` | `GEMINI` | `CUSTOM`), apiKey (encrypted at rest), baseUrl (for custom)
    - Create `GET/PUT /api/user/ai-config` endpoints
    - Add AI provider settings panel in user profile/settings page
    - _Requirements: 29.8, 29.9_

  - [x] 21.2 Build PDF text extraction and AI question generation
    - Use `pdf-parse` to extract text from uploaded PDFs
    - Build `generateQuestionsFromText(text, count, difficulty, apiConfig)` that calls the configured AI provider with a structured prompt
    - Parse AI response into `QuizQuestion[]` format
    - _Requirements: 29.2, 29.3, 29.4_

  - [x] 21.3 Build mock test creation flow
    - Create `POST /api/mock-tests` endpoint: accepts name, subject, topics, question count, difficulty, PDF uploads
    - Store finalized test as a `MockTest` with associated questions
    - Allow teacher to assign test to a section with optional time window
    - _Requirements: 29.1, 29.5, 29.6, 29.7_

  - [x] 21.4 Build mock test creation UI
    - Create `/mock-tests/create` page with: test name, subject, topic tags, question count slider, difficulty selector, PDF upload zone
    - Show AI-generated questions in a review list — each question has edit, delete, and regenerate buttons
    - Add "Finalize Test" button that saves and optionally assigns to section
    - _Requirements: 29.1, 29.4, 29.5, 29.6, 29.7_

- [x] 22. Implement secure mock test environment
  - [x] 22.1 Build proctoring backend
    - Add `MockTestAttempt` model: testId, studentId, answers, startedAt, submittedAt, timeTaken, violations (JSON array of `{type, timestamp}`)
    - Create `POST /api/mock-tests/:id/start` and `POST /api/mock-tests/:id/submit` endpoints
    - Store violation events sent from the client
    - _Requirements: 30.8, 30.9_

  - [x] 22.2 Build secure test runner UI
    - Create `/mock-tests/:id/take` page that opens in a new tab
    - On load: request Fullscreen API, request webcam access
    - Implement fullscreen exit detection → warning overlay → violation log → auto-submit after 3 violations
    - Implement `visibilitychange` / `blur` event detection for tab switch violations
    - Disable right-click, text selection, and copy-paste via CSS + event listeners
    - Show webcam feed thumbnail (bottom-right corner, 120×90px)
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5, 30.7_

  - [x] 22.3 Implement face detection for proctoring
    - Integrate `face-api.js` (runs in browser, no server needed) for real-time face detection on the webcam feed
    - If no face detected for 10 consecutive seconds, show warning alert
    - Log face-not-detected events as violations
    - _Requirements: 30.6_

  - [x] 22.4 Build test results view for teachers
    - Add mock test results page showing per-student: score, time taken, violation summary (count and types)
    - Flag students with 3+ violations with a distinct visual indicator
    - _Requirements: 30.9_

- [x] 23. Final checkpoint — full platform integration test
  - Supersedes task 18 — run all property-based tests (Properties 1–97+)
  - Verify live quiz power-ups apply correct effects and can only be used once
  - Verify student-created shareable quiz launches as a live session with leaderboard
  - Verify AI mock test generation produces valid questions from a sample PDF
  - Verify mock test fullscreen enforcement and violation logging work correctly
  - Ensure all tests pass, ask the user if questions arise.
