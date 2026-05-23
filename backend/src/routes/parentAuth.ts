/**
 * Parent Authentication & Registration Routes
 */

import { Router } from 'express';
import prisma from '../config/database';
import bcrypt from 'bcrypt';
import { generateTokens } from '../services/auth/jwt';
import { authenticate, AuthRequest } from '../middleware/auth';
import { portalService } from '../services/timetable/finalPortalService';
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
 * POST /api/parent-auth/register
 * Parent registration with child's credentials
 */
router.post('/register', upload.single('childIdCard'), async (req, res) => {
  try {
    const { email, password, name, phone, childSrmEmail, childSrmPassword } = req.body;
    const childIdCardFile = req.file;

    if (!email || !password || !name || !childSrmEmail || !childSrmPassword) {
      res.status(400).json({
        success: false,
        error: 'All fields are required',
      });
      return;
    }

    if (!childIdCardFile) {
      res.status(400).json({
        success: false,
        error: "Child's ID card is required",
      });
      return;
    }

    // Validate child's SRM credentials
    console.log('Validating child SRM credentials...');
    const validationResult = await portalService.fetchAllData(
      childSrmEmail,
      childSrmPassword
    );

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid child SRM credentials. Please verify the email and password.',
      });
      return;
    }

    // Check if parent email already exists
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

    // Upload child ID card to Supabase
    const uploadResult = await uploadToSupabase(
      childIdCardFile.buffer,
      childIdCardFile.originalname,
      'child-id-cards',
      childIdCardFile.mimetype
    );

    // Create parent user
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'PARENT',
        parent: {
          create: {
            name,
            phone: phone || null,
            childSrmEmail,
            childSrmPassword, // TODO: Encrypt in production
            childIdCardUrl: uploadResult.url,
            approvalStatus: 'PENDING',
          },
        },
      },
      include: {
        parent: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Waiting for admin approval.',
      childProfile: validationResult.data?.profile,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        parent: {
          name: user.parent?.name,
          approvalStatus: user.parent?.approvalStatus,
        },
      },
    });
  } catch (error) {
    console.error('Parent registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
});

/**
 * POST /api/parent-auth/login
 * Parent login (only if approved)
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
        parent: true,
      },
    });

    if (!user || user.role !== 'PARENT') {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
      return;
    }

    // Check approval status
    if (user.parent?.approvalStatus !== 'APPROVED') {
      res.status(403).json({
        success: false,
        error: 'Your account is pending admin approval',
        approvalStatus: user.parent?.approvalStatus,
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

    // Fetch child's portal data automatically
    let portalData = null;
    try {
      const childData = await portalService.fetchAllData(
        user.parent.childSrmEmail,
        user.parent.childSrmPassword
      );
      if (childData.success) {
        portalData = childData.data;
      } else {
         throw new Error("Live portal fetch failed");
      }
    } catch (error) {
      console.log('Could not fetch child portal data, falling back to mock DB data:', error);
      // Fallback to database for mock users
      const childUser = await prisma.user.findUnique({
         where: { email: user.parent.childSrmEmail },
         include: { student: { include: { portalData: true } } }
      });
      if (childUser?.student?.portalData) {
         portalData = {
            ...childUser.student.portalData,
            profile: {
               name: childUser.student.name,
               registrationNumber: childUser.student.registrationNumber,
               department: childUser.student.department,
               program: childUser.student.course,
               batch: childUser.student.batch,
               semester: childUser.student.year * 2 + ''
            }
         };
      }
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        parent: {
          id: user.parent?.id,
          name: user.parent?.name,
          phone: user.parent?.phone,
          childSrmEmail: user.parent?.childSrmEmail,
        },
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      portalData,
    });
  } catch (error) {
    console.error('Parent login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

/**
 * GET /api/parent-auth/child-data
 * Get child's portal data (auto-login with stored credentials)
 */
router.get('/child-data', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userAuth?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        parent: true,
      },
    });

    if (!user || user.role !== 'PARENT' || !user.parent) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    // Fetch child's data using stored credentials
    const childData = await portalService.fetchAllData(
      user.parent.childSrmEmail,
      user.parent.childSrmPassword
    );

    if (childData.success) {
      res.json({
        success: true,
        childData: childData.data,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch child data',
      });
    }
  } catch (error) {
    console.error('Child data fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch child data',
    });
  }
});

/**
 * GET /api/parent-auth/status
 * Check approval status
 */
router.get('/status/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        parent: true,
      },
    });

    if (!user || user.role !== 'PARENT') {
      res.status(404).json({
        success: false,
        error: 'Parent not found',
      });
      return;
    }

    res.json({
      success: true,
      approvalStatus: user.parent?.approvalStatus,
      rejectionReason: user.parent?.rejectionReason,
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
