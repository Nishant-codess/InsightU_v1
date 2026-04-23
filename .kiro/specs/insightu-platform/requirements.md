# Requirements Document: InsightU Platform

## Introduction

InsightU is a production-ready, visually immersive full-stack academic management platform designed for engineering universities (modelled after institutions like SRM Institute of Science and Technology) that use a "Day Order" timetable system. The platform serves four distinct user roles — Students, Teachers, Parents, and Admins — each with role-specific dashboards, default themes, and capabilities. It integrates a smart timetable engine driven by HTML scraping, academic analytics, collaborative section feeds, real-time notes sync, interactive quizzes, and a vacation/attendance predictor. The UI is intentionally premium: alive with 3D elements, micro-animations, and a dynamic theme system that makes the platform feel like a consumer product rather than a standard academic portal.

## Glossary

- **System**: The InsightU platform
- **Student**: A registered university student user with access to academic content and performance tracking
- **Teacher**: A faculty member who uploads content, creates assessments, and manages student performance data
- **Parent**: A guardian user with read-only access to linked student accounts
- **Admin**: A system administrator with platform management capabilities
- **Registration_Number**: A unique student identifier in format "RA" followed by digits (e.g., RA2411003010008)
- **Section**: A class division identifier (A, B, C, etc.)
- **Batch**: A scheduling group identifier (Batch 1 or Batch 2)
- **Group**: A combination of Section and Batch (e.g., A1 = Section A + Batch 1)
- **Topic**: A specific subject area or concept within a course
- **Academic_Health_Score**: A calculated metric (0–100%) representing overall student academic performance
- **Quiz_Session**: A live interactive quiz instance with unique access code
- **Day_Order**: The current day in the academic calendar cycle (1–5) used for timetable generation
- **Lecture_Note**: Educational content uploaded by teachers (PDF, image, or slide)
- **Theme**: A site-wide visual style applied to all UI components, including color palette, background animations, and decorative patterns
- **Theme_Switcher**: A UI control allowing any authenticated user to change their active theme
- **Slot**: A timetable slot identifier from the university portal (e.g., "A", "B", "P47") that maps to a period in the Day Order schedule
- **HTML_Scraper**: A server-side automated scraper that uses a headless browser (Puppeteer) to log into the university's Zoho Creator academic portal with the student's SRM credentials, fetch the required page HTML, and extract structured data using cheerio — credentials are used only in-memory for the duration of the scrape and are never persisted to any database or log
- **Portal_Credentials**: The student's SRM academia login ID and password, provided on-demand to trigger a portal sync — discarded immediately after each scrape session completes
- **SRM_Sync**: The on-demand action where a student provides their Portal_Credentials to fetch fresh data (attendance or marks) from the SRM academia portal; distinct from InsightU login
- **Last_Synced_Data**: Attendance and marks data previously fetched from the SRM portal and stored in InsightU's database, displayed to the student between sync sessions
- **Academic_Calendar**: An admin-uploaded JSON mapping calendar dates to Day Orders (1–5) or "Holiday"
- **Survival_Risk_Score**: A 0–10 score indicating how risky a planned vacation is for a student's attendance percentage
- **Section_Feed**: A GCR-style collaborative post feed scoped to a student's Year + Section + Department
- **Smart_Board**: The real-time notes sync system where teachers upload lecture notes and students receive WebSocket notifications instantly
- **Power_Up**: A one-use ability available to students during a live quiz session (50/50, Time Freeze, Double Points, Shield)
- **Mock_Test**: A timed, AI-generated or manually created assessment taken in a secure full-screen proctored environment
- **AI_Provider**: A configurable large language model API (OpenAI, Google Gemini, or OpenAI-compatible endpoint) used to generate mock test questions from uploaded PDF source material
- **Violation**: A recorded security event during a mock test (tab switch, fullscreen exit, face not detected) logged with a timestamp

---

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to securely authenticate into the platform using familiar login methods, so that I can access role-appropriate features without friction.

#### Acceptance Criteria

