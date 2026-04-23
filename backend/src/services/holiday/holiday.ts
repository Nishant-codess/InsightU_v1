import { PrismaClient } from '@prisma/client';
import { differenceInDays, addDays, isWeekend, format, isWithinInterval } from 'date-fns';

const prisma = new PrismaClient();

export interface VacationAnalysis {
    missedClasses: Record<string, number>;
    predictedAttendance: Record<string, {
        subject: string;
        current: number;
        afterVacation: number;
        classesNeededTo75: number;
        isAtRisk: boolean;
    }>;
    riskScore: number; // 1-10
}

export async function getHolidays() {
    const calendar = await prisma.academicCalendar.findFirst({
        orderBy: { uploadedAt: 'desc' }
    });

    if (!calendar) return { holidays: [], calendar: null };

    const mapping = calendar.dayOrderMapping as any;
    const holidays = Object.entries(mapping)
        .filter(([_, val]) => typeof val === 'string' && val !== 'Day1' && val !== 'Day2' && val !== 'Day3' && val !== 'Day4' && val !== 'Day5' && val !== 'LWD')
        .map(([date, reason]) => ({ date, reason }));

    return { holidays, calendar: { academicYear: calendar.academicYear } };
}

export async function analyzeVacationRisk(
    studentId: string,
    startDate: string,
    endDate: string,
    currentAttendance: Record<string, number> // { "Subject Name": 85.5 }
): Promise<VacationAnalysis> {
    const student = await prisma.student.findUnique({
        where: { id: studentId }
    });

    if (!student) throw new Error("Student not found");

    const timetable = await prisma.sectionTimetable.findUnique({
        where: {
            year_section_batch_department: {
                year: student.year,
                section: student.section,
                batch: student.batch,
                department: student.department
            }
        }
    });

    const calendar = await prisma.academicCalendar.findFirst({
        orderBy: { uploadedAt: 'desc' }
    });

    if (!timetable || !calendar) {
        throw new Error("Timetable or Academic Calendar not published yet");
    }

    const dayOrderMapping = calendar.dayOrderMapping as Record<string, string>;
    const schedule = timetable.schedule as any; // { Day1: [...], ... }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysCount = differenceInDays(end, start) + 1;

    const missedClasses: Record<string, number> = {};
    const totalPotentialClasses: Record<string, number> = {}; 

    // 1. Calculate missed classes in range
    for (let i = 0; i < daysCount; i++) {
        const currentDate = addDays(start, i);
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const dayOrder = dayOrderMapping[dateStr];

        if (dayOrder && dayOrder.startsWith('Day')) {
            const daySlots = schedule[dayOrder] || [];
            daySlots.forEach((slot: any) => {
                if (slot.subject) {
                    missedClasses[slot.subject] = (missedClasses[slot.subject] || 0) + 1;
                }
            });
        }
    }

    // 2. Estimate total classes in semester (Roughly 90 working days = 18 days per day order)
    // In a real system, we'd scan the entire calendar dayOrderMapping.
    const remainingDaysMapping = Object.entries(dayOrderMapping).filter(([date, _]) => new Date(date) > new Date());
    const totalSemesterClasses: Record<string, number> = {};
    
    Object.entries(dayOrderMapping).forEach(([_, order]) => {
        if (order.startsWith('Day')) {
            const slots = schedule[order] || [];
            slots.forEach((s: any) => {
                totalSemesterClasses[s.subject] = (totalSemesterClasses[s.subject] || 0) + 1;
            });
        }
    });

    // 3. Calculate predicted attendance
    const predictedAttendance: VacationAnalysis['predictedAttendance'] = {};
    let totalRiskPoints = 0;
    let subjectCount = 0;

    for (const subject in currentAttendance) {
        const currentPercent = currentAttendance[subject];
        const totalClasses = totalSemesterClasses[subject] || 30; // Fallback to 30 if not found
        const missed = missedClasses[subject] || 0;

        // Current status (estimate)
        // Assume student has attended 'currentPercent' of classes so far.
        // For simplicity: Attended = currentPercent * (totalClasses * current_progress_ratio)
        // Better: currentAttendance should provide 'attended' and 'total_so_far'
        // Since we don't have that, we assume totalClasses is the full semester.
        const currentAttended = (currentPercent / 100) * (totalClasses * 0.5); // Assuming 50% into sem
        const totalSoFar = totalClasses * 0.5;
        
        const predictedPercent = ((currentAttended) / (totalSoFar + missed)) * 100;
        
        // Classes needed to reach 75%
        // (Attended + x) / (TotalSoFar + missed + x) >= 0.75
        // Attended + x >= 0.75 * (TotalSoFar + missed + x)
        // Attended + x >= 0.75*TotalSoFar + 0.75*missed + 0.75x
        // 0.25x >= 0.75*TotalSoFar + 0.75*missed - Attended
        // x >= (0.75*(TotalSoFar + missed) - Attended) / 0.25
        const needed = Math.max(0, Math.ceil((0.75 * (totalSoFar + missed) - currentAttended) / 0.25));

        predictedAttendance[subject] = {
            subject,
            current: currentPercent,
            afterVacation: Math.round(predictedPercent * 100) / 100,
            classesNeededTo75: needed,
            isAtRisk: predictedPercent < 75
        };

        if (predictedPercent < 75) totalRiskPoints += (75 - predictedPercent);
        subjectCount++;
    }

    // Risk Score: 1 - 10
    // Based on average drop below 75%
    const avgRisk = subjectCount > 0 ? totalRiskPoints / subjectCount : 0;
    const riskScore = Math.min(10, Math.max(1, Math.round(avgRisk / 2) + 1));

    return {
        missedClasses,
        predictedAttendance,
        riskScore
    };
}
