import http from 'http';
import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import { configurePassport } from './services/auth/oauth';
import { setSmartBoardIO } from './services/sync/stub';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import studentRoutes from './routes/student';
import classroomRoutes from './routes/classroom';
import portalRoutes from './routes/portal';
import teacherAuthRoutes from './routes/teacherAuth';
import parentAuthRoutes from './routes/parentAuth';
import studentPortalAuthRoutes from './routes/studentPortalAuth';
import adminLoginRoutes from './routes/adminLogin';
import aiQuizRoutes from './routes/aiQuiz';
import notesRoutes from './routes/notes';
import studentNotesRoutes from './routes/studentNotes';
import holidaysRoutes from './routes/holidays';
import papersRoutes from './routes/papers';
import sessionsRoutes from './routes/sessions';
import calendarDaysRoutes from './routes/calendarDays';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// CORS configuration - restrict to frontend domain
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',') 
  : ['http://localhost:5173', 'http://localhost:3000'];

const io = new Server(httpServer, {
  cors: { 
    origin: allowedOrigins,
    credentials: true 
  },
});
setSmartBoardIO(io);
const PORT = process.env.PORT || 3000;

// Configure Passport
configurePassport();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 10000 : 100, // Limit each IP to 100 requests per windowMs (10000 in dev)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 5, // Limit each IP to 5 login attempts per windowMs (1000 in dev)
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(passport.initialize());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Apply rate limiting
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', studentPortalAuthRoutes);
app.use('/api/auth', adminLoginRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/classroom', classroomRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/teacher-auth', teacherAuthRoutes);
app.use('/api/parent-auth', parentAuthRoutes);

// New Feature Routes
app.use('/api/ai-quiz', aiQuizRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/student-notes', studentNotesRoutes);
app.use('/api/holidays', holidaysRoutes);
app.use('/api/papers', papersRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/calendar-days', calendarDaysRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Socket.IO Live Session Event Handlers ────────────────────────────────────
// Track live sessions: sessionId -> Map<socketId, UserDetails>
const sessionUsers = new Map<string, Map<string, any>>();

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // JOIN SESSION - student or teacher joins a live session room
  socket.on('join_session', (payload: any) => {
    // Handle backwards compatibility if payload is just a string (sessionId)
    const sessionId = typeof payload === 'string' ? payload : payload?.sessionId;
    const user = typeof payload === 'object' ? payload?.user : { name: 'Unknown', id: socket.id, role: 'UNKNOWN' };
    
    if (!sessionId) return;
    socket.join(`session:${sessionId}`);
    
    if (!sessionUsers.has(sessionId)) {
      sessionUsers.set(sessionId, new Map());
    }
    
    sessionUsers.get(sessionId)!.set(socket.id, user);
    const usersMap = sessionUsers.get(sessionId)!;
    const count = usersMap.size;
    
    io.to(`session:${sessionId}`).emit('student_count', count);
    io.to(`session:${sessionId}`).emit('student_list', Array.from(usersMap.values()));
    
    console.log(`[Socket.IO] ${socket.id} joined session:${sessionId} (${count} total)`);
  });

  // DRAWING EVENTS - broadcast draw actions to all in session
  socket.on('draw', (data: any) => {
    const sessionId = data?.sessionId;
    if (sessionId) {
      socket.to(`session:${sessionId}`).emit('draw', data);
    }
  });

  socket.on('draw_end', (data: any) => {
    const sessionId = data?.sessionId;
    if (sessionId) {
      socket.to(`session:${sessionId}`).emit('draw_end', data);
    }
  });

  socket.on('canvas_state', (data: any) => {
    const sessionId = data?.sessionId;
    if (sessionId) {
      socket.to(`session:${sessionId}`).emit('canvas_state', data);
    }
  });

  // CLEAR BOARD - teacher clears, all clients receive
  socket.on('clear_board', (data: any) => {
    const sessionId = data?.sessionId;
    if (sessionId) {
      socket.to(`session:${sessionId}`).emit('clear_board');
    }
  });

  // UNDO - propagate undo action
  socket.on('undo', (data: any) => {
    const sessionId = data?.sessionId;
    if (sessionId) {
      socket.to(`session:${sessionId}`).emit('undo');
    }
  });

  // SWITCH MODE - whiteboard/screen/pdf/video
  socket.on('switch_mode', (data: any) => {
    const sessionId = data?.sessionId;
    if (sessionId) {
      socket.to(`session:${sessionId}`).emit('switch_mode', data.mode);
    }
  });

  // VIDEO SYNC EVENTS
  socket.on('video_load', (data: any) => {
    const sessionId = data?.sessionId;
    if (sessionId) {
      socket.to(`session:${sessionId}`).emit('video_load', data.url);
    }
  });

  socket.on('video_play', (data: any) => {
    const sessionId = data?.sessionId;
    if (sessionId) {
      socket.to(`session:${sessionId}`).emit('video_play', data.time);
    }
  });

  socket.on('video_pause', (data: any) => {
    const sessionId = data?.sessionId;
    if (sessionId) {
      socket.to(`session:${sessionId}`).emit('video_pause', data.time);
    }
  });

  // PDF SYNC EVENTS
  socket.on('pdf_load', (data: any) => {
    const sessionId = data?.sessionId;
    if (sessionId) {
      socket.to(`session:${sessionId}`).emit('pdf_load', data.url);
    }
  });

  socket.on('pdf_page_change', (data: any) => {
    const sessionId = data?.sessionId;
    if (sessionId) {
      socket.to(`session:${sessionId}`).emit('pdf_page_change', data.page);
    }
  });

  // ANNOTATION PERMISSION EVENTS
  socket.on('permission_request', (data: any) => {
    const sessionId = data?.sessionId;
    if (sessionId) {
      // Forward request to teacher (broadcast to session room, teacher handles it)
      socket.to(`session:${sessionId}`).emit('permission_request', {
        studentId: data.studentId,
        studentName: data.studentName,
        socketId: socket.id
      });
    }
  });

  socket.on('permission_response', (data: any) => {
    const sessionId = data?.sessionId;
    if (sessionId) {
      // Broadcast permission grant/revoke to whole session
      io.to(`session:${sessionId}`).emit('permission_response', {
        studentId: data.studentId,
        granted: data.granted
      });
    }
  });

  socket.on('disconnect', () => {
    // Remove socket from all session rooms
    sessionUsers.forEach((usersMap, sessionId) => {
      if (usersMap.has(socket.id)) {
        usersMap.delete(socket.id);
        io.to(`session:${sessionId}`).emit('student_count', usersMap.size);
        io.to(`session:${sessionId}`).emit('student_list', Array.from(usersMap.values()));
      }
    });
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  await disconnectDatabase();
  await disconnectRedis();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    await connectRedis();
    
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { httpServer };
export default app;