1. WHEN any user (Student, Teacher, Parent, or Admin) selects Google OAuth login, THE System SHALL authenticate the user via Google OAuth protocol
2. WHEN any user provides email and password credentials, THE System SHALL validate credentials and authenticate the user
3. WHEN a parent registers, THE System SHALL require email and password (not OAuth)
4. WHEN a student or teacher registers with institutional email, THE System SHALL accept the email without domain restriction validation
5. IF authentication fails, THEN THE System SHALL return a descriptive error message and prevent access
6. WHEN a student is authenticated via InsightU login, THE System SHALL display their last-synced timetable, attendance, and marks data without requiring Portal_Credentials again

---

### Requirement 2: Student Registration and Profile

**User Story:** As a student, I want to register with my academic details, so that the system can provide personalized academic services.

#### Acceptance Criteria

1. WHEN a student registers, THE System SHALL require name, registration number, email, department, year, section, batch, and college mail ID
2. WHEN a registration number is provided, THE System SHALL validate it matches the pattern "RA" followed by one or more digits
3. WHEN year is selected, THE System SHALL provide options: Year 1, Year 2, Year 3, Year 4
4. WHEN section is selected, THE System SHALL accept single letter values (A, B, C, etc.)
5. WHEN batch is selected, THE System SHALL provide options: Batch 1, Batch 2
6. WHEN section and batch are provided, THE System SHALL automatically assign the student to the corresponding group (e.g., Section A + Batch 1 = A1)
7. WHEN registration is complete, THE System SHALL create a student account with the provided details

---

### Requirement 3: Role-Based Access Control

**User Story:** As a system administrator, I want users to access only role-appropriate features, so that data security and proper workflows are maintained.

#### Acceptance Criteria

1. WHEN a student authenticates, THE System SHALL grant access to student dashboard and student features only
2. WHEN a teacher authenticates, THE System SHALL grant access to teacher dashboard and teacher features only
3. WHEN a parent authenticates, THE System SHALL grant access to parent dashboard and parent features only
4. WHEN an admin authenticates, THE System SHALL grant access to admin dashboard and admin features only
5. WHEN a user attempts to access unauthorized features, THE System SHALL deny access and return an authorization error

---

### Requirement 4: Student Academic Dashboard

**User Story:** As a student, I want to view my academic performance with visual analytics, so that I can understand my strengths and areas for improvement.

#### Acceptance Criteria

1. WHEN a student views their dashboard, THE System SHALL display subject-wise marks in graphical format
2. WHEN performance data exists, THE System SHALL display performance trends over time
3. WHEN sufficient data exists, THE System SHALL calculate and display an Academic Health Score
4. WHEN performance data is analyzed, THE System SHALL identify and display weak subjects
5. WHEN performance data is analyzed, THE System SHALL identify and display weak topics
6. WHEN weak areas are identified, THE System SHALL provide study recommendations based on performance patterns

---

### Requirement 5: Lecture Notes Management

**User Story:** As a teacher, I want to upload and organize lecture materials, so that students can access course content.

#### Acceptance Criteria

1. WHEN a teacher uploads content, THE System SHALL accept PDFs, images (board photos), and presentation slides
2. WHEN uploading content, THE System SHALL require the teacher to tag content with subject and topic
3. WHEN content is uploaded, THE System SHALL store the content with associated metadata (subject, topic, lecture date)
4. WHEN content is uploaded, THE System SHALL make the content accessible to students in the corresponding course
5. WHEN a student views lecture notes, THE System SHALL organize notes by subject, topic, and lecture date

---

### Requirement 6: Student Lecture Notes Access

**User Story:** As a student, I want to access and interact with lecture materials, so that I can study and review course content.

#### Acceptance Criteria

1. WHEN a student accesses lecture notes, THE System SHALL display notes in an in-app document viewer
2. WHEN a student selects a note, THE System SHALL provide download functionality
3. WHEN a student bookmarks a note, THE System SHALL save the bookmark and make it accessible in a bookmarks section
4. WHEN a student annotates a note, THE System SHALL save personal annotations without modifying the original content
5. WHEN new lecture notes are uploaded, THE System SHALL send in-app notifications to relevant students

