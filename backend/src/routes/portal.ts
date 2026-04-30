/**
 * Portal Routes - SRM Academia Data Fetching
 * Fetches timetable, attendance, and marks from SRM portal
 */

import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { portalService } from '../services/timetable/finalPortalService';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/portal/all
 * Fetch all data (profile, timetable, attendance, marks)
 */
router.get('/all', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userAuth?.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    // Get user's SRM credentials from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        srmEmail: true,
        srmPassword: true,
      },
    });

    if (!user?.srmEmail || !user?.srmPassword) {
      res.status(400).json({
        success: false,
        error: 'SRM credentials not configured. Please link your SRM account.',
      });
      return;
    }

    // Fetch data from portal
    const result = await portalService.fetchAllData(
      user.srmEmail,
      user.srmPassword
    );

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to fetch portal data',
      });
    }
  } catch (error) {
    console.error('Error fetching portal data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/portal/timetable
 * Fetch timetable only
 */
router.get('/timetable', authenticate, async (req: AuthRequest, res) => {
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
      select: {
        srmEmail: true,
        srmPassword: true,
      },
    });

    if (!user?.srmEmail || !user?.srmPassword) {
      res.status(400).json({
        success: false,
        error: 'SRM credentials not configured',
      });
      return;
    }

    const result = await portalService.getTimetable(
      user.srmEmail,
      user.srmPassword
    );

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to fetch timetable',
      });
    }
  } catch (error) {
    console.error('Error fetching timetable:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/portal/attendance
 * Fetch attendance only
 */
router.get('/attendance', authenticate, async (req: AuthRequest, res) => {
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
      select: {
        srmEmail: true,
        srmPassword: true,
      },
    });

    if (!user?.srmEmail || !user?.srmPassword) {
      res.status(400).json({
        success: false,
        error: 'SRM credentials not configured',
      });
      return;
    }

    const result = await portalService.getAttendance(
      user.srmEmail,
      user.srmPassword
    );

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to fetch attendance',
      });
    }
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/portal/marks
 * Fetch marks only
 */
router.get('/marks', authenticate, async (req: AuthRequest, res) => {
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
      select: {
        srmEmail: true,
        srmPassword: true,
      },
    });

    if (!user?.srmEmail || !user?.srmPassword) {
      res.status(400).json({
        success: false,
        error: 'SRM credentials not configured',
      });
      return;
    }

    const result = await portalService.getMarks(
      user.srmEmail,
      user.srmPassword
    );

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to fetch marks',
      });
    }
  } catch (error) {
    console.error('Error fetching marks:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/portal/link-account
 * Link SRM account credentials
 */
router.post('/link-account', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userAuth?.userId;
    const { srmEmail, srmPassword } = req.body;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    if (!srmEmail || !srmPassword) {
      res.status(400).json({
        success: false,
        error: 'SRM email and password are required',
      });
      return;
    }

    // Validate credentials by trying to fetch data
    const testResult = await portalService.fetchAllData(srmEmail, srmPassword);
    
    if (!testResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid SRM credentials. Please check your email and password.',
      });
      return;
    }

    // Save credentials to database
    await prisma.user.update({
      where: { id: userId },
      data: {
        srmEmail,
        srmPassword, // TODO: Encrypt this in production
      },
    });

    res.json({
      success: true,
      message: 'SRM account linked successfully',
      profile: testResult.data?.profile,
    });
  } catch (error) {
    console.error('Error linking SRM account:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * DELETE /api/portal/clear-cache
 * Clear cached portal data for current user
 */
router.delete('/clear-cache', authenticate, async (req: AuthRequest, res) => {
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
      select: { srmEmail: true },
    });

    if (user?.srmEmail) {
      await portalService.clearCache(user.srmEmail);
    }

    res.json({
      success: true,
      message: 'Cache cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
