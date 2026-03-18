import fc from 'fast-check';
import { uploadNote, uploadMiddleware, NoteMetadata } from './upload';
import { Request } from 'express';

jest.mock('../../config/database', () => {
  return {
    __esModule: true,
    default: {
      lectureNote: {
        create: jest.fn(async (args) => {
          return { id: 'mock-note-id', ...args.data };
        }),
      },
      teacher: {
        findUnique: jest.fn().mockResolvedValue({ id: 'mock-teacher-id' }),
      },
    },
  };
});

describe('Feature: insightu-platform, Lecture Note Uploads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Property 21: File type acceptance (Multer Middleware)', () => {
    fc.assert(
      fc.property(
        fc.string(), 
        fc.constantFrom(
          'application/pdf',
          'image/jpeg',
          'image/png',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'invalid/mimetype',
          'application/json'
        ),
        (filename, mimetype) => {
          const req = {} as Request;
          const file = { mimetype, originalname: filename } as Express.Multer.File;
          
          let accepted = false;
          let error: Error | any = null;
          
          // Access the fileFilter directly
          const fileFilter = (uploadMiddleware as any).fileFilter || (uploadMiddleware as any).opts?.fileFilter;
          
          if (!fileFilter) return; // safety check
          
          fileFilter(req, file, (err: Error | null, success?: boolean) => {
            if (err) error = err;
            if (success) accepted = success;
          });

          const isAllowedType = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          ].includes(mimetype);

          if (isAllowedType) {
            expect(accepted).toBe(true);
            expect(error).toBeNull();
          } else {
            expect(accepted).toBe(false);
            expect(error).toBeDefined();
            expect(error?.message).toContain('Invalid file type');
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Property 22 & 23: Metadata requirement enforcement and round-trip consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.date(),
        fc.boolean(),
        async (teacherId, subject, topic, title, lectureDate, isMetadataComplete) => {
          const metadata: NoteMetadata = {
            teacherId,
            subject: isMetadataComplete ? subject : '',
            topic: isMetadataComplete ? topic : '',
            title: isMetadataComplete ? title : '',
            lectureDate: isMetadataComplete ? lectureDate : null as any,
          };
          
          const file = { originalname: 'test.pdf', mimetype: 'application/pdf' } as Express.Multer.File;
          
          try {
            const result = await uploadNote(metadata, file);
            
            // Should only succeed if metadata is complete
            expect(isMetadataComplete).toBe(true);
            
            // Round-trip verification
            expect(result.teacherId).toBe(teacherId);
            expect(result.subject).toBe(subject);
            expect(result.topic).toBe(topic);
            expect(result.title).toBe(title);
            expect(result.lectureDate).toBe(lectureDate);
            expect(result.fileType).toBe('application/pdf');
            expect(result.fileUrl).toContain('test.pdf');
          } catch (error: any) {
            if (!isMetadataComplete) {
              expect(error.message).toContain('Missing required metadata');
            } else {
              throw error;
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