---

### Requirement 7: Live Quiz System (Teacher-Hosted)

**User Story:** As a teacher, I want to host a fun, live interactive quiz with power-ups and a leaderboard, so that I can assess student understanding in an engaging real-time experience.

#### Acceptance Criteria

1. WHEN a teacher creates a quiz, THE System SHALL accept multiple-choice questions with topic tags, point values, and a time limit per question
2. WHEN a teacher starts a quiz session, THE System SHALL generate a unique QR code and 6-character session code for students to join
3. WHEN a quiz session is active, THE System SHALL support 100 to 200 students joining simultaneously via QR code or session code
4. WHEN a student joins a live quiz, THE System SHALL display a fun, animated waiting lobby showing connected players in real-time
5. WHEN a question is active, THE System SHALL display a countdown timer and animated answer options to all participants simultaneously
6. WHEN students participate in a quiz, THE System SHALL display a live leaderboard updated after every question
7. WHEN a quiz is completed, THE System SHALL display a final animated leaderboard with top 3 podium celebration and confetti effects
8. WHEN a quiz is completed, THE System SHALL automatically analyze performance at the topic level
9. WHEN quiz results are available, THE System SHALL make results accessible to both teacher and participating students

---

### Requirement 8: Student Live Quiz Participation and Power-Ups

**User Story:** As a student, I want to join live quizzes and use power-ups strategically, so that I can compete with classmates in a fun and engaging way.

#### Acceptance Criteria

1. WHEN a student scans a QR code or enters a session code, THE System SHALL add the student to the active quiz session lobby
2. WHEN a quiz question is displayed, THE System SHALL present animated multiple-choice options with a countdown timer
3. WHEN a student submits an answer, THE System SHALL record the response, timestamp, and time taken, and award points based on correctness and speed
4. WHEN a quiz is in progress, THE System SHALL display the live leaderboard to the student after each question
5. WHEN a quiz is completed, THE System SHALL display the student's final rank, score, and topic-level performance insights
6. WHEN a student has power-ups available, THE System SHALL display them as usable items during the question timer
7. WHEN a student activates the "50/50" power-up, THE System SHALL eliminate two incorrect answer options for that question
8. WHEN a student activates the "Time Freeze" power-up, THE System SHALL add 10 seconds to their personal countdown timer for that question
9. WHEN a student activates the "Double Points" power-up, THE System SHALL double the points awarded for a correct answer on that question
10. WHEN a student activates the "Shield" power-up, THE System SHALL protect the student from losing streak bonus points on an incorrect answer
11. WHEN a quiz session starts, THE System SHALL grant each student one of each power-up type to use throughout the session

---

### Requirement 9: Exam Marks Upload and Processing

**User Story:** As a teacher, I want to upload exam marks via spreadsheet, so that student performance data is automatically integrated into the system.

#### Acceptance Criteria

1. WHEN a teacher uploads a marks file, THE System SHALL accept CSV and Excel formats
2. WHEN processing a marks file, THE System SHALL extract registration numbers, question-wise marks, and total marks
3. WHEN a teacher maps questions to topics, THE System SHALL store the question-topic associations
4. WHEN registration numbers are extracted, THE System SHALL automatically match them to existing student accounts
5. IF a registration number does not match any student account, THEN THE System SHALL log the unmatched entry and continue processing other entries
6. WHEN marks are processed, THE System SHALL update student performance data at both subject and topic levels

---

### Requirement 10: Topic Performance Analytics

**User Story:** As a student, I want to see my performance at the topic level, so that I can focus my study efforts on specific areas.

#### Acceptance Criteria

1. WHEN a student views topic performance, THE System SHALL aggregate data from quizzes, assignments, and exam marks
2. WHEN sufficient data exists for a topic, THE System SHALL classify the topic as strong or weak based on performance thresholds
3. WHEN a topic is identified as weak, THE System SHALL recommend relevant lecture notes for revision
4. WHEN a teacher views class analytics, THE System SHALL identify weak topics across all students in the class
5. WHEN topic performance is calculated, THE System SHALL update the data after each new quiz, assignment, or exam marks upload

