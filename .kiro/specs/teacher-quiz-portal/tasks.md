# Implementation Plan: Teacher Quiz Portal

## Overview

This plan implements a Kahoot-style teacher-only quiz creation and hosting feature. Teachers enter a topic and/or upload a PDF, configure session parameters (question count, time per question, max participants, power-ups), and the AI generates questions. A QR code is generated for participants to join via `/join/:sessionCode`. The implementation extends existing quiz infrastructure with RBAC enforcement, schema changes, new endpoints, and two new frontend pages.

## Tasks

- [ ] 1. Schema migration — add maxParticipants and enabledPowerUps to QuizSession
  - Create Prisma migration file `add_teacher_quiz_portal_fields`
  - Add `maxParticipants Int @default(30)` to QuizSession model
  - Add `enabledPowerUps String[] @default([])` to QuizSession model
  - Run `npx prisma migrate dev` to apply migration
  - Run `npx prisma generate` to update Prisma client
  - _Requirements: 3.3, 4.5_

- [ ] 2. Extend startQuizSession() to accept maxParticipants and enabledPowerUps
  - [ ] 2.1 Update startQuizSession() function signature in backend/src/services/quiz/core.ts
    - Add optional `options` parameter with `maxParticipants?: number` and `enabledPowerUps?: PowerUpType[]`
    - Default maxParticipants to 30, enabledPowerUps to all four types
    - Store both fields in the QuizSession database record
    - Seed both fields into the Redis state object under keys `maxParticipants` and `enabledPowerUps`
    - _Requirements: 3.3, 4.5_

  - [ ]* 2.2 Write property test for startQuizSession() with options
    - **Property 6: Enabled power-ups are persisted and retrievable**
    - **Validates: Requirements 4.5**
    - Generate random subsets of PowerUpType array
    - Call startQuizSession with each subset
    - Retrieve session from database and assert enabledPowerUps matches
    - Tag: `Feature: teacher-quiz-portal, Property 6: Enabled power-ups are persisted and retrievable`

- [ ] 3. Update grantPowerUpsToStudent() to filter by session's enabledPowerUps
  - [ ] 3.1 Modify grantPowerUpsToStudent() in backend/src/services/quiz/powerups.ts
    - Fetch the QuizSession record to get enabledPowerUps array
    - Filter powerUpTypes array to only include types present in enabledPowerUps
    - Create PowerUp records only for filtered types
    - _Requirements: 4.3, 4.4_

  - [ ]* 3.2 Write property test for power-up grant filtering
    - **Property 5: Power-up grant respects session configuration**
    - **Validates: Requirements 4.3, 4.4**
    - Generate random subsets of PowerUpType array as enabledPowerUps
    - Create mock session with that configuration
    - Call grantPowerUpsToStudent
    - Assert exactly the enabled types are created in database
    - Tag: `Feature: teacher-quiz-portal, Property 5: Power-up grant respects session configuration`

- [ ] 4. Add RBAC guard to POST /api/quiz
  - [ ] 4.1 Add checkPermission middleware to existing POST /api/quiz route
    - Import checkPermission from backend/src/middleware/rbac.ts
    - Add `checkPermission(['TEACHER'])` middleware before the route handler
    - Update error message to "Forbidden: Only teachers can create quizzes"
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 4.2 Write property test for non-teacher rejection
    - **Property 1: Non-teacher roles are always rejected from quiz creation**
    - **Validates: Requirements 1.1, 1.2**
    - Generate random UserRole values excluding TEACHER
    - Mock authenticated requests with each role
    - Assert all return HTTP 403 with correct error message
    - Tag: `Feature: teacher-quiz-portal, Property 1: Non-teacher roles are always rejected from quiz creation`

