# Requirements Document

## Introduction

The Teacher Quiz Portal is a Kahoot-style live quiz feature for the InsightU platform, restricted exclusively to teachers. Teachers can create quizzes by entering a topic and/or uploading a document (PDF), configuring session parameters (number of questions, max participants, time per question), and toggling power-ups. The platform AI-generates questions from the provided material. A QR code is generated so any participant can scan and join the live quiz session. Participants take the quiz in real-time through the existing live quiz interface.

This feature also restricts the existing quiz creation flow so that students can no longer create quizzes — only teachers may author and launch quiz sessions.

## Glossary

- **Teacher_Quiz_Portal**: The teacher-facing UI and backend flow for creating and launching AI-generated live quizzes.
- **Quiz_Creator**: The backend service responsible for accepting teacher input, invoking AI question generation, and persisting the quiz.
- **AI_Question_Generator**: The existing `generateQuestionsFromText` service that produces multiple-choice questions from text and PDF content.
- **Quiz_Session**: A live, real-time quiz instance identified by a unique session code and QR code.
- **Session_Code**: A short alphanumeric code uniquely identifying a Quiz_Session.
- **QR_Code**: A scannable image encoding the join URL for a Quiz_Session.
- **Power_Up**: An in-session ability (FIFTY_FIFTY, TIME_FREEZE, DOUBLE_POINTS, SHIELD) that participants can activate once per session.
- **Participant**: Any authenticated user who joins a Quiz_Session via QR code or session code.
- **RBAC_Guard**: The role-based access control middleware that enforces teacher-only access to quiz creation endpoints.

---

## Requirements

### Requirement 1: Teacher-Only Quiz Creation Access

**User Story:** As a platform administrator, I want quiz creation to be restricted to teachers only, so that the quiz system is used as an instructional tool rather than a student-generated content platform.

#### Acceptance Criteria

1. WHEN an authenticated user with role STUDENT attempts to access `POST /api/quiz`, THEN THE RBAC_Guard SHALL return HTTP 403 with error message "Forbidden: Only teachers can create quizzes".
2. WHEN an authenticated user with role PARENT attempts to access `POST /api/quiz`, THEN THE RBAC_Guard SHALL return HTTP 403 with error message "Forbidden: Only teachers can create quizzes".
3. WHEN an authenticated user with role TEACHER accesses `POST /api/quiz`, THE RBAC_Guard SHALL allow the request to proceed to the Quiz_Creator.
4. THE Teacher_Quiz_Portal SHALL hide the "Create Quiz" navigation entry and `/quiz/builder` route from users with role STUDENT or PARENT.
5. WHEN a STUDENT navigates directly to `/quiz/builder`, THE Teacher_Quiz_Portal SHALL redirect the user to `/dashboard`.

---

### Requirement 2: Teacher Quiz Creation Flow — Topic and Document Input

**User Story:** As a teacher, I want to enter a topic and optionally upload a PDF document, so that the AI can generate relevant quiz questions from my course material.

#### Acceptance Criteria

1. THE Teacher_Quiz_Portal SHALL provide a form with a required "Topic" text field and an optional "Upload Document" file input accepting PDF files only.
2. WHEN a teacher submits the creation form without entering a topic, THE Teacher_Quiz_Portal SHALL display a validation error "Topic is required" and SHALL NOT submit the form.
3. WHEN a teacher uploads a file that is not a PDF, THE Teacher_Quiz_Portal SHALL display a validation error "Only PDF files are supported" and SHALL NOT submit the form.
4. WHEN a teacher provides a topic and no document, THE AI_Question_Generator SHALL generate questions using the topic text as the source material.
5. WHEN a teacher provides both a topic and a PDF document, THE AI_Question_Generator SHALL generate questions using the extracted PDF text, with the topic used as a focus hint.
6. IF the PDF text extraction fails, THEN THE Teacher_Quiz_Portal SHALL display an error "Could not read the uploaded PDF. Please try a different file." and SHALL NOT proceed to question generation.