---

### Requirement 11: Parent Account and Monitoring

**User Story:** As a parent, I want to monitor my children's academic performance, so that I can support their educational progress.

#### Acceptance Criteria

1. WHEN a parent links a student account, THE System SHALL establish a read-only connection to that student's data
2. WHEN a parent has multiple linked accounts, THE System SHALL provide functionality to switch between children dashboards
3. WHEN a parent views a child's dashboard, THE System SHALL display the same academic performance data visible to the student
4. WHEN a parent views performance data, THE System SHALL display subject-wise marks, academic health score, and weak subject alerts
5. WHEN a parent attempts to modify any data, THE System SHALL prevent the modification and maintain read-only access

---

### Requirement 12: Admin Platform Management

**User Story:** As an admin, I want to manage the platform and view analytics, so that I can ensure smooth operation and monitor usage.

#### Acceptance Criteria

1. WHEN an admin logs in with username "admin" and password "admin123", THE System SHALL authenticate the admin user
2. WHEN an admin accesses user management, THE System SHALL display all users with their roles
3. WHEN an admin views platform analytics, THE System SHALL display usage statistics and performance metrics
4. WHEN an admin modifies user roles, THE System SHALL update the user's access permissions accordingly
5. WHEN an admin uploads timetable or calendar files, THE System SHALL process the files and confirm successful upload

---

### Requirement 13: Notification System

**User Story:** As a user, I want to receive timely notifications, so that I stay informed about important academic activities.

#### Acceptance Criteria

1. WHEN new lecture notes are uploaded, THE System SHALL send in-app notifications to students in the relevant course
2. WHEN a quiz is scheduled or started, THE System SHALL send in-app notifications to students in the relevant group
3. WHEN an assignment is posted, THE System SHALL send in-app notifications to students in the relevant course
4. WHEN a student's performance indicates weak subjects, THE System SHALL send performance alert notifications to the student and linked parents
5. WHEN a notification is sent, THE System SHALL display it in the user's notification center with timestamp and relevant details

---

### Requirement 14: Assignment Management

**User Story:** As a teacher, I want to upload and manage assignments, so that students can access coursework and I can track submissions.

#### Acceptance Criteria

1. WHEN a teacher uploads an assignment, THE System SHALL accept document files and store them with subject and topic tags
2. WHEN an assignment is uploaded, THE System SHALL make it accessible to students in the relevant course
3. WHEN an assignment is posted, THE System SHALL send notifications to relevant students
4. WHEN a teacher uploads assignment marks, THE System SHALL process the marks and update student performance data
5. WHEN assignment marks are mapped to topics, THE System SHALL contribute the data to topic-level performance analytics

---

### Requirement 15: Real-Time Quiz Communication

**User Story:** As a system architect, I want the quiz system to handle real-time communication efficiently, so that many students can participate simultaneously without performance degradation.

#### Acceptance Criteria

1. WHEN 100 to 200 students join a quiz session, THE System SHALL maintain real-time communication with all participants
2. WHEN a teacher advances to the next question, THE System SHALL broadcast the update to all participants within 2 seconds
3. WHEN students submit answers, THE System SHALL process submissions and update the leaderboard in real-time
4. WHEN network latency occurs for individual students, THE System SHALL handle the delay gracefully without affecting other participants
5. WHEN a quiz session ends, THE System SHALL ensure all student responses are recorded before closing the session

---

### Requirement 16: Data Security and Privacy

**User Story:** As a system administrator, I want user data to be secure and private, so that sensitive academic information is protected.

#### Acceptance Criteria

1. WHEN a user authenticates, THE System SHALL use secure authentication protocols (OAuth 2.0 or bcrypt for passwords)
2. WHEN storing passwords, THE System SHALL hash passwords using a secure hashing algorithm
3. WHEN transmitting data, THE System SHALL use HTTPS encryption for all communications
4. WHEN a parent accesses student data, THE System SHALL only allow access to explicitly linked student accounts
5. WHEN a user's session expires, THE System SHALL require re-authentication before granting access

