import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Circle, Arrow, Text, Transformer } from 'react-konva';
import { MessageType } from '../../hooks/useLiveSession';
import Konva from 'konva';

type Tool = 'pen' | 'eraser' | 'rect' | 'circle' | 'arrow' | 'text' | 'select';

interface DrawElement {
  id: string;
  type: 'line' | 'rect' | 'circle' | 'arrow' | 'text';
  tool?: Tool;
  points?: number[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  fill?: string;
}

interface WhiteboardProps {
  hasEditAccess: boolean;
  sendMessage: (type: MessageType | string, payload: any) => void;
  incomingMessages: any[];
  isTeacher?: boolean;
  studentCount?: number;
}

const COLORS = ['#ffffff', '#f87171', '#fb923c', '#facc15', '#4ade80', '#60a5fa', '#c084fc', '#f472b6', '#000000'];

export const Whiteboard: React.FC<WhiteboardProps> = ({
  hasEditAccess,
  sendMessage,
  incomingMessages,
  isTeacher = false,
  studentCount = 0,
}) => {
  const [elements, setElements] = useState<DrawElement[]>([]);
  const [history, setHistory] = useState<DrawElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(3);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedId, setSelectedId] = useState<string | null>(null);
  const isDrawing = useRef(false);
  const currentId = useRef<string>('');
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [stageSize, setStageSize] = useState({ width: window.innerWidth - 320, height: window.innerHeight - 64 });
  const processedIndexRef = useRef(-1);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      setStageSize({ width: window.innerWidth - 320, height: window.innerHeight - 64 });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Process incoming Socket.IO messages
  useEffect(() => {
    if (incomingMessages.length === 0) {
      processedIndexRef.current = -1;
      return;
    }

    for (let i = processedIndexRef.current + 1; i < incomingMessages.length; i++) {
      const msg = incomingMessages[i];
      if (!msg) continue;

      switch (msg.type) {
        case MessageType.DRAW: {
          const { data, isStart } = msg.payload;
          if (isStart) {
            setElements(prev => [...prev, data]);
          } else {
            setElements(prev =>
              prev.map(el => {
                if (el.id !== data.id) return el;
                // If the incoming data is a line diff (only x, y provided), append it
                if (el.type === 'line' && data.x !== undefined && data.points === undefined) {
                  return { ...el, points: [...(el.points || []), data.x, data.y] };
                }
                // Otherwise, completely overwrite the element (used for shapes)
                return { ...el, ...data };
              })
            );
          }
          break;
        }
        case MessageType.INIT_STATE: {
          const sessionState = msg.payload;
          if (sessionState?.boardData) {
            setElements(sessionState.boardData.map((h: any) => ({ ...h.data, type: h.type })));
          }
          break;
        }
        case MessageType.CANVAS_STATE: {
          const { elements: stateHistory } = msg.payload as any;
          if (Array.isArray(stateHistory)) {
            setElements(stateHistory);
          }
          break;
        }
        case MessageType.CLEAR_BOARD:
          setElements([]);
          break;
        case MessageType.UNDO:
          setElements(prev => prev.slice(0, -1));
          break;
        default:
          break;
      }
    }
    processedIndexRef.current = incomingMessages.length - 1;
  }, [incomingMessages]);

  // Sync canvas state for late joiners (only trigger when studentCount increases)
  const prevStudentCount = useRef(studentCount);
  useEffect(() => {
    if (isTeacher && studentCount > prevStudentCount.current && elements.length > 0) {
      sendMessage(MessageType.CANVAS_STATE, { elements });
    }
    prevStudentCount.current = studentCount;
  }, [studentCount, isTeacher, sendMessage]); // removed 'elements' dependency so it doesn't spam

