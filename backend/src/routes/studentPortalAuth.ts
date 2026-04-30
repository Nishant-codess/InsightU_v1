import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateTokens } from '../services/auth/jwt';
import { portalService } from '../services/timetable/finalPortalService';

const router = Router();
const prisma = new PrismaClient();

/**
 * Student Portal Login
 * POST /api/auth/student-portal-login
 * 
 * Accepts SRM Academia credentials and:
 * 1. Fetches student data from SRM portal
 * 2. Creates/updates student in DB
 * 3. Fetches portal data (timetable, attendance, marks)
 * 4. Returns tokens and portal data
 */
router.post('/student-portal-login', async (req: Request, res: Response): Promise<any> => {
  try {
    const { srmEmail, srmPassword } = req.body;

    if (!srmEmail || !srmPassword) {
      return res.status(400).json({
        error: { message: 'SRM email and password are required' }
      });
    }

    console.log(`[Student Portal Login] Attempting login for: ${srmEmail}`);

    // Fetch student data from SRM portal
    const result = await portalService.fetchAllData(srmEmail, srmPassword);

    if (!result.success || !result.data) {
      return res.status(401).json({
        error: { message: 'Invalid SRM credentials' }
      });
    }

    const portalData = result.data;
    const profile = portalData.profile;

    if (!profile) {
      return res.status(401).json({
        error: { message: 'Could not fetch student profile from portal' }
      });
    }

    // Find or create student in DB
    let student = await prisma.student.findUnique({
      where: { registrationNumber: profile.registrationNumber }
    });

    if (!student) {
      // Create new student (without User account - students don't have login)
      student = await prisma.student.create({
        data: {
          registrationNumber: profile.registrationNumber,
          name: profile.name,
          course: profile.course,
          department: profile.department,
          branch: profile.branch,
          year: profile.year,
          section: profile.section,
          batch: profile.batch,
          group: profile.group,
          collegeMailId: profile.collegeMailId,
          user: {
            create: {
              email: srmEmail,
              passwordHash: null, // No password for portal-only students
              role: 'STUDENT',
              srmEmail,
              srmPassword, // Store encrypted in production
            }
          }
        },
        include: { user: true }
      });
    } else {
      // Update existing student's SRM credentials
      await prisma.user.updateMany({
        where: { id: student.userId },
        data: {
          srmEmail,
          srmPassword
        }
      });
    }

    // Store portal data
    await prisma.portalData.upsert({
      where: { studentId: student.id },
      create: {
        studentId: student.id,
        attendance: portalData.attendance || [],
        marks: portalData.marks || [],
        timetable: portalData.timetable || []
      },
      update: {
        attendance: portalData.attendance || [],
        marks: portalData.marks || [],
        timetable: portalData.timetable || []
      }
    });

    // Generate tokens
    const user = await prisma.user.findUnique({
      where: { id: student.userId },
      include: { student: true }
    });

    if (!user) {
      return res.status(500).json({
        error: { message: 'Failed to create user session' }
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role as any, user.email);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    console.log(`[Student Portal Login] Success for: ${srmEmail}`);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        student: user.student
      },
      accessToken,
      refreshToken,
      portalData: {
        attendance: portalData.attendance,
        marks: portalData.marks,
        timetable: portalData.timetable
      }
    });
  } catch (error: any) {
    console.error('[Student Portal Login] Error:', error);
    res.status(500).json({
      error: { message: error.message || 'Portal login failed' }
    });
  }
});

export default router;
