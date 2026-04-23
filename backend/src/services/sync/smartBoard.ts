import { Server } from 'socket.io';
import prisma from '../../config/database';
import { addAnnotation, getAnnotations } from '../notes/interactions';

let boardIO: Server | null = null;

export function setSmartBoardIO(io: Server) {
  boardIO = io;
}

/**
 * Broadcast a NEW_NOTE event to all section rooms the teacher is assigned to.
 */
export async function broadcastNewNote(
  teacherId: string,
  noteId: string,
  title: string,
  subject: string
) {
  if (!boardIO) return;

  const assignments = await prisma.sectionTeacher.findMany({
    where: { teacherId },
  });

  for (const a of assignments) {
    const sectionKey = `${a.year}-${a.section}-${a.department}`;
    boardIO.to(`section:${sectionKey}`).emit('NEW_NOTE', { type: 'NEW_NOTE', noteId, title, subject });
  }
}

/**
 * Store an annotation for a student on a note.
 */
export async function createAnnotation(
  studentId: string,
  noteId: string,
  page: number,
  x: number,
  y: number,
  text: string
) {
  return addAnnotation(studentId, noteId, {
    content: text,
    page,
    positionX: x,
    positionY: y,
  });
}

/**
 * Get all annotations for a student on a note (isolated by studentId).
 */
export async function getStudentAnnotations(studentId: string, noteId: string) {
  return getAnnotations(studentId, noteId);
}

// ─── Legacy Smart Board Sync (kept for backward compat) ──────────────────────

export function initializeSmartBoardSync(io: Server) {
  setSmartBoardIO(io);

  const smartBoardNamespace = io.of('/smart-board');

  smartBoardNamespace.on('connection', (socket) => {
    console.log('Smart Board interface connected:', socket.id);

    socket.on('join-session', (sessionId: string) => {
      socket.join(sessionId);
    });

    socket.on('board-update', (data: any) => {
      socket.to(data.sessionId).emit('live-stroke', data.stroke);
    });

    socket.on('disconnect', () => {
      console.log('Smart Board interface disconnected');
    });
  });
}

export function startSimulationMode(io: Server, sessionId: string) {
  setInterval(() => {
    io.of('/smart-board').to(sessionId).emit('live-stroke', {
      type: 'pen',
      color: '#66FCF1',
      points: [Math.random() * 500, Math.random() * 500],
    });
  }, 5000);
}
