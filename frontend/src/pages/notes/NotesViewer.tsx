import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  BookmarkIcon as BookmarkSolid,
  ChatBubbleBottomCenterTextIcon,
  BellIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';
import {
  BookmarkIcon as BookmarkOutline,
  PencilSquareIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/useAuthStore';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface Note {
  id: string;
  title: string;
  subject: string;
  topic: string;
  fileUrl: string;
  fileType: string;
  lectureDate: string;
  teacher?: { name: string; department: string };
  bookmarks?: { id: string }[];
}

interface Annotation {
  id: string;
  content: string;
  page?: number;
  positionX?: number;
  positionY?: number;
  createdAt: string;
}

interface NewNoteNotification {
  noteId: string;
  title: string;
  subject: string;
}

export default function NotesViewer() {
  const { user, token } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const noteId = searchParams.get('noteId');

  // Notes list state
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  // Single note state
  const [note, setNote] = useState<Note | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // PDF state
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageRef = useRef<HTMLDivElement>(null);

  // Annotation state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [popover, setPopover] = useState<{ x: number; y: number; page: number; pctX: number; pctY: number } | null>(null);
  const [annotationText, setAnnotationText] = useState('');
  const [savingAnnotation, setSavingAnnotation] = useState(false);

  // Real-time notification
  const [newNoteNotification, setNewNoteNotification] = useState<NewNoteNotification | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const authHeaders = { Authorization: `Bearer ${token}` };

  // ─── Socket.io: join section room, listen for NEW_NOTE ───────────────────
  useEffect(() => {
    if (!user?.student) return;

    const { year, section, department } = user.student;
    const sectionKey = `${year}-${section}-${department}`;

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', `section:${sectionKey}`);
    });

    socket.on('NEW_NOTE', (data: NewNoteNotification) => {
      setNewNoteNotification(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // ─── Fetch notes list ─────────────────────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    setNotesLoading(true);
    try {
      const res = await axios.get('/api/student/notes', { headers: authHeaders });
      setNotes(res.data.notes || []);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setNotesLoading(false);
    }
  }, [token]);

  // ─── Fetch single note ────────────────────────────────────────────────────
  const fetchNote = useCallback(async (id: string) => {
    setNoteLoading(true);
    try {
      const res = await axios.get(`/api/student/notes/${id}`, { headers: authHeaders });
      const n: Note = res.data.note;
      setNote(n);
      setIsBookmarked((n.bookmarks?.length ?? 0) > 0);
    } catch (err) {
      console.error('Failed to fetch note:', err);
    } finally {
      setNoteLoading(false);
    }
  }, [token]);

  // ─── Fetch annotations ────────────────────────────────────────────────────
  const fetchAnnotations = useCallback(async (id: string) => {
    try {
      const res = await axios.get(`/api/student/notes/${id}/annotations`, { headers: authHeaders });
      setAnnotations(res.data.annotations || []);
    } catch (err) {
      console.error('Failed to fetch annotations:', err);
    }
  }, [token]);

  useEffect(() => {
    if (noteId) {
      fetchNote(noteId);
      fetchAnnotations(noteId);
    } else {
      fetchNotes();
    }
  }, [noteId]);

  // ─── Bookmark toggle ──────────────────────────────────────────────────────
  const toggleBookmark = async () => {
    if (!note) return;
    try {
      if (isBookmarked) {
        await axios.delete(`/api/student/notes/${note.id}/bookmark`, { headers: authHeaders });
        setIsBookmarked(false);
      } else {
        await axios.post(`/api/student/notes/${note.id}/bookmark`, {}, { headers: authHeaders });
        setIsBookmarked(true);
      }
    } catch (err) {
      console.error('Bookmark toggle failed:', err);
    }
  };

  // ─── Click-to-annotate ────────────────────────────────────────────────────
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pageRef.current) return;
    const rect = pageRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const pctX = (offsetX / rect.width) * 100;
    const pctY = (offsetY / rect.height) * 100;
    setPopover({ x: offsetX, y: offsetY, page: currentPage, pctX, pctY });
    setAnnotationText('');
  };

  const submitAnnotation = async () => {
    if (!note || !popover || !annotationText.trim()) return;
    setSavingAnnotation(true);
    try {
      await axios.post(
        `/api/student/notes/${note.id}/annotations`,
        {
          content: annotationText.trim(),
          page: popover.page,
          positionX: popover.pctX,
          positionY: popover.pctY,
        },
        { headers: authHeaders }
      );
      await fetchAnnotations(note.id);
      setPopover(null);
      setAnnotationText('');
    } catch (err) {
      console.error('Failed to save annotation:', err);
    } finally {
      setSavingAnnotation(false);
    }
  };

  // ─── Notes list view ──────────────────────────────────────────────────────
  if (!noteId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">My Notes</h1>
        {notesLoading ? (
          <p className="text-textLight">Loading notes...</p>
        ) : notes.length === 0 ? (
          <p className="text-textLight italic">No notes available yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5 cursor-pointer hover:border-brand/30 transition-colors"
                onClick={() => setSearchParams({ noteId: n.id })}
              >
                <p className="text-white font-semibold truncate">{n.title}</p>
                <p className="text-sm text-textLight mt-1">{n.subject} · {n.topic}</p>
                <p className="text-xs text-textLight mt-2">
                  {new Date(n.lectureDate).toLocaleDateString()}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Single note viewer ───────────────────────────────────────────────────
  if (noteLoading) return <div className="text-white">Loading note...</div>;
  if (!note) return <div className="text-textLight">Note not found.</div>;

  const isPdf = note.fileType === 'application/pdf';
  const fileUrl = note.fileUrl.startsWith('http') ? note.fileUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${note.fileUrl}`;

  return (
    <div className="flex flex-col h-full space-y-4">

      {/* NEW_NOTE notification banner */}
      <AnimatePresence>
        {newNoteNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center justify-between bg-brand/20 border border-brand/40 rounded-xl px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <BellIcon className="w-5 h-5 text-brand" />
              <span className="text-white text-sm">
                New note uploaded: <strong>{newNoteNotification.title}</strong> ({newNoteNotification.subject})
              </span>
            </div>
            <button onClick={() => setNewNoteNotification(null)}>
              <XMarkIcon className="w-4 h-4 text-textLight hover:text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between bg-surface/40 p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-brand/10 rounded-lg">
            <DocumentTextIcon className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h1 className="text-white font-bold">{note.title}</h1>
            <p className="text-xs text-textLight">
              {note.subject} · {note.topic} · {note.teacher?.name} · {new Date(note.lectureDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={toggleBookmark}>
            {isBookmarked
              ? <BookmarkSolid className="w-4 h-4 text-brand" />
              : <BookmarkOutline className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={() => setSearchParams({})}>
            ← Back
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">

        {/* Document viewer */}
        <div className="lg:col-span-3 bg-surface/20 rounded-2xl border border-white/5 overflow-auto flex flex-col items-center p-4 relative">
          {isPdf ? (
            <>
              <Document
                file={fileUrl}
                onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                className="w-full"
              >
                <div
                  ref={pageRef}
                  className="relative cursor-crosshair"
                  onClick={handlePageClick}
                >
                  <Page pageNumber={currentPage} width={Math.min(800, window.innerWidth - 80)} />

                  {/* Render annotation pins for current page */}
                  {annotations
                    .filter((a) => a.page === currentPage && a.positionX != null && a.positionY != null)
                    .map((a) => (
                      <div
                        key={a.id}
                        title={a.content}
                        className="absolute w-4 h-4 bg-brand rounded-full border-2 border-white shadow-lg cursor-pointer"
                        style={{
                          left: `${a.positionX}%`,
                          top: `${a.positionY}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      />
                    ))}

                  {/* Annotation popover */}
                  {popover && (
                    <div
                      className="absolute z-20 bg-surface border border-brand/40 rounded-xl p-3 shadow-2xl w-56"
                      style={{ left: popover.x, top: popover.y }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <textarea
                        autoFocus
                        className="w-full bg-transparent text-white text-xs resize-none outline-none border border-white/10 rounded p-2 mb-2"
                        rows={3}
                        placeholder="Add annotation..."
                        value={annotationText}
                        onChange={(e) => setAnnotationText(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 text-xs" onClick={submitAnnotation} disabled={savingAnnotation}>
                          {savingAnnotation ? 'Saving...' : 'Save'}
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setPopover(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Document>

              {/* Page controls */}
              {numPages > 1 && (
                <div className="flex items-center gap-4 mt-4">
                  <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
                    ← Prev
                  </Button>
                  <span className="text-textLight text-sm">{currentPage} / {numPages}</span>
                  <Button variant="outline" size="sm" disabled={currentPage >= numPages} onClick={() => setCurrentPage((p) => p + 1)}>
                    Next →
                  </Button>
                </div>
              )}
            </>
          ) : (
            <img src={fileUrl} alt={note.title} className="max-w-full rounded-xl" />
          )}
        </div>

        {/* Annotations sidebar */}
        <div className="glass-card p-5 flex flex-col min-h-0">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
            <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-brand" />
            Annotations ({annotations.length})
          </h2>
          <div className="flex-1 overflow-auto space-y-3 pr-1 custom-scrollbar">
            {annotations.length === 0 ? (
              <p className="text-textLight text-xs italic">Click on the PDF to add annotations.</p>
            ) : (
              annotations.map((a) => (
                <div key={a.id} className="p-3 bg-surface/60 rounded-xl border border-white/5 space-y-1">
                  {a.page != null && (
                    <span className="text-[10px] text-brand font-bold">Page {a.page}</span>
                  )}
                  <p className="text-xs text-white leading-relaxed">{a.content}</p>
                  <p className="text-[10px] text-textLight">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
          <div className="pt-4 border-t border-white/5">
            <Button variant="outline" className="w-full gap-2 text-xs" onClick={() => setPopover(null)}>
              <PencilSquareIcon className="w-4 h-4" />
              Click PDF to annotate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