---

### Requirement 17: Performance Data Aggregation

**User Story:** As a student, I want my performance data from all sources to be aggregated accurately, so that I get a complete picture of my academic standing.

#### Acceptance Criteria

1. WHEN calculating Academic Health Score, THE System SHALL aggregate data from quizzes, assignments, and exam marks
2. WHEN identifying weak subjects, THE System SHALL analyze performance across all assessment types for each subject
3. WHEN identifying weak topics, THE System SHALL aggregate topic-level data from all sources (quizzes, assignments, exams)
4. WHEN new performance data is added, THE System SHALL recalculate aggregated metrics within 5 seconds
5. WHEN displaying performance trends, THE System SHALL show data points from all assessment types on a unified timeline

---

### Requirement 18: Dynamic Theme System

**User Story:** As a user, I want to choose a visual theme that matches my personality, so that the platform feels personal and engaging.

#### Acceptance Criteria

1. THE System SHALL provide a site-wide Theme_Switcher accessible from the user settings panel on every page
2. WHEN a student authenticates for the first time, THE System SHALL apply the Spiderman Theme as the default theme
3. WHEN a teacher authenticates for the first time, THE System SHALL apply the Standard Professional Theme as the default theme
4. WHEN a parent authenticates for the first time, THE System SHALL apply the Doraemon Theme as the default theme
5. WHEN an admin authenticates for the first time, THE System SHALL apply the Dark Professional Theme as the default theme
6. WHEN a user selects a theme via the Theme_Switcher, THE System SHALL apply the selected theme to all UI components immediately without a page reload
7. WHEN a user selects a theme, THE System SHALL persist the theme preference and restore it on subsequent logins
8. THE System SHALL provide at minimum the following themes: Spiderman, Doraemon, Dark Professional, Standard Professional, and one Anime/Cartoon theme
9. WHEN a theme is active, THE System SHALL apply the theme's color palette, background animations, decorative patterns, and typography consistently across all pages

---

### Requirement 19: 3D Elements and Micro-Animations

**User Story:** As a user, I want the platform to feel alive and premium, so that using it is an enjoyable experience rather than a chore.

#### Acceptance Criteria

1. THE System SHALL render animated background effects on all primary pages (dashboard, timetable, notes, section feed)
2. WHEN the Spiderman Theme is active, THE System SHALL display web-pattern background animations and comic-style decorative elements
3. WHEN the Doraemon Theme is active, THE System SHALL display floating gadget elements and a futuristic particle background
4. WHEN the Dark Professional Theme is active, THE System SHALL display a subtle animated particle or grid background
5. WHEN a user hovers over interactive cards or buttons, THE System SHALL apply micro-animation transitions (scale, glow, or lift effects) within 150ms
6. WHEN a class is currently in progress on the timetable, THE System SHALL apply a pulsing animation to that class card
7. WHEN navigating between pages, THE System SHALL apply smooth animated page transitions using Framer Motion
8. WHEN displaying charts and performance graphs, THE System SHALL animate the chart data on initial render

---

### Requirement 20: Smart Timetable Engine — Automated Portal Scraper

**User Story:** As a student, I want to sync my timetable by entering my SRM credentials once, and sync my attendance and marks on demand, so that InsightU always shows accurate data without requiring technical knowledge.

#### Acceptance Criteria

**Timetable Sync (one-time):**
1. WHEN a student provides their SRM academia login ID and password for timetable sync, THE System SHALL use a headless browser (Puppeteer) to log into the SRM Zoho Creator portal and navigate to the timetable page
2. WHEN the portal timetable page is fetched, THE HTML_Scraper SHALL parse the first HTML table and extract: Registration Number, Name, Program, Department, Semester, and Batch
3. WHEN the portal timetable page is fetched, THE HTML_Scraper SHALL parse the second HTML table (headers: Course Code, Course Title, Faculty Name, Slot, Room No) and extract each row as a timetable slot containing: subject name, slot identifier, subject type (theory or lab), and room number
4. WHEN the HTML_Scraper extracts a slot identifier, THE System SHALL classify the slot as "lab" type if the slot identifier contains two or more slot codes (e.g., "P47+P48"), and as "theory" type otherwise
5. WHEN timetable extraction is complete, THE System SHALL store the scraped profile and PersonalSlot records in the database — subsequent logins SHALL display this stored timetable without requiring Portal_Credentials again

