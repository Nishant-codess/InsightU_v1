import multer from 'multer';

import prisma from '../../config/database';

export interface NoteMetadata {
  teacherId: string;
  subject: string;
  topic: string;
  title: string;
  description?: string;
  lectureDate: Date;
}

// Memory storage for testing/development (in production this would be S3 or disk storage)
const storage = multer.memoryStorage();

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, PNG, and PPT/PPTX are allowed.'));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

export async function uploadNote(metadata: NoteMetadata, file: Express.Multer.File) {
  if (!metadata.subject || !metadata.topic || !metadata.lectureDate || !metadata.title) {
    throw new Error('Missing required metadata: subject, topic, title, and lectureDate are required');
  }

  // Simulate storing file and getting URL (e.g. from S3)
  const fileUrl = `https://storage.insightu.dev/notes/${Date.now()}_${file.originalname}`;

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

  return note;
}
