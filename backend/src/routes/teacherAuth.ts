/**
 * Teacher Authentication & Registration Routes
 */

import { Router } from 'express';
import prisma from '../config/database';
import bcrypt from 'bcrypt';
import { generateTokens } from '../services/auth/jwt';
import { uploadToSupabase } from '../config/supabase';
import multer from 'multer';

const router = Router();
const SALT_ROUNDS = 10;

// Multer config for memory storage (Supabase upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  },
});

/**
 * POST /api/teacher-auth/register
 * Teacher registration with ID card
 */
router.post('/register', upload.single('idCard'), async (req, res) => {
  try {
    const { email, password, name, department, subjects } = req.body;
    const idCardFile = req.file;

    if (!email || !password || !name || !department) {
      res.status(400).json({
        success: false,
        error: 'Email, password, name, and department are required',
      });
      return;
    }

    if (!idCardFile) {
      res.status(400).json({
        success: false,
        error: 'ID card is required',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'Email already registered',
      });
      return;
    }

    // Create user and teacher
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const subjectsArray = subjects ? JSON.parse(subjects) : [];

    // Upload ID card to Supabase
    const uploadResult = await uploadToSupabase(
      idCardFile.buffer,
      idCardFile.originalname,
      'teacher-id-cards',
      idCardFile.mimetype
    );

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'TEACHER',
        teacher: {
          create: {
            name,
            department,
            subjects: subjectsArray,
            idCardUrl: uploadResult.url,
            approvalStatus: 'PENDING',
          },
        },
      },
      include: {
        teacher: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Waiting for admin approval.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        teacher: {
          name: user.teacher?.name,
          department: user.teacher?.department,
          approvalStatus: user.teacher?.approvalStatus,
        },
      },
    });
  } catch (error) {
    console.error('Teacher registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
});

/**
 * POST /api/teacher-auth/login
 * Teacher login (only if approved)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        teacher: true,
      },
    });

    if (!user || user.role !== 'TEACHER') {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
      return;
    }

    // Check approval status
    if (user.teacher?.approvalStatus !== 'APPROVED') {
      res.status(403).json({
        success: false,
        error: 'Your account is pending admin approval',
        approvalStatus: user.teacher?.approvalStatus,
      });
      return;
    }

    // Verify password
    if (!user.passwordHash) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
      return;
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
      return;
    }

    // Generate token
    const tokens = generateTokens(user.id, user.role as any, user.email);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        teacher: {
          id: user.teacher?.id,
          name: user.teacher?.name,
          department: user.teacher?.department,
          subjects: user.teacher?.subjects,
        },
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    console.error('Teacher login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

/**
 * GET /api/teacher-auth/status
 * Check approval status
 */
router.get('/status/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        teacher: true,
      },
    });

    if (!user || user.role !== 'TEACHER') {
      res.status(404).json({
        success: false,
        error: 'Teacher not found',
      });
      return;
    }

    res.json({
      success: true,
      approvalStatus: user.teacher?.approvalStatus,
      rejectionReason: user.teacher?.rejectionReason,
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check status',
    });
  }
});

export default router;
