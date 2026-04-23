import multer from 'multer';

import prisma from '../../config/database';
import { storeFile } from './storage';
import { notifyCourseStudentsAboutNote } from '../notifications/notifications';

export interface NoteMetadata {
  teacherId: string;
  subject: string;
  topic: string;
  title: string;
  description?: string;
  lectureDate: Date;
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

export const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, images (JPEG, PNG, GIF, WebP), and PPT/PPTX are allowed.'));
  }
};

// Memory storage — file is buffered then handed off to the storage abstraction
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});

export async function uploadNote(metadata: NoteMetadata, file: Express.Multer.File) {
  if (!metadata.subject || !metadata.topic || !metadata.lectureDate || !metadata.title) {
    throw new Error('Missing required metadata: subject, topic, title, and lectureDate are required');
  }

  // Persist the file via the storage abstraction (local disk or S3)
  const { fileUrl } = await storeFile(
    file.buffer ?? Buffer.alloc(0),
    file.originalname,
    file.mimetype
  );

  const note = await prisma.lectureNote.create({
    data: {
      teacherId: metadata.teacherId,
      subject: metadata.subject,
      topic: metadata.topic,
      title: metadata.title,
      description: metadata.description,
      fileUrl,
      fileType: file.mimetype,
      lectureDate: metadata.lectureDate,
    },
  });

  // Notify relevant students about the new note — fire-and-forget, never breaks upload
  try {
    await notifyCourseStudentsAboutNote(metadata.teacherId, metadata.subject, '/notes/' + note.id);
  } catch (err) {
    console.error('[notifications] Failed to send note upload notifications:', err);
  }

  return note;
}