- [ ] 5. Create POST /api/teacher/quiz/create endpoint
  - [ ] 5.1 Implement multipart endpoint in backend/src/routes/teacher.ts
    - Import multer for file upload handling
    - Add `POST /quiz/create` route with `authenticate` and `checkPermission(['TEACHER'])` middleware
    - Accept multipart fields: topic (required), questionCount (1-50, default 10), timePerQuestion (10-300, default 30), maxParticipants (1-500, default 30), enabledPowerUps (JSON array), pdf (optional, PDF only)
    - Validate all numeric ranges and return 400 with specific error messages for violations
    - If PDF provided, call extractTextFromPDF() from backend/src/services/ai/questionGenerator.ts
    - Call generateQuestionsFromText() with extracted text or topic, questionCount, MEDIUM difficulty, userId
    - Handle AI errors: NO_AI_CONFIG → 422 "AI provider not configured", zero questions → 422 "No questions could be generated"
    - Call createQuiz() with generated questions, authorId = userId, teacherId = teacherId, visibility = SHAREABLE
    - Call startQuizSession() with maxParticipants and enabledPowerUps options
    - Return 201 with { quiz, session: { id, sessionCode, qrCodeUrl, status, maxParticipants, enabledPowerUps } }
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1_

  - [ ]* 5.2 Write unit tests for input validation
    - Test missing topic → 400 "Topic is required"
    - Test non-PDF file → 400 "Only PDF files are supported"
    - Test questionCount out of range → 400 with specific message
    - Test timePerQuestion out of range → 400 with specific message
    - Test maxParticipants out of range → 400 with specific message
    - _Requirements: 2.2, 2.3, 3.4, 3.5, 3.6_

  - [ ]* 5.3 Write property test for topic validation
    - **Property 2: Topic validation rejects all-whitespace inputs**
    - **Validates: Requirements 2.2**
    - Generate arbitrary whitespace strings (spaces, tabs, newlines)
    - Submit each as topic field
    - Assert 400 response with "Topic is required"
    - Tag: `Feature: teacher-quiz-portal, Property 2: Topic validation rejects all-whitespace inputs`

  - [ ]* 5.4 Write property test for file type validation
    - **Property 3: File type validation rejects all non-PDF uploads**
    - **Validates: Requirements 2.3**
    - Generate arbitrary MIME types excluding application/pdf
    - Submit mock files with each MIME type
    - Assert 400 response with "Only PDF files are supported"
    - Tag: `Feature: teacher-quiz-portal, Property 3: File type validation rejects all non-PDF uploads`

  - [ ]* 5.5 Write property test for numeric range validation
    - **Property 4: Numeric range validation is consistent across all out-of-range values**
    - **Validates: Requirements 3.4, 3.5, 3.6**
    - Generate integers outside [1, 50] for questionCount
    - Generate integers outside [10, 300] for timePerQuestion
    - Generate integers outside [1, 500] for maxParticipants
    - Assert correct validation error for each
    - Generate integers inside each range and assert no error
    - Tag: `Feature: teacher-quiz-portal, Property 4: Numeric range validation is consistent across all out-of-range values`

  - [ ]* 5.6 Write property test for quiz creation round-trip
    - **Property 7: Quiz creation round-trip preserves all input fields**
    - **Validates: Requirements 5.5**
    - Generate random valid topics, question counts, time per question, max participants
    - Mock AI to return exact number of questions requested
    - Call endpoint and retrieve created Quiz record
    - Assert authorId, visibility, timePerQuestion, question count match inputs
    - Tag: `Feature: teacher-quiz-portal, Property 7: Quiz creation round-trip preserves all input fields`

- [ ] 6. Create public POST /api/quiz/session/:sessionCode/join endpoint
  - [ ] 6.1 Implement join endpoint in backend/src/routes/quiz.ts
    - Add `POST /session/:sessionCode/join` route (no authentication required)
    - Accept JSON body with `displayName` field
    - Fetch session from Redis using sessionCode
    - Return 404 if session not found
    - Check session status: if IN_PROGRESS or COMPLETED, return 409 "This quiz has already started or ended."
    - Check participant count: if equals maxParticipants, return 409 "This quiz session is full."
    - Generate guestId for unauthenticated users or use userId for authenticated
    - Add participant to Redis state participants array
    - Call grantPowerUpsToStudent() with sessionId and participantId
    - Emit `participantJoined` WebSocket event with updated count
    - Return 200 with { success: true, participantCount, guestId }
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 6.2 Write unit tests for join endpoint error cases
    - Test session not found → 404
    - Test session IN_PROGRESS → 409 "already started or ended"
    - Test session COMPLETED → 409 "already started or ended"
    - Test session at capacity → 409 "session is full"
    - _Requirements: 7.4, 7.5_

