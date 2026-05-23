import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useLiveSession, MessageType } from '../../hooks/useLiveSession';
import { Whiteboard } from './Whiteboard';

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

type Tab = 'whiteboard' | 'pdf' | 'video';

interface PermissionRequest {
  studentId: string;
  studentName: string;
  socketId: string;
}

const LiveClass: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const isTeacher = user?.role === 'TEACHER';

  const { status, messages, studentCount, studentList, sendMessage, hasEditAccess, requestPermission, waitingForPermission } =
    useLiveSession(sessionId || null);

  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('whiteboard');
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([]);
  const [showMembers, setShowMembers] = useState(false);

  // PDF Viewer
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Video Player
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Fetch session info
  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId || !token) return;
      try {
        const res = await fetch(`${API}/sessions/${sessionId}/content`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSessionInfo({ id: sessionId, title: data.title || 'Live Session', status: data.status || 'active' });
        }
      } catch (err) {
        console.error('Failed to fetch session info:', err);
      }
    };
    fetchSession();
  }, [sessionId, token]);

  // Process incoming Socket.IO messages
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;

    switch (last.type) {
      case MessageType.SWITCH_MODE:
        setActiveTab(last.payload as Tab);
        break;
      case MessageType.PDF_LOAD:
        setPdfUrl(last.payload);
        setActiveTab('pdf');
        break;
      case MessageType.VIDEO_LOAD:
        setVideoUrl(last.payload);
        setActiveTab('video');
        break;
      case MessageType.VIDEO_PLAY:
        if (videoRef.current) {
          videoRef.current.currentTime = last.payload;
          videoRef.current.play();
        }
        break;
      case MessageType.VIDEO_PAUSE:
        if (videoRef.current) {
          videoRef.current.currentTime = last.payload;
          videoRef.current.pause();
        }
        break;
      case MessageType.PERMISSION_REQUEST:
        if (isTeacher && last.payload) {
          setPermissionRequests(prev => {
            const exists = prev.some(r => r.studentId === last.payload.studentId);
            if (exists) return prev;
            return [...prev, last.payload];
          });
        }
        break;
    }
  }, [messages, isTeacher]);

  const handleSwitchTab = (tab: Tab) => {
    setActiveTab(tab);
    if (isTeacher) sendMessage(MessageType.SWITCH_MODE, { mode: tab });
  };

  const handleGrantPermission = (req: PermissionRequest, granted: boolean) => {
    sendMessage(MessageType.PERMISSION_RESPONSE, {
      studentId: req.studentId,
      granted,
    });
    setPermissionRequests(prev => prev.filter(r => r.studentId !== req.studentId));
  };

  // State sync for late joiners
  useEffect(() => {
    if (isTeacher && studentCount > 1) {
      sendMessage(MessageType.SWITCH_MODE, { mode: activeTab });
      if (pdfUrl) sendMessage(MessageType.PDF_LOAD, { url: pdfUrl });
      if (videoUrl) sendMessage(MessageType.VIDEO_LOAD, { url: videoUrl });
    }
  }, [studentCount, isTeacher, activeTab, pdfUrl, videoUrl, sendMessage]);

  const uploadFile = async (f: File) => {
    const formData = new FormData();
    formData.append('file', f);
    const res = await fetch(`${API}/sessions/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.url;
  };

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await uploadFile(f);
      if (!url || url.startsWith('blob:')) {
        alert('Invalid URL generated: ' + url);
        return;
      }
      setPdfUrl(url);
      setActiveTab('pdf');
      if (isTeacher) sendMessage(MessageType.PDF_LOAD, { url });
    } catch (err: any) {
      alert(`Failed to upload PDF: ${err.message}`);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await uploadFile(f);
      setVideoUrl(url);
      setActiveTab('video');
      if (isTeacher) sendMessage(MessageType.VIDEO_LOAD, { url });
    } catch (err) {
      alert('Failed to upload Video');
    }
  };

  const statusColor = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500 animate-pulse',
    disconnected: 'bg-red-500',
  }[status];

  const handleStopSharing = () => {
    setPdfUrl(null);
    setVideoUrl(null);
    setActiveTab('whiteboard');
    if (isTeacher) sendMessage(MessageType.SWITCH_MODE, { mode: 'whiteboard' });
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a15] flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a2e] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-white"
          >
            ← Back
          </button>
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className="text-white font-bold text-sm">{sessionInfo?.title || 'Live Session'}</span>
          {isTeacher && (
            <span className="text-xs text-gray-400">Session ID: {sessionId}</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setShowMembers(!showMembers)}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 transition-colors rounded-lg border border-white/10 flex items-center gap-2 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-medium text-gray-300">{studentCount} online</span>
            </button>
            
            {showMembers && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-2 bg-white/5 border-b border-white/10 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Participants
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {studentList && studentList.length > 0 ? (
                    studentList.map((s, idx) => (
                      <div key={idx} className="px-4 py-3 border-b border-white/5 flex flex-col hover:bg-white/5">
                        <span className="text-sm font-medium text-white">{s.name} {s.role === 'TEACHER' ? '(Teacher)' : ''}</span>
                        {s.registrationNumber && <span className="text-xs text-gray-400">{s.registrationNumber}</span>}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-400">Loading members...</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tab Switcher (Teacher only) */}
          {isTeacher && (
            <div className="flex items-center gap-1 bg-black/30 rounded-xl p-1">
              {(['whiteboard', 'pdf', 'video'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => handleSwitchTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                    activeTab === tab ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab === 'whiteboard' ? '🎨 Board' : tab === 'pdf' ? '📄 PDF' : '🎬 Video'}
                </button>
              ))}
            </div>
          )}

          {/* Permission Request Button (Student only) */}
          {!isTeacher && !hasEditAccess && (
            <button
              onClick={requestPermission}
              disabled={waitingForPermission}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                waitingForPermission
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  : 'bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30'
              }`}
            >
              {waitingForPermission ? '⏳ Waiting...' : '✋ Request to Draw'}
            </button>
          )}

          {hasEditAccess && !isTeacher && (
            <span className="text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
              ✅ Draw Access Granted
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 overflow-hidden">
          {/* Whiteboard Tab */}
          {activeTab === 'whiteboard' && (
            <Whiteboard
              hasEditAccess={hasEditAccess}
              sendMessage={sendMessage as any}
              incomingMessages={messages}
              isTeacher={isTeacher}
              studentCount={studentCount}
            />
          )}

          {/* PDF Tab */}
          {activeTab === 'pdf' && (
            <div className="h-full flex flex-col items-center justify-center bg-[#1a1a2e] relative">
              {/* Debug overlay for PDF URL */}
              <div className="absolute top-2 right-2 bg-black/80 text-xs text-yellow-400 p-2 rounded z-50 max-w-sm truncate">
                PDF URL: {pdfUrl || 'null'}
              </div>

              {pdfUrl ? (
                pdfUrl.startsWith('blob:') ? (
                  <div className="text-center space-y-4">
                    <p className="text-red-400 font-bold">Stale Blob Link Detected</p>
                    <p className="text-gray-400 text-sm">Please refresh the Teacher's browser tab to clear the old session state.</p>
                  </div>
                ) : (
                  <div className="w-full h-full overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <iframe
                      src={pdfUrl}
                      className="w-full h-[150vh] md:h-full border-none"
                      title="PDF Viewer"
                    />
                  </div>
                )
              ) : isTeacher ? (
                <div className="text-center space-y-4">
                  <p className="text-gray-400">No PDF loaded. Upload a PDF to share with students.</p>
                  <button
                    onClick={() => pdfInputRef.current?.click()}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition"
                  >
                    📄 Load PDF
                  </button>
                  <input ref={pdfInputRef} type="file" accept="application/pdf" onChange={handlePDFUpload} className="hidden" />
                </div>
              ) : (
                <p className="text-gray-400">Teacher hasn't loaded a PDF yet.</p>
              )}
            </div>
          )}

          {/* Video Tab */}
          {activeTab === 'video' && (
            <div className="h-full flex flex-col items-center justify-center bg-black">
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls={true} // Allow students to manually play if iOS blocks autoplay
                  playsInline // Critical for iOS video playback
                  webkit-playsinline="true"
                  className="max-w-full max-h-full"
                  onPlay={e => isTeacher && sendMessage(MessageType.VIDEO_PLAY, { time: (e.target as HTMLVideoElement).currentTime })}
                  onPause={e => isTeacher && sendMessage(MessageType.VIDEO_PAUSE, { time: (e.target as HTMLVideoElement).currentTime })}
                />
              ) : isTeacher ? (
                <div className="text-center space-y-4">
                  <p className="text-gray-400">No video loaded. Upload a video to share.</p>
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition"
                  >
                    🎬 Load Video
                  </button>
                  <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                </div>
              ) : (
                <p className="text-gray-400">Teacher hasn't loaded a video yet.</p>
              )}
            </div>
          )}
        </div>

        {/* Teacher's Side Panel */}
        {isTeacher && (
          <div className="w-64 bg-[#1a1a2e] border-l border-white/10 flex flex-col shrink-0 overflow-y-auto">
            {/* Permission Requests */}
            <div className="p-4 border-b border-white/10">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-3">
                Draw Requests ({permissionRequests.length})
              </h3>
              {permissionRequests.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No pending requests</p>
              ) : (
                <div className="space-y-2">
                  {permissionRequests.map(req => (
                    <div key={req.studentId} className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <p className="text-sm text-white font-medium mb-2">{req.studentName}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleGrantPermission(req, true)}
                          className="flex-1 py-1 bg-green-500/20 text-green-300 text-xs font-bold rounded-lg hover:bg-green-500/30 transition"
                        >
                          ✅ Allow
                        </button>
                        <button
                          onClick={() => handleGrantPermission(req, false)}
                          className="flex-1 py-1 bg-red-500/20 text-red-300 text-xs font-bold rounded-lg hover:bg-red-500/30 transition"
                        >
                          ❌ Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* File Load Buttons */}
            <div className="p-4 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-3 flex items-center justify-between">
                <span>Share Content</span>
                {(pdfUrl || videoUrl) && (
                  <button onClick={handleStopSharing} className="text-[10px] text-red-400 hover:text-red-300">
                    Stop Sharing
                  </button>
                )}
              </h3>
              <button
                onClick={() => pdfInputRef.current?.click()}
                className="w-full py-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold rounded-lg hover:bg-blue-500/20 transition"
              >
                📄 Share PDF
              </button>
              <input ref={pdfInputRef} type="file" accept="application/pdf" onChange={handlePDFUpload} className="hidden" />
              <button
                onClick={() => videoInputRef.current?.click()}
                className="w-full py-2.5 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold rounded-lg hover:bg-violet-500/20 transition"
              >
                🎬 Share Video
              </button>
              <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
            </div>

            {/* Session Info */}
            <div className="p-4 mt-auto border-t border-white/10">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Session</p>
              <p className="text-xs text-gray-400 font-mono break-all">{sessionId}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveClass;
