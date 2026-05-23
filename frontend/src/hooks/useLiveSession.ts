import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';
import { useState } from 'react';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

export enum MessageType {
  JOIN_SESSION = 'join_session',
  INIT_STATE = 'init_state',
  SWITCH_MODE = 'switch_mode',
  DRAW = 'draw',
  DRAW_END = 'draw_end',
  CLEAR_BOARD = 'clear_board',
  CANVAS_STATE = 'canvas_state',
  UNDO = 'undo',
  VIDEO_LOAD = 'video_load',
  VIDEO_PLAY = 'video_play',
  VIDEO_PAUSE = 'video_pause',
  PDF_LOAD = 'pdf_load',
  PDF_PAGE_CHANGE = 'pdf_page_change',
  PERMISSION_REQUEST = 'permission_request',
  PERMISSION_RESPONSE = 'permission_response',
}

export interface SocketMessage {
  type: MessageType;
  payload?: any;
}

export const useLiveSession = (sessionId: string | null) => {
  const { user, token } = useAuthStore();
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [hasEditAccess, setHasEditAccess] = useState(user?.role === 'TEACHER');
  const [waitingForPermission, setWaitingForPermission] = useState(false);
  const [messages, setMessages] = useState<SocketMessage[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [studentList, setStudentList] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const isTeacher = user?.role === 'TEACHER';

  useEffect(() => {
    if (!sessionId || !token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
      const { portalData } = useAuthStore.getState();
      const name = portalData?.profile?.name || user?.name || (user as any)?.student?.name || 'User';
      const registrationNumber = portalData?.profile?.registrationNumber || user?.registrationNumber || (user as any)?.student?.registrationNumber || '';
      socket.emit(MessageType.JOIN_SESSION, {
        sessionId,
        user: { id: user?.id, name, registrationNumber, role: user?.role }
      });
    });

    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('student_count', (count: number) => setStudentCount(count));
    socket.on('student_list', (list: any[]) => setStudentList(list));

    socket.on('init_state', (state: any) => setMessages(prev => [...prev, { type: MessageType.INIT_STATE, payload: state }]));
    socket.on('switch_mode', (mode: any) => setMessages(prev => [...prev, { type: MessageType.SWITCH_MODE, payload: mode }]));
    socket.on('draw', (data: any) => setMessages(prev => [...prev, { type: MessageType.DRAW, payload: data }]));
    socket.on('draw_end', (data: any) => setMessages(prev => [...prev, { type: MessageType.DRAW_END, payload: data }]));
    socket.on('clear_board', () => setMessages(prev => [...prev, { type: MessageType.CLEAR_BOARD }]));
    socket.on('undo', () => setMessages(prev => [...prev, { type: MessageType.UNDO }]));
    socket.on('canvas_state', (data: any) => setMessages(prev => [...prev, { type: MessageType.CANVAS_STATE, payload: data }]));
    socket.on('video_load', (url: any) => setMessages(prev => [...prev, { type: MessageType.VIDEO_LOAD, payload: url }]));
    socket.on('video_play', (time: any) => setMessages(prev => [...prev, { type: MessageType.VIDEO_PLAY, payload: time }]));
    socket.on('video_pause', (time: any) => setMessages(prev => [...prev, { type: MessageType.VIDEO_PAUSE, payload: time }]));
    socket.on('pdf_load', (url: any) => setMessages(prev => [...prev, { type: MessageType.PDF_LOAD, payload: url }]));
    socket.on('pdf_page_change', (page: any) => setMessages(prev => [...prev, { type: MessageType.PDF_PAGE_CHANGE, payload: page }]));

    socket.on(MessageType.PERMISSION_RESPONSE, (data: any) => {
      if (data.studentId === user?.id) {
        setHasEditAccess(data.granted);
        setWaitingForPermission(false);
      }
    });

    socket.on(MessageType.PERMISSION_REQUEST, (data: any) => {
      setMessages(prev => [...prev, { type: MessageType.PERMISSION_REQUEST, payload: data }]);
    });

    return () => { socket.disconnect(); };
  }, [sessionId, token, user?.id]);

  const sendMessage = useCallback((type: string, payload: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(type, { ...payload, sessionId });
    }
  }, [sessionId]);

  const requestPermission = useCallback(() => {
    if (!isTeacher && socketRef.current?.connected) {
      setWaitingForPermission(true);
      const { portalData } = useAuthStore.getState();
      const studentName = portalData?.profile?.name || user?.name || (user as any)?.student?.name || 'Student';
      const studentReg = portalData?.profile?.registrationNumber || user?.registrationNumber || (user as any)?.student?.registrationNumber || 'Unknown';
      socketRef.current.emit(MessageType.PERMISSION_REQUEST, {
        sessionId,
        studentId: user?.id,
        studentName: `${studentName} (${studentReg})`,
      });
    }
  }, [sessionId, user?.id, user?.name, isTeacher]);

  return {
    status,
    messages,
    studentCount,
    studentList,
    sendMessage,
    hasEditAccess,
    requestPermission,
    waitingForPermission,
    socket: socketRef.current,
  };
};
