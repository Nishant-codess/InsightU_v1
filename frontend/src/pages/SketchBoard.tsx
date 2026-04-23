import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { io, Socket } from 'socket.io-client';

interface Stroke { tool: 'pen' | 'eraser'; color: string; size: number; points: { x: number; y: number }[] }

const COLORS = ['#66FCF1', '#ffffff', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b'];

export default function SketchBoard() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { token, user } = useAuthStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const [boardInfo, setBoardInfo] = useState<{ title: string; classroom: { name: string } } | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#66FCF1');
  const [size, setSize] = useState(3);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const isDrawing = useRef(false);

  // Load board info
  useEffect(() => {
    if (!shareToken || !token) return;
    axios.get(`/api/classroom/board/${shareToken}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setBoardInfo(res.data.board);
        setStrokes(res.data.board.data || []);
        setIsTeacher(user?.role === 'TEACHER');
      }).catch(console.error);
  }, [shareToken, token]);

  // Socket.io for realtime
  useEffect(() => {
    if (!shareToken) return;
    const socket = io('/', { auth: { token } });
    socketRef.current = socket;

    socket.emit('board:join', shareToken);
    socket.on('board:stroke', (stroke: Stroke) => {
      setStrokes(prev => [...prev, stroke]);
    });
    socket.on('board:clear', () => setStrokes([]));

    return () => { socket.disconnect(); };
  }, [shareToken, token]);

  // Redraw canvas whenever strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0a0f1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
    for (const stroke of allStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#0a0f1a' : stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [strokes, currentStroke]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isTeacher) return;
    isDrawing.current = true;
    const pos = getPos(e);
    setCurrentStroke({ tool, color, size, points: [pos] });
  }, [isTeacher, tool, color, size]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !currentStroke) return;
    const pos = getPos(e);
    setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, pos] } : null);
  }, [currentStroke]);

  const endDraw = useCallback(() => {
    if (!isDrawing.current || !currentStroke) return;
    isDrawing.current = false;
    if (currentStroke.points.length > 1) {
      setStrokes(prev => [...prev, currentStroke]);
      socketRef.current?.emit('board:stroke', { shareToken, stroke: currentStroke });
      // Save to DB every 10 strokes
      setStrokes(prev => {
        if (prev.length % 10 === 0) {
          axios.patch(`/api/classroom/board/${shareToken}`, { data: prev }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        }
        return prev;
      });
    }
    setCurrentStroke(null);
  }, [currentStroke, shareToken, token]);

  const clearBoard = () => {
    setStrokes([]);
    socketRef.current?.emit('board:clear', shareToken);
    axios.patch(`/api/classroom/board/${shareToken}`, { data: [] }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  };

  return (
    <div className="fixed inset-0 bg-[#0a0f1a] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-surface/80 border-b border-white/5 backdrop-blur-md shrink-0">
        <div>
          <p className="text-xs font-black text-white uppercase tracking-tight">{boardInfo?.title}</p>
          <p className="text-[9px] text-textLight/50 uppercase tracking-widest">{boardInfo?.classroom.name}</p>
        </div>

        {isTeacher && (
          <>
            <div className="w-px h-8 bg-white/10" />
            {/* Tool */}
            <div className="flex gap-1">
              {(['pen', 'eraser'] as const).map(t => (
                <button key={t} onClick={() => setTool(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${tool === t ? 'bg-brand text-background' : 'text-textLight hover:text-white'}`}>
                  {t === 'pen' ? '✏️' : '⬜'} {t}
                </button>
              ))}
            </div>

            <div className="w-px h-8 bg-white/10" />
            {/* Colors */}
            <div className="flex gap-1.5">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-white scale-125' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>

            <div className="w-px h-8 bg-white/10" />
            {/* Size */}
            <input type="range" min={1} max={20} value={size} onChange={e => setSize(+e.target.value)}
              className="w-24 accent-brand" />
            <span className="text-xs text-textLight w-4">{size}</span>

            <div className="w-px h-8 bg-white/10" />
            <button onClick={clearBoard} className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-black text-red-400 hover:bg-red-500/20 transition-all">
              Clear
            </button>
          </>
        )}

        {!isTeacher && (
          <span className="text-xs text-textLight/50 uppercase tracking-widest ml-2">View only — teacher is drawing</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-[10px] text-green-400 font-black uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={1920} height={1080}
        className="flex-1 w-full h-full"
        style={{ cursor: isTeacher ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default', touchAction: 'none' }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
      />
    </div>
  );
}