**Attendance & Marks Sync (on-demand):**
6. WHEN a student requests an attendance or marks refresh, THE System SHALL prompt them to enter their Portal_Credentials
7. WHEN Portal_Credentials are provided for a sync, THE System SHALL use Puppeteer to log into the SRM portal, navigate to the attendance and marks pages, extract the data, update the InsightU database with the latest values, and display the refreshed data
8. WHEN a student views their attendance or marks without triggering a sync, THE System SHALL display the Last_Synced_Data with a visible timestamp indicating when it was last fetched

**Credential Security (applies to all sync types):**
9. WHEN any sync session completes (successfully or with an error), THE System SHALL immediately discard the Portal_Credentials from memory and SHALL NOT persist them to any database, log, or storage
10. WHEN a student provides incorrect Portal_Credentials, THE System SHALL return a descriptive authentication error and discard the credentials without storing them
11. IF the SRM portal is unreachable or its page structure has changed, THEN THE System SHALL return a descriptive error and discard the credentials
12. FOR ALL valid portal responses, scraping the same account twice SHALL produce an identical set of records (idempotent round-trip property)

---

### Requirement 21: Smart Timetable Engine — Daily Timeline UI

**User Story:** As a student, I want to see today's classes in a visual timeline, so that I can plan my day at a glance.

#### Acceptance Criteria

1. WHEN a student views the timetable page, THE System SHALL determine today's Day_Order by looking up the current date in the Academic_Calendar
2. WHEN the Day_Order is determined, THE System SHALL correlate the student's PersonalSlot records with the UnifiedSlot schedule for that Day_Order and the student's batch to produce an ordered list of today's classes
3. WHEN today's classes are computed, THE System SHALL display them as a vertical timeline ordered by period start time, showing subject name, slot, room, and time range for each class
4. WHEN the current time falls within a class's start and end time, THE System SHALL apply a pulsing highlight animation to that class card
5. WHEN the current date is a holiday in the Academic_Calendar, THE System SHALL display a holiday message instead of a class timeline
6. WHEN a student has no PersonalSlot records, THE System SHALL display a prompt to import their timetable via the HTML scraper

---

### Requirement 22: Admin Academic Calendar Management

**User Story:** As an admin, I want to upload and manage the academic calendar, so that the timetable engine always reflects the correct Day Order for each date.

#### Acceptance Criteria

1. WHEN an admin uploads an academic calendar, THE System SHALL accept a JSON file mapping ISO date strings to Day Order values (1–5) or the string "Holiday"
2. WHEN a calendar JSON is uploaded, THE System SHALL validate that all date keys are valid ISO date strings and all values are integers 1–5 or the string "Holiday"
3. IF a calendar JSON contains an invalid entry, THEN THE System SHALL reject the upload and return a list of all invalid entries
4. WHEN a valid calendar JSON is uploaded, THE System SHALL store it as the active Academic_Calendar and make it immediately available to the timetable engine
5. WHEN an admin uploads a new calendar, THE System SHALL replace the previously active calendar version

---

### Requirement 23: Vacation Predictor (Attendance Simulation)

**User Story:** As a student, I want to simulate the impact of a planned vacation on my attendance, so that I can make informed decisions about taking time off.

#### Acceptance Criteria

1. WHEN a student provides a startDate and endDate for a planned vacation, THE System SHALL calculate the number of working days missed by excluding holidays from the Academic_Calendar within that date range
2. WHEN working days missed is calculated, THE System SHALL compute the projected attendance percentage after the vacation using the student's current attendance record and the missed working days
3. WHEN the projected attendance percentage is computed, THE System SHALL calculate a Survival_Risk_Score on a scale of 0 to 10, where higher scores indicate greater risk to academic standing
4. WHEN the projected attendance percentage drops below 75%, THE System SHALL display a critical warning with red accent styling and an alert animation
5. WHEN the Survival_Risk_Score is 8 or above, THE System SHALL display an additional "Danger Zone" warning message
6. WHEN the vacation date range contains zero working days, THE System SHALL display a message indicating the vacation has no impact on attendance

