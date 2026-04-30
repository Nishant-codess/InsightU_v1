import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { generateTokens, UserRole } from './jwt';

const execAsync = promisify(exec);

/**
 * Login using SRM Academia portal credentials
 * Scrapes real data from academia.srmist.edu.in
 * Creates/updates user in DB with scraped profile data
 */
export async function loginWithPortal(email: string, password: string) {
  try {
    if (!email || !password) throw new Error('Email and password are required');
    if (!email.endsWith('@srmist.edu.in')) throw new Error('Please use your SRM email address (@srmist.edu.in)');

    // Run the full scraper
    const scraperPath = path.join(__dirname, '../../../python_scraper/srm_full_scraper.py');
    const command = `python "${scraperPath}" "${email}" "${password}"`;

    let scraperResult: any;
    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 120000 }); // 2 min timeout
      if (stderr) console.error('Scraper stderr:', stderr);
      scraperResult = JSON.parse(stdout);
    } catch (error: any) {
      console.error('Scraper error:', error.message);
      if (error.stdout) {
        try { scraperResult = JSON.parse(error.stdout); } catch { throw new Error('Portal authentication failed. Please try again.'); }
      } else {
        throw new Error('Portal authentication service unavailable. Please try again later.');
      }
    }

    if (!scraperResult.success) {
      throw new Error(scraperResult.error || 'Portal authentication failed. Check your credentials.');
    }

    // Extract profile from scraped data
    const profile = scraperResult.profile || {};
    const timetable = scraperResult.timetable || [];
    const attendance = scraperResult.attendance || [];
    const marks = scraperResult.marks || [];

    // Determine role: students have reg numbers like RA2311003010959
    const emailPrefix = email.split('@')[0].toUpperCase();
    const isStudent = /^[A-Z]{2}\d{10,}$/.test(emailPrefix) || /^[A-Z]{2}\d{4}$/.test(emailPrefix);
    const role = isStudent ? UserRole.STUDENT : UserRole.TEACHER;

    // Upsert user in database
    const prisma = (await import('../../config/database')).default;
    
    const studentName = profile.name || emailPrefix;
    const regNumber = profile.registrationNumber || emailPrefix;

    let user = await prisma.user.findUnique({
      where: { email },
      include: { student: true, teacher: true }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: '',
          role,
          ...(isStudent ? {
            student: {
              create: {
                name: studentName,
                registrationNumber: regNumber,
                course: profile.program || 'B.Tech',
                department: profile.department || 'Unknown',
                branch: 'CSE',
                year: profile.semester ? Math.ceil(parseInt(profile.semester) / 2) : 1,
                section: 'Unknown',
                batch: profile.batch || 'Unknown',
                group: 'Unknown',
                collegeMailId: email,
              }
            }
          } : {
            teacher: {
              create: {
                name: studentName,
                department: 'Unknown',
                subjects: timetable.map((c: any) => c.courseTitle).filter(Boolean),
              }
            }
          })
        },
        include: { student: true, teacher: true }
      });
    } else if (isStudent && user.student && profile.name) {
      // Update existing student profile with fresh data
      await prisma.student.update({
        where: { userId: user.id },
        data: {
          name: studentName,
          registrationNumber: regNumber,
          course: profile.program || user.student.course,
          department: profile.department || user.student.department,
          year: profile.semester ? Math.ceil(parseInt(profile.semester) / 2) : user.student.year,
          batch: profile.batch || user.student.batch,
        }
      });
    }

    // Generate JWT tokens
    const tokens = generateTokens(user.id, role, email);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: studentName,
        student: user.student,
        teacher: user.teacher,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      // Return portal data so frontend can use it immediately
      portalData: {
        profile,
        timetable,
        attendance,
        marks,
      }
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Portal login failed. Please try again.');
  }
}
