import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import { Server } from 'socket.io';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import { configurePassport } from './services/auth/oauth';
import { setupSocketIO } from './services/quiz/realtime';
import { setSectionIO } from './services/user/section';
import { setSmartBoardIO } from './services/sync/smartBoard';
import authRoutes from './routes/auth';
import sectionRoutes from './routes/section';
import adminRoutes from './routes/admin';
import studentRoutes from './routes/student';
import teacherRoutes from './routes/teacher';
import notificationRoutes from './routes/notifications';
import quizRoutes from './routes/quiz';
import { mockTestRouter, aiConfigRouter } from './routes/mockTest';
import classroomRoutes from './routes/classroom';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});
setupSocketIO(io);
setSectionIO(io);
setSmartBoardIO(io);
const PORT = process.env.PORT || 3000;

// Configure Passport
configurePassport();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/section', sectionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/mock-tests', mockTestRouter);
app.use('/api/user', aiConfigRouter);
app.use('/api/classroom', classroomRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
