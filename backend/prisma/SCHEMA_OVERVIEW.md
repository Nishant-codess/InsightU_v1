# Database Schema Overview

## Entity Relationship Summary

### User Management
- **User** - Base user entity with authentication
  - Links to: Student, Teacher, Parent, or Admin (one-to-one)
  - Has many: Sessions, RefreshTokens, Notifications

- **Student** - Student profile with academic details
  - Belongs to: User
  - Has many: QuizParticipations, NoteBookmarks, NoteAnnotations, StudentExamMarks, StudentPerformances
  - Has one: AcademicHealth
  - Links to: Parents (many-to-many via ParentStudent)

- **Teacher** - Teacher profile
  - Belongs to: User
  - Has many: LectureNotes, Quizzes, Assignments, Exams

- **Parent** - Parent profile
  - Belongs to: User
  - Links to: Students (many-to-many via ParentStudent)

- **Admin** - Admin profile
  - Belongs to: User

### Authentication
- **Session** - Active user sessions
- **RefreshToken** - JWT refresh tokens

### Academic Content
- **LectureNote** - Course materials uploaded by teachers
  - Belongs to: Teacher
  - Has many: NoteBookmarks, NoteAnnotations

- **Quiz** - Interactive quiz definitions
  - Belongs to: Teacher
  - Has many: QuizSessions

- **QuizSession** - Live quiz instances
  - Belongs to: Quiz
  - Has many: QuizParticipations

- **Assignment** - Homework assignments
  - Belongs to: Teacher

- **Exam** - Formal examinations
  - Belongs to: Teacher
  - Has many: StudentExamMarks

### Student Interactions
- **NoteBookmark** - Student bookmarks on lecture notes
- **NoteAnnotation** - Student annotations on lecture notes
- **QuizParticipation** - Student participation in quiz sessions

### Performance Tracking
- **StudentExamMarks** - Exam results with topic-level breakdown
- **StudentPerformance** - Aggregated performance data from all sources
- **AcademicHealth** - Overall academic health metrics

### Scheduling
- **Timetable** - Class schedules by year and batch
- **AcademicCalendar** - Day order mapping for timetable generation

### Communication
- **Notification** - In-app notifications
- **NotificationPreferences** - User notification settings

## Key Indexes

### Performance Optimization
- User email (unique)
- Student registration number (unique)
- Quiz session code (unique)
- Subject and topic combinations
- Date-based queries (lectureDate, examDate, assessmentDate)
- User-resource relationships (studentId, teacherId, userId)

## Enums

### UserRole
- STUDENT
- TEACHER
- PARENT
- ADMIN

### NotificationType
- NEW_LECTURE_NOTE
- QUIZ_STARTED
- QUIZ_SCHEDULED
- ASSIGNMENT_POSTED
- PERFORMANCE_ALERT
- SYSTEM_ANNOUNCEMENT

## JSON Fields

Some fields store JSON data for flexibility:

- **Quiz.questions** - Array of quiz questions with options and correct answers
- **QuizParticipation.answers** - Student's answers to quiz questions
- **Exam.questions** - Array of exam questions with topic mappings
- **StudentExamMarks.questionMarks** - Array of marks for each question
- **StudentExamMarks.topicScores** - Topic-level score breakdown
- **AcademicHealth.weakTopics** - Array of weak topics with recommendations
- **Timetable.schedule** - Day-wise schedule with periods
- **AcademicCalendar.dayOrderMapping** - Date to day order mapping
- **Notification.metadata** - Additional notification data
- **NotificationPreferences.notificationTypes** - Enabled notification types

## Cascade Deletes

The schema implements cascade deletes to maintain referential integrity:

- Deleting a User cascades to their role-specific profile (Student/Teacher/Parent/Admin)
- Deleting a Student cascades to their bookmarks, annotations, participations, and performance data
- Deleting a Teacher cascades to their lecture notes, quizzes, assignments, and exams
- Deleting a Quiz cascades to its sessions and participations
- Deleting a LectureNote cascades to its bookmarks and annotations

## Data Validation

### Registration Number Format
- Pattern: "RA" followed by digits
- Example: RA2411003010008

### Year Values
- Valid: 1, 2, 3, 4

### Batch Values
- Valid: 1, 2

### Section Format
- Single letter (A, B, C, etc.)

### Group Computation
- Format: Section + Batch
- Example: A1 (Section A, Batch 1)

## Sample Queries

### Get student with all performance data
```typescript
const student = await prisma.student.findUnique({
  where: { id: studentId },
  include: {
    user: true,
    performances: true,
    academicHealth: true,
    quizParticipations: {
      include: { session: { include: { quiz: true } } }
    },
    examMarks: {
      include: { exam: true }
    }
  }
});
```

### Get teacher's lecture notes with bookmarks
```typescript
const notes = await prisma.lectureNote.findMany({
  where: { teacherId },
  include: {
    bookmarks: { include: { student: true } },
    annotations: { include: { student: true } }
  },
  orderBy: { lectureDate: 'desc' }
});
```

### Get active quiz sessions
```typescript
const activeSessions = await prisma.quizSession.findMany({
  where: { status: 'active' },
  include: {
    quiz: true,
    participations: { include: { student: true } }
  }
});
```

### Get student performance by subject
```typescript
const performance = await prisma.studentPerformance.findMany({
  where: {
    studentId,
    subject: 'Data Structures'
  },
  orderBy: { assessmentDate: 'desc' }
});
```

## Migration History

Migrations are stored in `prisma/migrations/` directory. Each migration includes:
- SQL file with schema changes
- Migration metadata

To view migration history:
```bash
npx prisma migrate status
```

## Database Maintenance

### Backup
```bash
pg_dump -U username -d insightu > backup.sql
```

### Restore
```bash
psql -U username -d insightu < backup.sql
```

### Reset (Development Only)
```bash
npx prisma migrate reset
```

This will drop the database, recreate it, apply all migrations, and run the seed script.
