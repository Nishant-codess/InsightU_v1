import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';
import {
  ArrowLeftIcon,
  UserGroupIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
} from '@heroicons/react/24/outline';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

interface Member {
  id: string;
  status: string;
  student: {
    id: string;
    name: string;
    registrationNumber: string;
  };
}

interface Whiteboard {
  id: string;
  title: string;
  description?: string;
  inviteCode: string;
  content: any;
  members: Member[];
}

const COLORS = [
  '#ffffff', // White
  '#ef4444', // Red
  '#f59e0b', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#000000', // Black
];

const STROKE_WIDTHS = [2, 4, 8, 12, 16];

export default function WhiteboardEditor() {
  const { whiteboardId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  
  const [whiteboard, setWhiteboard] = useState<Whiteboard | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Drawing tools state
  const [strokeColor, setStrokeColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [eraserMode, setEraserMode] = useState(false);

  useEffect(() => {
    fetchWhiteboard();
  }, [whiteboardId]);

  // Auto-save every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleAutoSave();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchWhiteboard = async () => {
    try {
      const res = await fetch(`${API}/api/classroom/whiteboard/${whiteboardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setWhiteboard(data.whiteboard);
      setIsTeacher(data.isTeacher);
      
      // Load existing drawing
      if (data.whiteboard.content?.paths && canvasRef.current) {
        await canvasRef.current.loadPaths(data.whiteboard.content.paths);
      }
    } catch (error) {
      console.error('Failed to fetch whiteboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSave = async () => {
    if (!canvasRef.current) return;

    try {
      setIsSaving(true);
      const paths = await canvasRef.current.exportPaths();
      
      await fetch(`${API}/api/classroom/whiteboard/${whiteboardId}/content`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          content: { paths } 
        }),
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const handleUndo = () => {
    canvasRef.current?.undo();
  };

  const handleRedo = () => {
    canvasRef.current?.redo();
  };

  const handleClear = () => {
    if (confirm('Clear entire whiteboard? This cannot be undone.')) {
      canvasRef.current?.clearCanvas();
    }
  };

  const handleApprove = async (studentId: string) => {
    try {
      await fetch(`${API}/api/classroom/whiteboard/${whiteboardId}/members/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      fetchWhiteboard();
    } catch (error) {
      console.error('Failed to approve member:', error);
    }
  };

  const handleReject = async (studentId: string) => {
    try {
      await fetch(`${API}/api/classroom/whiteboard/${whiteboardId}/members/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'REJECTED' }),
      });
      fetchWhiteboard();
    } catch (error) {
      console.error('Failed to reject member:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="text-white text-xl">Loading whiteboard...</div>
      </div>
    );
  }

  if (!whiteboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="text-white text-xl">Whiteboard not found</div>
      </div>
    );
  }

  const pendingMembers = whiteboard.members.filter((m) => m.status === 'PENDING');
  const approvedMembers = whiteboard.members.filter((m) => m.status === 'APPROVED');

  return (
    <div className="h-screen flex flex-col bg-[#121212]">
      {/* Compact Header */}
      <div className="bg-[#1e1e1e] border-b border-white/10 px-4 py-2 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/whiteboard')}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition text-sm"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="border-l border-white/10 pl-3">
              <h1 className="text-sm font-semibold text-white">{whiteboard.title}</h1>
              {whiteboard.description && (
                <p className="text-xs text-gray-400">{whiteboard.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isSaving && (
              <span className="text-xs text-gray-400">Saving...</span>
            )}
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded text-sm transition"
            >
              <UserGroupIcon className="w-4 h-4" />
              <span>{approvedMembers.length}</span>
            </button>
            {isTeacher && (
              <div className="bg-brand/10 px-3 py-1.5 rounded border border-brand/30">
                <p className="text-[10px] text-brand/70 uppercase tracking-wide">Code</p>
                <p className="text-xs font-mono text-brand font-semibold">{whiteboard.inviteCode}</p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Requests */}
        {isTeacher && pendingMembers.length > 0 && (
          <div className="mt-2 bg-yellow-500/5 rounded border border-yellow-500/20 p-2">
            <h3 className="text-xs font-semibold text-yellow-400 mb-2">
              {pendingMembers.length} Pending Request{pendingMembers.length > 1 ? 's' : ''}
            </h3>
            <div className="space-y-1.5">
              {pendingMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between bg-white/5 rounded p-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-medium truncate">{member.student.name}</p>
                    <p className="text-gray-400 text-[10px]">{member.student.registrationNumber}</p>
                  </div>
                  <div className="flex gap-1.5 ml-2">
                    <button
                      onClick={() => handleApprove(member.student.id)}
                      className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition"
                    >
                      <CheckIcon className="w-3 h-3" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleReject(member.student.id)}
                      className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition"
                    >
                      <XMarkIcon className="w-3 h-3" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drawing Tools */}
      <div className="bg-[#1e1e1e] border-b border-white/10 px-4 py-2 flex items-center gap-4">
        {/* Pen/Eraser Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEraserMode(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition ${
              !eraserMode ? 'bg-brand text-white' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <PencilIcon className="w-4 h-4" />
            <span>Pen</span>
          </button>
          <button
            onClick={() => setEraserMode(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition ${
              eraserMode ? 'bg-brand text-white' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <TrashIcon className="w-4 h-4" />
            <span>Eraser</span>
          </button>
        </div>

        {/* Colors */}
        {!eraserMode && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Color:</span>
            <div className="flex gap-1.5">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setStrokeColor(color)}
                  className={`w-6 h-6 rounded border-2 transition ${
                    strokeColor === color ? 'border-brand scale-110' : 'border-white/20'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Stroke Width */}
        {!eraserMode && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Size:</span>
            <div className="flex gap-1.5">
              {STROKE_WIDTHS.map((width) => (
                <button
                  key={width}
                  onClick={() => setStrokeWidth(width)}
                  className={`w-8 h-8 rounded flex items-center justify-center transition ${
                    strokeWidth === width ? 'bg-brand' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div
                    className="rounded-full bg-white"
                    style={{ width: `${width}px`, height: `${width}px` }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded text-sm transition"
          >
            <ArrowUturnLeftIcon className="w-4 h-4" />
            <span>Undo</span>
          </button>
          <button
            onClick={handleRedo}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded text-sm transition"
          >
            <ArrowUturnRightIcon className="w-4 h-4" />
            <span>Redo</span>
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-1.5 rounded text-sm transition"
          >
            <TrashIcon className="w-4 h-4" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <ReactSketchCanvas
          ref={canvasRef}
          strokeWidth={eraserMode ? 20 : strokeWidth}
          strokeColor={eraserMode ? '#121212' : strokeColor}
          canvasColor="#121212"
          style={{
            width: '100%',
            height: '100%',
          }}
          eraserWidth={20}
        />
      </div>

      {/* Members Sidebar */}
      {showMembers && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setShowMembers(false)}
          />
          <div className="fixed right-0 top-0 h-full w-72 bg-[#1e1e1e] shadow-2xl border-l border-white/10 overflow-y-auto z-50">
            <div className="sticky top-0 bg-[#1e1e1e] border-b border-white/10 px-4 py-3 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">Members ({approvedMembers.length})</h3>
              <button 
                onClick={() => setShowMembers(false)} 
                className="text-gray-400 hover:text-white transition"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {approvedMembers.map((member) => (
                <div key={member.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-white text-sm font-medium">{member.student.name}</p>
                  <p className="text-gray-400 text-xs">{member.student.registrationNumber}</p>
                </div>
              ))}
              {approvedMembers.length === 0 && (
                <p className="text-gray-400 text-center py-8 text-sm">No members yet</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
