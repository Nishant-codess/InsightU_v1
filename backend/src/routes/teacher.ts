import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { uploadMiddleware, uploadNote } from '../services/notes/upload';
import { broadcastNewNote } from '../services/sync/smartBoard';

const router = Router();

// Req: Fetch Teacher Dashboard Data
router.get('/dashboard', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) {
            res.status(401).json({ error: 'User ID not found in token' });
            return;
        }

        const teacher = await prisma.teacher.findUnique({
            where: { userId },
            include: {
                sectionAssignments: true
            }
        });

        if (!teacher) {
            res.status(404).json({ error: 'Teacher profile not found' });
            return;
        }

        // Get segments assigned to teacher
        const sections = teacher.sectionAssignments;

        // Get students in these sections
        const studentConditions = sections.map(s => ({
            year: s.year,
            section: s.section,
            department: s.department
        }));

        let activeStudents = 0;
        let averageClassHealth = 0;

        if (studentConditions.length > 0) {
            const students = await prisma.student.findMany({
                where: {
                    OR: studentConditions
                },
                include: {
                    academicHealth: true
                }
            });
            activeStudents = students.length;
            
            const healthScores = students
                .map(s => s.academicHealth?.overallScore || 0)
                .filter(score => score > 0);
            
            if (healthScores.length > 0) {
                averageClassHealth = healthScores.reduce((a, b) => a + b, 0) / healthScores.length;
            }
        }

        const quizzesCompleted = await prisma.quiz.count({
            where: { teacherId: teacher.id }
        });

        const notesUploaded = await prisma.lectureNote.count({
            where: { teacherId: teacher.id }
        });
        
        const assignmentsPosted = await prisma.assignment.count({
            where: { teacherId: teacher.id }
        });

        const recentClasses = await prisma.lectureNote.findMany({
            where: { teacherId: teacher.id },
            orderBy: { lectureDate: 'desc' },
            take: 5
        });

        res.status(200).json({
            stats: {
                activeStudents,
                quizzesCompleted,
                assignmentsPosted: assignmentsPosted + notesUploaded, // Match frontend label if needed
                notesUploaded,
                averageClassHealth: parseFloat(averageClassHealth.toFixed(1))
            },
            recentClasses: recentClasses.map(c => ({
                id: c.id,
                subject: c.subject,
                topic: c.topic,
                date: c.lectureDate.toLocaleDateString() + ', ' + c.lectureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }))
        });
    } catch (error) {
        next(error);
    }
});

// Req 26.1 — Upload a lecture note (multipart)
router.post('/notes', authenticate, uploadMiddleware.single('file'), async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const teacher = await prisma.teacher.findUnique({ where: { userId } });
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { subject, topic, title, description, lectureDate } = req.body;
        if (!subject || !topic || !title || !lectureDate) {
            return res.status(400).json({ error: 'subject, topic, title, and lectureDate are required' });
        }

        const note = await uploadNote(
            {
                teacherId: teacher.id,
                subject,
                topic,
                title,
                description,
                lectureDate: new Date(lectureDate),
            },
            req.file
        );

        // Broadcast to section rooms — fire-and-forget
        broadcastNewNote(teacher.id, note.id, note.title, note.subject).catch((err) =>
            console.error('[smartBoard] broadcast error:', err)
        );

        return res.status(201).json({ note });
    } catch (error) {
        next(error);
        return;
    }
});

// Req 26.1 — List teacher's uploaded notes
router.get('/notes', authenticate, async (req: AuthRequest, res: Response, next) => {
    try {
        const userId = req.userAuth?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const teacher = await prisma.teacher.findUnique({ where: { userId } });
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

        const notes = await prisma.lectureNote.findMany({
            where: { teacherId: teacher.id },
            orderBy: { lectureDate: 'desc' },
        });

        return res.status(200).json({ notes });
    } catch (error) {
        next(error);
        return;
    }
});

export default router;