---

### Requirement 24: Academic Health and Analytics Dashboard

**User Story:** As a student, I want a rich analytics dashboard showing my academic health, so that I can identify risks early and take corrective action.

#### Acceptance Criteria

1. WHEN a student views the analytics dashboard, THE System SHALL display the Academic_Health_Score as a percentage with a visual gauge or ring chart
2. WHEN the Academic_Health_Score is below 60%, THE System SHALL flag the student as "At Risk" with a visual indicator
3. WHEN subject performance data exists, THE System SHALL display a subject-wise performance breakdown with interactive bar or radar charts
4. WHEN a subject's average score is below 60%, THE System SHALL flag it as a Weak Subject with a distinct visual indicator
5. WHEN a topic's average score is below 50%, THE System SHALL flag it as a Weak Topic with a distinct visual indicator
6. WHEN performance data spans multiple assessment dates, THE System SHALL display a trend line chart showing score progression over time
7. WHEN a student views weak subjects or topics, THE System SHALL display recommended lecture notes for each weak area

---

### Requirement 25: Collaborative Section Feed

**User Story:** As a student or teacher, I want a shared feed for my section, so that we can share resources, announcements, and discussions in one place.

#### Acceptance Criteria

1. THE System SHALL scope the Section_Feed to a student's Year + Section + Department combination, so that only members of the same section see the same feed
2. WHEN a teacher posts to the Section_Feed, THE System SHALL display the post to all students in the matching Year + Section + Department
3. WHEN a student posts to the Section_Feed, THE System SHALL display the post to all members of the same section
4. WHEN creating a post, THE System SHALL allow the author to attach files (PDFs, images, documents) alongside text content
5. WHEN a post is created, THE System SHALL display the author's name, role (Student or Teacher), timestamp, text content, and any attachments
6. WHEN a user comments on a post, THE System SHALL append the comment to the post and display it to all section members
7. WHEN a new post is created in a section, THE System SHALL send in-app notifications to all members of that section

---

### Requirement 26: Real-Time Smart Board and Notes Sync

**User Story:** As a student, I want to be notified instantly when a teacher uploads new lecture notes, so that I can access materials as soon as they are available.

#### Acceptance Criteria

1. WHEN a teacher uploads a lecture note via the Smart_Board, THE System SHALL store the note with subject, topic, and file metadata
2. WHEN a lecture note is uploaded, THE System SHALL broadcast a WebSocket notification to all students whose section is associated with the teacher's subject
3. WHEN a student receives a Smart_Board notification, THE System SHALL display a real-time in-app alert with the note title, subject, and a direct link to view the note
4. WHEN a student views a note in the Smart_Board viewer, THE System SHALL support bookmarking and coordinate-based annotations on document pages
5. WHEN a student adds an annotation, THE System SHALL store the annotation with page number, X coordinate, Y coordinate, and text content
6. WHEN a student retrieves annotations for a note, THE System SHALL return only that student's own annotations, leaving the original note unmodified

---

### Requirement 27: Responsive and Accessible Interface

**User Story:** As a user, I want to access the platform on any device, so that I can use it conveniently from desktop or mobile.

#### Acceptance Criteria

1. WHEN a user accesses the platform from any device, THE System SHALL display a responsive interface that adapts to screen sizes from 320px to 2560px wide
2. WHEN displaying charts and graphs, THE System SHALL render them in a visually appealing format with smooth entry animations
3. WHEN a user navigates between pages, THE System SHALL provide animated transitions for a modern user experience
4. WHEN displaying dashboards, THE System SHALL use a clean layout with intuitive navigation and clear visual hierarchy
5. WHEN rendering the interface, THE System SHALL maintain the active theme's aesthetic consistently across all pages and components

---

