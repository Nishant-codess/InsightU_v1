# Database Migration and Seeding Guide

## Prerequisites

Before running migrations, ensure you have:

1. PostgreSQL installed and running
2. A database created (or let Prisma create it)
3. Correct DATABASE_URL in your `.env` file

## Setup Steps

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Database

Update the `DATABASE_URL` in `backend/.env`:

```
DATABASE_URL="postgresql://username:password@localhost:5432/insightu?schema=public"
```

Replace `username` and `password` with your PostgreSQL credentials.

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

This generates the Prisma Client based on your schema.

### 4. Run Migrations

To create and apply migrations:

```bash
npm run prisma:migrate
```

This will:
- Create a new migration in `prisma/migrations/`
- Apply the migration to your database
- Regenerate Prisma Client

For the first time, you can name it:

```bash
npx prisma migrate dev --name init
```

### 5. Seed the Database

After migrations are applied, seed the database with sample data:

```bash
npm run prisma:seed
```

Or manually:

```bash
npx tsx prisma/seed.ts
```

## What Gets Seeded

The seed script creates:

- **1 Admin user**
  - Email: `admin@insightu.edu`
  - Password: `admin123`

- **2 Teachers**
  - Dr. John Doe (Data Structures, Algorithms, Database Systems)
  - Dr. Jane Smith (Operating Systems, Computer Networks, Web Development)
  - Password for both: `teacher123`

- **10 Students**
  - Distributed across sections A, B, C and batches 1, 2
  - Registration numbers: RA2411003010000 to RA2411003010009
  - Password for all: `student123`

- **2 Parents**
  - Linked to first two students
  - Password for both: `parent123`

- **Sample Data**
  - Lecture notes for Data Structures and Algorithms
  - Quizzes with questions
  - Assignments for Operating Systems and Computer Networks
  - Exam with marks for some students
  - Student performance data
  - Academic health records
  - Timetables for Year 2 (Batch 1 and 2)
  - Academic calendar
  - Notifications

## Useful Commands

### Reset Database (WARNING: Deletes all data)

```bash
npx prisma migrate reset
```

This will:
1. Drop the database
2. Create a new database
3. Apply all migrations
4. Run the seed script

### View Database in Prisma Studio

```bash
npx prisma studio
```

Opens a GUI to browse and edit your database.

### Create a New Migration

After modifying `schema.prisma`:

```bash
npx prisma migrate dev --name descriptive_name
```

### Apply Migrations in Production

```bash
npx prisma migrate deploy
```

## Troubleshooting

### Can't connect to database

- Ensure PostgreSQL is running: `pg_isready`
- Check your DATABASE_URL credentials
- Verify the database exists

### Migration conflicts

If you have migration conflicts:

```bash
npx prisma migrate resolve --rolled-back <migration_name>
```

### Seed fails

- Ensure migrations are applied first
- Check that the database is empty or compatible with the seed data
- Review error messages for specific issues

## Database Schema Overview

The schema includes:

- **User Management**: Users, Students, Teachers, Parents, Admins
- **Authentication**: Sessions, RefreshTokens
- **Academic Content**: LectureNotes, Quizzes, Assignments, Exams
- **Performance Tracking**: StudentPerformance, AcademicHealth, StudentExamMarks
- **Interactions**: NoteBookmarks, NoteAnnotations, QuizParticipations
- **Scheduling**: Timetables, AcademicCalendar
- **Communication**: Notifications, NotificationPreferences

## Next Steps

After seeding, you can:

1. Start the backend server: `npm run dev`
2. Test authentication with seeded users
3. Explore the API endpoints
4. View data in Prisma Studio: `npx prisma studio`