---

### Requirement 3: Quiz Session Configuration

**User Story:** As a teacher, I want to configure the number of questions, time per question, and maximum participants before launching a quiz, so that I can tailor the session to my class size and lesson pace.

#### Acceptance Criteria

1. THE Teacher_Quiz_Portal SHALL provide a numeric input for "Number of Questions" with a minimum value of 1 and a maximum value of 50.
2. THE Teacher_Quiz_Portal SHALL provide a numeric input for "Time Per Question (seconds)" with a minimum value of 10 and a maximum value of 300.
3. THE Teacher_Quiz_Portal SHALL provide a numeric input for "Max Participants" with a minimum value of 1 and a maximum value of 500.
4. WHEN a teacher submits the form with "Number of Questions" outside the range [1, 50], THE Teacher_Quiz_Portal SHALL display a validation error "Number of questions must be between 1 and 50".
5. WHEN a teacher submits the form with "Time Per Question" outside the range [10, 300], THE Teacher_Quiz_Portal SHALL display a validation error "Time per question must be between 10 and 300 seconds".
6. WHEN a teacher submits the form with "Max Participants" outside the range [1, 500], THE Teacher_Quiz_Portal SHALL display a validation error "Max participants must be between 1 and 500".
7. THE Teacher_Quiz_Portal SHALL pre-populate "Number of Questions" with 10, "Time Per Question" with 30, and "Max Participants" with 30 as default values.

---

### Requirement 4: Power-Up Configuration

**User Story:** As a teacher, I want to toggle which power-ups are available in the quiz session, so that I can control the level of game mechanics for my class.

#### Acceptance Criteria

1. THE Teacher_Quiz_Portal SHALL display four toggle switches, one for each power-up type: FIFTY_FIFTY, TIME_FREEZE, DOUBLE_POINTS, and SHIELD.
2. THE Teacher_Quiz_Portal SHALL default all four power-up toggles to the enabled state.
3. WHEN a teacher disables a power-up toggle, THE Quiz_Creator SHALL exclude that power-up type from being granted to participants when they join the session.
4. WHEN a teacher enables a power-up toggle, THE Quiz_Creator SHALL grant one instance of that power-up type to each participant upon joining the session.
5. THE Quiz_Creator SHALL store the enabled power-up configuration as part of the Quiz_Session record.

---

### Requirement 5: AI Question Generation

**User Story:** As a teacher, I want the platform to automatically generate quiz questions from my topic or document, so that I can create a quiz without manually writing each question.

#### Acceptance Criteria

1. WHEN a teacher submits the creation form, THE Quiz_Creator SHALL invoke the AI_Question_Generator with the provided text, question count, and difficulty set to MEDIUM.
2. WHEN the AI_Question_Generator returns fewer questions than requested, THE Teacher_Quiz_Portal SHALL display a warning "Only N questions could be generated from the provided material" and SHALL proceed with the available questions.
3. IF the AI_Question_Generator returns zero questions, THEN THE Teacher_Quiz_Portal SHALL display an error "No questions could be generated. Please provide more detailed material or a different topic." and SHALL NOT create the quiz.
4. IF the AI_Question_Generator returns an error due to missing AI configuration, THEN THE Teacher_Quiz_Portal SHALL display an error "AI provider not configured. Please set up your AI API key in Profile Settings." and SHALL NOT create the quiz.
5. WHEN question generation succeeds, THE Quiz_Creator SHALL create a Quiz record with the generated questions, the teacher's userId as authorId and teacherId, and visibility set to SHAREABLE.

---

### Requirement 6: QR Code Generation and Session Launch

**User Story:** As a teacher, I want a QR code to be generated immediately after quiz creation, so that participants can scan it to join the live session without needing to type a code.

#### Acceptance Criteria