### Requirement 28: Make Your Own Quiz

**User Story:** As a student or teacher, I want to create my own quiz and optionally host it as a live session, so that I can study independently or challenge my classmates.

#### Acceptance Criteria

1. WHEN any authenticated user (Student or Teacher) creates a quiz, THE System SHALL allow them to add multiple-choice questions manually with a question text, four answer options, one correct answer, a topic tag, and a point value
2. WHEN a quiz creator saves a quiz, THE System SHALL store it in their personal quiz library accessible from their dashboard
3. WHEN a student creates a quiz, THE System SHALL provide the option to keep it private (personal practice only) or make it shareable
4. WHEN a quiz is marked as shareable, THE System SHALL generate a session code that other students can use to join it as a live quiz session with the same power-up and leaderboard mechanics as teacher-hosted quizzes (Requirement 7 and 8)
5. WHEN a user takes their own quiz in solo practice mode, THE System SHALL present questions one at a time with a timer, record answers, and display a results summary with correct/incorrect breakdown at the end
6. WHEN a quiz creator views their quiz library, THE System SHALL display all their created quizzes with title, question count, topic tags, and last-played date
7. WHEN a quiz is played (solo or live), THE System SHALL record the attempt results and make them available in the creator's quiz history

---

### Requirement 29: AI-Powered Mock Test Generator

**User Story:** As a student or teacher, I want to generate a mock test from uploaded study materials using AI, so that I can practice or assess students without manually writing every question.

#### Acceptance Criteria

1. WHEN a user creates a mock test, THE System SHALL require a test name, subject, and at least one topic tag
2. WHEN creating a mock test, THE System SHALL allow the user to upload one or more PDF documents as source material for AI question generation
3. WHEN source PDFs are uploaded, THE System SHALL extract the text content and send it to the configured AI provider to generate multiple-choice questions based on the material
4. WHEN generating questions, THE System SHALL allow the user to specify the number of questions (10–100) and difficulty level (Easy, Medium, Hard)
5. WHEN AI generates questions, THE System SHALL display them for review before the test is finalized, allowing the user to edit, delete, or regenerate individual questions
6. WHEN a mock test is finalized, THE System SHALL store it and make it available for students to take
7. WHEN a teacher creates a mock test, THE System SHALL allow them to assign it to a specific section with an optional time window (start date/time and end date/time)
8. THE System SHALL support a configurable AI provider and API key set by the user in their settings (supporting OpenAI, Google Gemini, or any OpenAI-compatible endpoint)
9. IF no AI API key is configured, THEN THE System SHALL display a prompt to configure one before AI generation is available, while still allowing manual question entry

---

### Requirement 30: Secure Mock Test Environment

**User Story:** As a teacher or student, I want mock tests to be taken in a secure, proctored full-screen environment, so that the integrity of the test is maintained.

#### Acceptance Criteria

1. WHEN a student starts a mock test, THE System SHALL open the test in a new browser tab and immediately request full-screen mode via the Fullscreen API
2. WHEN the test tab enters full-screen mode, THE System SHALL begin the test timer and display questions
3. IF the student exits full-screen mode, THEN THE System SHALL display a prominent warning overlay and log the violation — after 3 violations THE System SHALL auto-submit the test
4. WHEN the test is active, THE System SHALL detect tab switches or window focus loss and log each occurrence as a violation with a timestamp
5. WHEN the test is active, THE System SHALL request webcam access and display a live webcam feed thumbnail in the corner of the screen for self-proctoring awareness
6. WHEN the webcam feed shows no face detected for more than 10 consecutive seconds, THE System SHALL display a warning alert to the student
7. WHEN the test is active, THE System SHALL disable right-click context menu, text selection, and copy-paste within the test interface
8. WHEN a student completes or submits the test, THE System SHALL record the final answers, total time taken, and a violation summary (tab switches, fullscreen exits, face-not-detected events)
9. WHEN a teacher views test results, THE System SHALL display each student's score alongside their violation summary
10. WHEN the test timer expires, THE System SHALL automatically submit whatever answers the student has provided up to that point