- [ ] 7. Create GET /api/teacher/quizzes endpoint
  - [ ] 7.1 Implement teacher quiz library endpoint in backend/src/routes/teacher.ts
    - Add `GET /quizzes` route with `authenticate` and `checkPermission(['TEACHER'])` middleware
    - Fetch teacher record from userId
    - Query Quiz table where teacherId equals teacher.id
    - Include session count and lastPlayedAt from QuizSession table
    - Return array of { id, title, subject, createdAt, sessionCount, lastPlayedAt }
    - _Requirements: 9.2_

  - [ ]* 7.2 Write property test for quiz count stat card
    - **Property 11: Quiz count stat card reflects actual quiz count**
    - **Validates: Requirements 9.4**
    - Generate random quiz counts N (0-100)
    - Mock dashboard API to return N quizzes
    - Assert stat card displays N
    - Tag: `Feature: teacher-quiz-portal, Property 11: Quiz count stat card reflects actual quiz count`

- [ ] 8. Create POST /api/teacher/quiz/:quizId/relaunch endpoint
  - [ ] 8.1 Implement relaunch endpoint in backend/src/routes/teacher.ts
    - Add `POST /quiz/:quizId/relaunch` route with `authenticate` and `checkPermission(['TEACHER'])` middleware
    - Fetch quiz record to verify it exists and belongs to teacher
    - Fetch most recent QuizSession for that quiz to get maxParticipants and enabledPowerUps
    - Call startQuizSession() with those options (or defaults if no previous session)
    - Return 201 with { session: { id, sessionCode, qrCodeUrl, status, maxParticipants, enabledPowerUps } }
    - _Requirements: 9.3_

  - [ ]* 8.2 Write integration test for relaunch flow
    - Create a quiz with specific maxParticipants and enabledPowerUps
    - Start a session
    - Call relaunch endpoint
    - Assert new session has same configuration

- [ ] 9. Create TeacherQuizCreate frontend page
  - [ ] 9.1 Create frontend/src/pages/teacher/TeacherQuizCreate.tsx component
    - Implement two-phase component: creation form and lobby screen
    - Creation form fields: topic (text input, required), questionCount (number input, 1-50, default 10), timePerQuestion (number input, 10-300, default 30), maxParticipants (number input, 1-500, default 30), enabledPowerUps (four toggle switches, default all enabled), pdfFile (file input, PDF only)
    - Validate all fields client-side before submission
    - Display inline validation errors (not toasts)
    - On submit: POST to /api/teacher/quiz/create with multipart/form-data
    - On success: transition to lobby screen with sessionCode, qrCodeUrl, participantCount
    - Lobby screen: display QR code image, session code text, "Waiting for participants..." status, live participant count
    - Connect to Socket.io, join session room, listen for `participantJoined` events
    - "Start Quiz" button emits `startQuiz { sessionCode }` and navigates to `/quiz/:sessionCode`
    - Display warning banner if AI returns fewer questions than requested
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 9.2 Write property test for participant count display
    - **Property 9: Participant count display reflects WebSocket events**
    - **Validates: Requirements 6.4**
    - Generate random sequences of participantJoined events with varying counts
    - Simulate receiving each event
    - Assert displayed count equals last event's count
    - Tag: `Feature: teacher-quiz-portal, Property 9: Participant count display reflects WebSocket events`

- [ ] 10. Create JoinQuiz frontend page
  - [ ] 10.1 Create frontend/src/pages/quiz/JoinQuiz.tsx component
    - Public page (no authentication required)
    - Display name entry field and "Join Quiz" button
    - On submit: POST to /api/quiz/session/:sessionCode/join with { displayName }
    - On success: navigate to `/quiz/:sessionCode`
    - Display error messages inline: "This quiz has already started or ended." or "This quiz session is full."
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 10.2 Write unit tests for JoinQuiz error states
    - Test session not found error display
    - Test session already started error display
    - Test session full error display