  const pushHistory = useCallback(
    (newElements: DrawElement[]) => {
      setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        return [...newHistory, newElements];
      });
      setHistoryIndex(prev => prev + 1);
    },
    [historyIndex]
  );

  const undo = () => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setElements(history[newIndex]);
    sendMessage(MessageType.UNDO, {});
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setElements(history[newIndex]);
  };

  const getPos = (e: any) => e.target.getStage()?.getPointerPosition() || { x: 0, y: 0 };

  const handleMouseDown = (e: any) => {
    if (!hasEditAccess) return;
    if (tool === 'select') {
      const clickedEmpty = e.target === e.target.getStage();
      if (clickedEmpty) setSelectedId(null);
      return;
    }
    isDrawing.current = true;
    const pos = getPos(e);
    const id = `${Date.now()}-${Math.random()}`;
    currentId.current = id;

    let newEl: DrawElement;

    if (tool === 'pen' || tool === 'eraser') {
      newEl = { id, type: 'line', tool, points: [pos.x, pos.y], color: tool === 'eraser' ? '#0f0f1a' : color, strokeWidth };
    } else if (tool === 'rect') {
      newEl = { id, type: 'rect', x: pos.x, y: pos.y, width: 0, height: 0, color, strokeWidth, fill: 'transparent' };
    } else if (tool === 'circle') {
      newEl = { id, type: 'circle', x: pos.x, y: pos.y, radius: 0, color, strokeWidth, fill: 'transparent' };
    } else if (tool === 'arrow') {
      newEl = { id, type: 'arrow', points: [pos.x, pos.y, pos.x, pos.y], color, strokeWidth };
    } else if (tool === 'text') {
      const text = window.prompt('Enter text:');
      if (!text) return;
      newEl = { id, type: 'text', x: pos.x, y: pos.y, text, color, strokeWidth: 1 };
      const updated = [...elements, newEl];
      setElements(updated);
      pushHistory(updated);
      sendMessage(MessageType.DRAW, { type: 'text', isStart: true, data: newEl });
      isDrawing.current = false;
      return;
    } else return;

    setElements(prev => [...prev, newEl]);
    sendMessage(MessageType.DRAW, { isStart: true, data: newEl });
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || !hasEditAccess) return;
    const pos = getPos(e);
    const id = currentId.current;

    let diffData: any = null;

    // We must calculate the diff synchronously before setting state
    const currentEl = elements.find(el => el.id === id);
    if (!currentEl) return;

    if (currentEl.type === 'line') {
      diffData = { id, x: pos.x, y: pos.y };
    } else if (currentEl.type === 'rect') {
      diffData = { ...currentEl, width: pos.x - (currentEl.x || 0), height: pos.y - (currentEl.y || 0) };
    } else if (currentEl.type === 'circle') {
      const dx = pos.x - (currentEl.x || 0);
      const dy = pos.y - (currentEl.y || 0);
      diffData = { ...currentEl, radius: Math.sqrt(dx * dx + dy * dy) };
    } else if (currentEl.type === 'arrow') {
      const pts = currentEl.points || [];
      diffData = { ...currentEl, points: [pts[0], pts[1], pos.x, pos.y] };
    }

    setElements(prev =>
      prev.map(el => {
        if (el.id !== id) return el;
        if (el.type === 'line') {
          return { ...el, points: [...(el.points || []), pos.x, pos.y] };
        }
        return diffData;
      })
    );

    if (diffData) {
      sendMessage(MessageType.DRAW, { data: diffData });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing.current || !hasEditAccess) return;
    isDrawing.current = false;
    pushHistory([...elements]);
    sendMessage(MessageType.DRAW_END, {});
  };

  const clearCanvas = () => {
    if (!isTeacher) return;
    setElements([]);
    pushHistory([]);
    sendMessage(MessageType.CLEAR_BOARD, {});
  };

  const toolBtn = (t: Tool, label: string, icon: string) => (
    <button
      key={t}
      onClick={() => setTool(t)}
      title={label}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
        tool === t ? 'bg-white text-gray-900 shadow-lg scale-105' : 'text-gray-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-[10px]">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-[#0f0f1a] relative overflow-hidden">
      {/* Toolbar */}
      {hasEditAccess && (
        <div className="flex items-center gap-1 px-4 py-2 bg-[#1a1a2e] border-b border-white/10 z-10 flex-wrap">
          {/* Drawing Tools */}
          <div className="flex items-center gap-1 pr-3 border-r border-white/10">
            {toolBtn('select', 'Select', '↖')}
            {toolBtn('pen', 'Pen', '✏️')}
            {toolBtn('eraser', 'Eraser', '🧹')}
            {toolBtn('rect', 'Rect', '⬜')}
            {toolBtn('circle', 'Circle', '⭕')}
            {toolBtn('arrow', 'Arrow', '➡️')}
            {toolBtn('text', 'Text', 'T')}
          </div>

          {/* Color Palette */}
          <div className="flex items-center gap-1.5 px-3 border-r border-white/10">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  color === c ? 'border-white scale-125' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-7 h-7 rounded-full cursor-pointer border-2 border-white/20 bg-transparent"
              title="Custom color"
            />
          </div>

          {/* Stroke Width */}
          <div className="flex items-center gap-2 px-3 border-r border-white/10">
            <span className="text-xs text-gray-400">Size</span>
            {[2, 4, 8, 14].map(s => (
              <button
                key={s}
                onClick={() => setStrokeWidth(s)}
                className={`rounded-full bg-white transition-all ${
                  strokeWidth === s ? 'ring-2 ring-blue-400' : 'opacity-40 hover:opacity-80'
                }`}
                style={{ width: s + 6, height: s + 6 }}
              />
            ))}
          </div>

          {/* Undo / Redo / Clear */}
          <div className="flex items-center gap-1 pl-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-300 hover:bg-white/10 disabled:opacity-30 transition-all"
            >
              ↩ Undo
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-300 hover:bg-white/10 disabled:opacity-30 transition-all"
            >
              ↪ Redo
            </button>
            {isTeacher && (
              <button
                onClick={clearCanvas}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all"
              >
                🗑 Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          style={{ cursor: tool === 'eraser' ? 'cell' : tool === 'text' ? 'text' : 'crosshair' }}
        >
          <Layer>
            {elements.map(el => {
              if (el.type === 'line') {
                return (
                  <Line
                    key={el.id}
                    points={el.points || []}
                    stroke={el.color}
                    strokeWidth={el.strokeWidth}
                    tension={0.4}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation={el.tool === 'eraser' ? 'destination-out' : 'source-over'}
                  />
                );
              }
              if (el.type === 'rect') {
                return (
                  <Rect
                    key={el.id}
                    x={el.x}
                    y={el.y}
                    width={el.width}
                    height={el.height}
                    stroke={el.color}
                    strokeWidth={el.strokeWidth}
                    fill="transparent"
                    draggable={tool === 'select'}
                  />
                );
              }
              if (el.type === 'circle') {
                return (
                  <Circle
                    key={el.id}
                    x={el.x}
                    y={el.y}
                    radius={el.radius || 0}
                    stroke={el.color}
                    strokeWidth={el.strokeWidth}
                    fill="transparent"
                    draggable={tool === 'select'}
                  />
                );
              }
              if (el.type === 'arrow') {
                return (
                  <Arrow
                    key={el.id}
                    points={el.points || []}
                    stroke={el.color}
                    strokeWidth={el.strokeWidth}
                    fill={el.color}
                    draggable={tool === 'select'}
                  />
                );
              }
              if (el.type === 'text') {
                return (
                  <Text
                    key={el.id}
                    x={el.x}
                    y={el.y}
                    text={el.text || ''}
                    fill={el.color}
                    fontSize={18}
                    draggable={tool === 'select'}
                  />
                );
              }
              return null;
            })}
            <Transformer ref={transformerRef} />
          </Layer>
        </Stage>
      </div>

      {/* View-only badge */}
      {!hasEditAccess && (
        <div className="absolute top-4 right-4 bg-yellow-500/20 border border-yellow-400/40 text-yellow-300 text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm">
          👁 View Only
        </div>
      )}
    </div>
  );
};
