import http from 'http';
import express from 'express';
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
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
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