- [ ] 11. Add TeacherRoute guard component
  - [ ] 11.1 Create frontend/src/components/guards/TeacherRoute.tsx
    - Check user role from useAuthStore
    - If user is null or role is not TEACHER, redirect to /dashboard
    - Otherwise render children
    - _Requirements: 1.4, 1.5_

  - [ ]* 11.2 Write unit test for TeacherRoute guard
    - Test redirect for STUDENT role
    - Test redirect for PARENT role
    - Test render for TEACHER role
    - Test redirect for null user

- [ ] 12. Wire up routes in App.tsx
  - [ ] 12.1 Update frontend/src/App.tsx
    - Import TeacherRoute guard
    - Import TeacherQuizCreate and JoinQuiz components
    - Add route `/teacher/quiz/create` inside DashboardLayout wrapped with TeacherRoute
    - Add route `/join/:sessionCode` outside DashboardLayout (public)
    - Wrap existing `/quiz/builder` route with TeacherRoute
    - _Requirements: 1.4, 1.5, 7.1, 9.1_

- [ ] 13. Update TeacherDashboard "Create Quiz" button
  - [ ] 13.1 Update frontend/src/pages/dashboards/TeacherDashboard.tsx
    - Wire "Create Quiz" button to `navigate('/teacher/quiz/create')`
    - _Requirements: 9.1_

- [ ] 14. Add "My Quizzes" section to TeacherDashboard
  - [ ] 14.1 Add quiz library section to TeacherDashboard
    - Fetch from GET /api/teacher/quizzes on component mount
    - Display list of quizzes with title, subject, creation date
    - Add "Launch Again" button for each quiz that calls POST /api/teacher/quiz/:quizId/relaunch
    - On relaunch success, navigate to lobby screen (reuse TeacherQuizCreate lobby phase)
    - Update "Live Quizzes Built" stat card to display quiz count from API
    - _Requirements: 9.2, 9.3, 9.4_

- [ ] 15. Checkpoint — Ensure all tests pass
  - Run `npm test` in backend directory
  - Run `npm test` in frontend directory
  - Verify all property-based tests pass with 100+ iterations
  - Verify all unit tests pass
  - Ask the user if questions arise

- [ ]* 16. Write property test for QR code URL encoding
  - **Property 8: QR code encodes the correct join URL**
  - **Validates: Requirements 6.6**
  - Generate random 6-character alphanumeric session codes
  - Call startQuizSession for each
  - Decode the qrCodeUrl data URL
  - Assert encoded URL matches `https://insightu.dev/join/{sessionCode}`
  - Tag: `Feature: teacher-quiz-portal, Property 8: QR code encodes the correct join URL`

- [ ]* 17. Write property test for power-up UI filtering
  - **Property 10: Participant UI shows only enabled power-ups**
  - **Validates: Requirements 4.3, 8.7**
  - Generate random enabledPowerUps subsets
  - Render LiveQuiz component with mock session config
  - Assert only enabled power-up buttons are present in DOM
  - Assert disabled power-up buttons are not present
  - Tag: `Feature: teacher-quiz-portal, Property 10: Participant UI shows only enabled power-ups`

- [ ]* 18. Write integration test for full create flow
  - POST to /api/teacher/quiz/create with a real small PDF
  - Verify quiz and session are created in database
  - Verify Redis state is seeded with correct fields
  - Verify QR code is generated
  - Verify session status is WAITING

- [ ]* 19. Write integration test for join flow
  - Create a quiz session
  - POST to /api/quiz/session/:sessionCode/join with displayName
  - Verify participant is added to Redis state
  - Verify participantJoined WebSocket event is emitted
  - Verify PowerUp records are created for enabled types only

- [ ] 20. Final checkpoint — End-to-end verification
  - Manually test the full flow: teacher creates quiz → QR code displayed → participant scans/joins → teacher starts quiz → live quiz runs
  - Verify RBAC: student cannot access /teacher/quiz/create or POST /api/quiz
  - Verify all error cases: session full, already started, invalid inputs
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional property-based and integration tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check library with minimum 100 iterations
- All property tests are tagged with feature name and property number
- The implementation reuses existing quiz infrastructure (LiveQuiz.tsx, realtime.ts, core.ts) wherever possible
- The schema migration must be run before any code changes that depend on the new fields
