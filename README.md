# InsightU Platform

InsightU is a modern, high-performance academic ecosystem designed for universities. It provides students with real-time academic health tracking, interactive lecture notes, automated timetable mapping, Google Classroom-style collaboration, and code sharing whiteboards.

---

## 🎯 Recent Major Updates (v2.0.0)

### ✨ New Features:
- **GCR-style Classrooms**: Teacher-created classrooms with invite codes, posts, links, and file attachments
- **Code Sharing Whiteboards**: Collaborative code editing with approval workflow
- **Supabase Integration**: Secure file storage for classroom materials
- **Enhanced Security**: Rate limiting, CORS restrictions, stronger password requirements

### 🗑️ Removed:
- Section feed feature (replaced with classroom-based collaboration)

**📚 See [CHANGELOG.md](CHANGELOG.md) for complete details**

---

## 🚀 Quick Start (5 Minutes)

### 📋 Prerequisites

- **Node.js**: Version 18.0.0 or higher ([Download](https://nodejs.org/))
- **PostgreSQL**: Version 15.0 or higher ([Download](https://www.postgresql.org/download/))
- **Redis**: 
  - **Mac**: `brew install redis && brew services start redis`
  - **Windows**: [Redis for Windows](https://github.com/tporadowski/redis/releases) or WSL2
- **Supabase Account**: Free tier at [supabase.com](https://supabase.com)

---

### 🛠️ Installation Steps

#### 1. Clone the Repository
```bash
git clone https://github.com/Nishant-codess/InsightU.git
cd InsightU
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Setup Supabase

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to **Storage** → Create bucket named `insightu-files` (make it public)
4. Go to **Settings** → **API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

#### 4. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your credentials:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/insightu?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# JWT (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# File Storage
FILE_STORAGE_PATH=./uploads

# Supabase (paste your credentials from step 3)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_BUCKET_NAME=insightu-files
```

#### 5. Configure Frontend

```bash
cd ../frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### 6. Setup Database

```bash
cd ../backend

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed with sample data
npm run prisma:seed
```

**Sample Login Credentials:**
- **Admin**: `admin@insightu.edu` / `admin123`
- **Teacher**: `teacher@insightu.edu` / `teacher123`
- **Student**: `student1@insightu.edu` / `student123`

#### 7. Start Development Servers

From root directory:
```bash
npm run dev
```

Or separately:
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)

---

## 📖 Key Features

### 🎓 For Students:
- **Academic Health Dashboard**: Real-time attendance, credits, and performance tracking
- **Smart Timetable**: Automated schedule with day-order system
- **Lecture Notes**: Browse, bookmark, and annotate materials
- **Quiz System**: Solo attempts and live quiz sessions
- **Mock Tests**: Practice exams with difficulty levels
- **Portal Sync**: Import attendance and marks from SRM portal
- **Classrooms**: Join teacher-created classrooms for materials and announcements
- **Whiteboards**: Collaborative code sharing sessions

### 👨‍🏫 For Teachers:
- **Classroom Management**: Create classrooms with invite codes
- **Post Materials**: Share links, PDFs, images, and documents
- **Approve Students**: Control who joins your classrooms
- **Lecture Notes Upload**: Share course materials
- **Quiz Creation**: Build interactive quizzes
- **Whiteboard Sessions**: Share code with students in real-time
- **Performance Analytics**: View class health metrics

### 👨‍💼 For Admins:
- **Calendar Management**: Upload academic calendars
- **Timetable Management**: Manage unified batch timetables
- **User Management**: List, update, delete users
- **System Stats**: Monitor platform health

### 🔄 Real-time Features:
- Live quiz sessions with leaderboards (Socket.IO)
- Smart Board synchronization
- Real-time notifications

---

## 🏗️ Tech Stack

### Frontend:
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS + Framer Motion
- **State**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Real-time**: Socket.IO client
- **Charts**: Chart.js
- **PDF Viewer**: react-pdf

### Backend:
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Caching**: Redis
- **Real-time**: Socket.IO
- **Authentication**: JWT + Google OAuth 2.0
- **File Storage**: Supabase Storage
- **Security**: bcrypt, express-rate-limit
- **Testing**: Jest + Fast-check

---

## 📂 Project Structure

```
InsightU/
├── backend/
│   ├── prisma/              # Database schema and migrations
│   ├── src/
│   │   ├── config/          # Database, Redis, Supabase config
│   │   ├── middleware/      # Auth, RBAC, error handling
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   │   ├── classroom/   # Classroom management
│   │   │   ├── whiteboard/  # Whiteboard management
│   │   │   ├── auth/        # Authentication
│   │   │   └── ...
│   │   └── index.ts         # Server entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Zustand stores
│   │   └── App.tsx
│   └── package.json
├── CHANGELOG.md             # Detailed change log
├── SETUP_GUIDE.md           # Comprehensive setup guide
├── IMPLEMENTATION_SUMMARY.md # Technical implementation details
└── README.md                # This file
```

---

## 🔒 Security Features

- ✅ Rate limiting (100 req/15min general, 5 req/15min auth)
- ✅ CORS restrictions to frontend domain only
- ✅ Strong password requirements (8+ chars, uppercase, lowercase, number, special char)
- ✅ JWT token authentication with refresh tokens
- ✅ Role-based access control (RBAC)
- ✅ Request size limits (10MB)
- ✅ File type validation on uploads
- ✅ Secure file storage with Supabase
- ✅ Environment-based configuration

---

## 📚 Documentation

- **[CHANGELOG.md](CHANGELOG.md)** - Complete list of changes and migration guide
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed setup instructions and troubleshooting
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Technical implementation details

---

## 🛠️ Available Scripts

### Root Directory:
```bash
npm run dev          # Start both frontend and backend
npm install          # Install all dependencies (workspaces)
```

### Backend:
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm test             # Run tests
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
npm run prisma:seed      # Seed database with sample data
```

### Frontend:
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run tests
```

---

## 🐛 Troubleshooting

### Port Already in Use:
```bash
# Kill process on port 3000 (backend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### Database Connection Error:
- Check PostgreSQL is running: `pg_isready`
- Verify `DATABASE_URL` in `.env`
- Ensure database `insightu` exists

### Redis Connection Error:
- Check Redis is running: `redis-cli ping` (should return PONG)
- Verify `REDIS_URL` in `.env`

### Supabase Upload Error:
- Verify bucket name matches `SUPABASE_BUCKET_NAME`
- Check bucket is public or has correct policies
- Ensure service role key is correct

### Migration Error:
```bash
# Reset and try again
cd backend
npx prisma migrate reset
npx prisma migrate dev
```

**📖 See [SETUP_GUIDE.md](SETUP_GUIDE.md) for more troubleshooting**

---

## 🚀 Deployment

### Production Checklist:
- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Configure production database
- [ ] Set `FRONTEND_URL` to production domain
- [ ] Enable HTTPS
- [ ] Configure Supabase for production
- [ ] Set up proper CORS origins
- [ ] Run `npx prisma migrate deploy`

---

## 📜 License

Private Repository - All rights reserved.

---

## 🤝 Contributing

This is a private repository. For access or contributions, please contact the repository owner.

---

## 📞 Support

For issues or questions:
1. Check [SETUP_GUIDE.md](SETUP_GUIDE.md) for common problems
2. Review [CHANGELOG.md](CHANGELOG.md) for recent changes
3. Check API endpoints in `backend/src/routes/`
4. Review service logic in `backend/src/services/`

---

**Built with ❤️ for modern academic institutions**