1. WHEN a quiz is successfully created, THE Quiz_Creator SHALL immediately invoke `startQuizSession()` and return the resulting QR_Code and Session_Code to the teacher.
2. THE Teacher_Quiz_Portal SHALL display the QR_Code as a scannable image on the quiz lobby screen.
3. THE Teacher_Quiz_Portal SHALL display the Session_Code as human-readable text alongside the QR_Code so participants can join manually.
4. THE Teacher_Quiz_Portal SHALL display a "Waiting for participants..." status and a live participant count that updates in real-time via WebSocket.
5. WHEN a teacher clicks "Start Quiz", THE Teacher_Quiz_Portal SHALL emit the start event to the Quiz_Session and transition all connected participants to the first question.
6. THE QR_Code SHALL encode the URL `https://insightu.dev/join/{sessionCode}` so that scanning it navigates participants directly to the live quiz join page.

---

### Requirement 7: Participant Join Flow

**User Story:** As a participant, I want to scan a QR code or enter a session code to join a live quiz, so that I can participate in the teacher's quiz session from any device.

#### Acceptance Criteria

1. THE Teacher_Quiz_Portal SHALL provide a public join page at `/join/:sessionCode` that does not require authentication.
2. WHEN a participant navigates to `/join/:sessionCode`, THE Teacher_Quiz_Portal SHALL display a name entry field and a "Join Quiz" button.
3. WHEN a participant submits a name and the session is in WAITING status, THE Teacher_Quiz_Portal SHALL add the participant to the session and navigate them to the quiz waiting lobby.
4. IF a participant attempts to join a session that is IN_PROGRESS or COMPLETED, THEN THE Teacher_Quiz_Portal SHALL display "This quiz has already started or ended."
5. IF the number of participants in a session equals the configured Max Participants, THEN THE Teacher_Quiz_Portal SHALL display "This quiz session is full."
6. WHEN a participant joins, THE Teacher_Quiz_Portal SHALL broadcast the updated participant count to the teacher's lobby screen via WebSocket.

---

### Requirement 8: Live Quiz Experience

**User Story:** As a participant, I want to answer questions in real-time with a countdown timer and see my score after each question, so that the quiz feels engaging and competitive.

#### Acceptance Criteria

1. WHEN the teacher starts the quiz, THE Teacher_Quiz_Portal SHALL display the first question and answer options to all participants simultaneously.
2. WHILE a question is active, THE Teacher_Quiz_Portal SHALL display a countdown timer showing remaining seconds for that question.
3. WHEN the countdown timer reaches zero, THE Teacher_Quiz_Portal SHALL lock answer submission for that question and advance to the score reveal screen.
4. WHEN a participant submits an answer before the timer expires, THE Teacher_Quiz_Portal SHALL record the answer with a timestamp and display a confirmation to the participant.
5. WHEN the score reveal screen is shown, THE Teacher_Quiz_Portal SHALL display whether the participant's answer was correct and their updated cumulative score.
6. WHEN all questions have been answered, THE Teacher_Quiz_Portal SHALL display the final leaderboard to all participants and the teacher.
7. WHERE power-ups are enabled for the session, THE Teacher_Quiz_Portal SHALL display the participant's available power-up buttons during each question.

---

### Requirement 9: Teacher Dashboard Integration

**User Story:** As a teacher, I want the "Create Quiz" button on my dashboard to open the Teacher Quiz Portal, so that I have a clear entry point to the quiz creation flow.

#### Acceptance Criteria

1. WHEN a teacher clicks the "Create Quiz" button on the Teacher Dashboard, THE Teacher_Quiz_Portal SHALL navigate to `/teacher/quiz/create`.
2. THE Teacher_Quiz_Portal SHALL display the teacher's previously created quizzes in a "My Quizzes" section on the Teacher Dashboard, showing title, subject, creation date, and a "Launch Again" action.
3. WHEN a teacher clicks "Launch Again" on a previously created quiz, THE Quiz_Creator SHALL start a new Quiz_Session for that quiz and display the QR_Code lobby screen.
4. THE Teacher_Quiz_Portal SHALL display the count of quizzes created by the teacher in the "Live Quizzes Built" stat card on the Teacher Dashboard.
