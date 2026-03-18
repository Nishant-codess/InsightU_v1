# InsightU Platform

InsightU is a modern, high-performance academic ecosystem designed for universities. It provides students with real-time academic health tracking, interactive lecture notes with Smart Board synchronization, automated timetable mapping, and collaborative section feeds.

---

## 🚀 Quick Start (Local Setup)

This guide provides step-by-step instructions for both **Windows** and **macOS** users to get the project running locally.

### 📋 Prerequisites

Ensure you have the following installed on your system:

- **Node.js**: Version 18.0.0 or higher ([Download](https://nodejs.org/))
- **PostgreSQL**: Version 15.0 or higher ([Download](https://www.postgresql.org/download/))
- **Redis**: 
  - **Mac**: Install via Homebrew: `brew install redis`
  - **Windows**: Use [Redis for Windows](https://github.com/tporadowski/redis/releases) or WSL2.
- **Git**: [Download](https://git-scm.com/downloads)

---

### 🛠️ Installation Steps

#### 1. Clone the Repository
Open your terminal (PowerShell/CMD on Windows, Terminal on Mac) and run:
```bash
git clone https://github.com/Nishant-codess/InsightU.git
cd InsightU
```

#### 2. Install Dependencies
This project uses **npm workspaces**. You only need to run this command once in the root directory to install dependencies for both the frontend and backend:
```bash
npm install
```

#### 3. Environment Configuration
Navigate to the `backend` directory and create your `.env` file:

**macOS / Linux:**
```bash
cd backend
cp .env.example .env
```

**Windows (PowerShell):**
```powershell
cd backend
copy .env.example .env
```

**⚠️ Exhaustive `.env` Config Guide:**
Open `backend/.env` in your code editor and configure the following:

- **DATABASE_URL**: Your PostgreSQL connection string. 
  - *Format*: `postgresql://<user>:<password>@localhost:5432/insightu`
  - *How to get*: Set this up in your local PostgreSQL pgAdmin or CLI.
- **JWT_SECRET & JWT_REFRESH_SECRET**:
  - *How to get*: You can generate these by running `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` in your terminal.
- **GOOGLE_CLIENT_ID & CLIENT_SECRET**:
  - *How to get*: Create a project in the [Google Cloud Console](https://console.cloud.google.com/), enable the "Google People API," and create OAuth 2.0 credentials.
- **REDIS_URL**: 
  - *Default*: `redis://localhost:6379`
  - *How to get*: Ensure your Redis server is running locally.

> [!IMPORTANT]
> For security, the `.env` file is ignored by Git and will not be uploaded to GitHub. Each person cloning the repo must create their own local `.env` file.

#### 4. Database Setup (Prisma)
Ensure PostgreSQL is running, then execute these commands in the `backend` folder:

```bash
# Generate the Prisma Client
npm run prisma:generate

# Run migrations to create the database schema
npm run prisma:migrate

# Seed the database with sample data
# After seeding, the following login works:
# Admin: admin@insightu.edu | Pass: admin123
npm run prisma:seed
```

---

### 🏁 Running the Application

You can start both the frontend and backend simultaneously from the **root directory**:

```bash
# Return to root directory
cd ..

# Start development servers
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)

---

## 📖 Key Features & Technology

- **Academic Health Tracking**: Real-time monitoring of attendance, credits, and performance.
- **Smart Timetable**: Automated mapping of academic schedules via AI-driven OCR logic.
- **Collaborative Sections**: GCR-style collaboration feed with subject-specific groups.
- **Note Sync**: Real-time synchronization of Smart Board annotations and lecture material.
- **Admin Portal**: Institutional oversight and schedule management.

### Tech Stack
- **Frontend**: React 18, TypeScript, TailwindCSS, Framer Motion, TanStack Query.
- **Backend**: Node.js, Express, Prisma ORM, PostgreSQL, Redis, Socket.io.
- **Testing**: Jest, Fast-check for property-based testing.

---

## 📂 Project Structure

- `frontend/`: React + Vite application with TailwindCSS and Framer Motion.
- `backend/`: Node.js + Express API with Prisma ORM and Socket.io.
- `prisma/`: Database schema and seed data definitions.

---

## 🛠️ Troubleshooting

- **Node Version**: If you encounter errors during `npm install`, ensure you are on Node 18+.
- **Database Connection**: Verify your `DATABASE_URL` matches your local PostgreSQL credentials.
- **Redis**: Ensure the Redis server is started (`redis-server`) before running the backend.

---

## 📜 License

Private Repository - All rights reserved.
