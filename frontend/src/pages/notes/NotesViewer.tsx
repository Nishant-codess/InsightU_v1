import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookmarkIcon as BookmarkSolid, 
  ChatBubbleBottomCenterTextIcon,
  CloudArrowUpIcon,
  WifiIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  BookOpenIcon
} from '@heroicons/react/24/solid';
import { 
  BookmarkIcon as BookmarkOutline, 
  ArrowDownTrayIcon,
  PencilSquareIcon,
  SignalIcon
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';

// Req 6 & 19: Note Viewer with non-destructive suggestions & Smart Board Sync
export default function NotesViewer() {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([
    { id: 1, author: 'Dr. Sameer', text: 'Consider adding a diagram here for the wave-particle duality.', page: 2 },
    { id: 2, author: 'Dr. Sameer', text: 'Important: This derivation is frequently asked in finals.', page: 5 },
  ]);

  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* Ribbon Header */}
      <div className="flex items-center justify-between bg-surface/40 p-4 rounded-xl border border-white/5 backdrop-blur-md">
         <div className="flex items-center gap-4">
             <div className="p-2 bg-brand/10 rounded-lg">
                <BookOpenIcon className="w-6 h-6 text-brand" />
             </div>
             <div>
                <h1 className="text-white font-bold">Lecture 14: Quantum Foundations.pdf</h1>
                <p className="text-xs text-textLight">Physics • Dr. Sameer • Uploaded Mar 15</p>
             </div>
         </div>
         <div className="flex items-center gap-2">
             <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border transition-all ${isSyncing ? 'bg-brand/10 border-brand text-brand animate-pulse' : 'bg-white/5 border-white/10 text-textLight'}`}>
                 <SignalIcon className="w-3 h-3" />
                 {isSyncing ? 'SMART BOARD LIVE' : 'SYNC DISCONNECTED'}
             </div>
             <Button 
               variant="outline" 
               size="sm" 
               className="h-9"
               onClick={() => setIsBookmarked(!isBookmarked)}
             >
                {isBookmarked ? <BookmarkSolid className="w-4 h-4 text-brand" /> : <BookmarkOutline className="w-4 h-4" />}
             </Button>
             <Button variant="outline" size="sm" className="h-9 gap-2">
                <ArrowDownTrayIcon className="w-4 h-4" />
                Download
             </Button>
             <Button 
               size="sm" 
               className={`h-9 gap-2 ${isSyncing ? 'bg-red-500 hover:bg-red-600 border-none' : ''}`}
               onClick={() => setIsSyncing(!isSyncing)}
             >
                {isSyncing ? 'Stop Sync' : 'Sync Board'}
             </Button>
         </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
          
          {/* Document Viewer Area */}
          <div className="lg:col-span-3 bg-surface/20 rounded-2xl border border-white/5 overflow-hidden flex flex-col items-center justify-center relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <DocumentTextIcon className="w-24 h-24 text-white/10 mb-4" />
              <p className="text-textLight text-sm font-medium">Interactive PDF Viewer Rendering...</p>
              
              {/* Floating Sync Overlay */}
              {isSyncing && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute top-10 right-10 bg-brand/90 text-background px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-2xl shadow-brand/20"
                  >
                      <WifiIcon className="w-4 h-4 animate-bounce" />
                      LIVE BOARD FEED ACTIVE
                  </motion.div>
              )}
          </div>

          {/* Sidebar: Suggestions & Controls */}
          <div className="space-y-6 flex flex-col min-h-0">
              <div className="glass-card p-5 flex-1 flex flex-col min-h-0">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                      <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-brand" />
                      Suggestions ({suggestions.length})
                  </h2>
                  <div className="flex-1 overflow-auto space-y-4 pr-2 custom-scrollbar">
                      {suggestions.map(s => (
                          <div key={s.id} className="p-4 bg-surface/60 rounded-xl border border-white/5 space-y-2">
                              <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-brand uppercase">{s.author}</span>
                                  <span className="text-[10px] text-textLight">Page {s.page}</span>
                              </div>
                              <p className="text-xs text-white leading-relaxed">{s.text}</p>
                          </div>
                      ))}
                  </div>
                  <div className="pt-4 border-t border-white/5">
                      <Button variant="outline" className="w-full gap-2 text-xs">
                          <PencilSquareIcon className="w-4 h-4" />
                          Add Suggestion
                      </Button>
                  </div>
              </div>

              <div className="glass-card p-5 bg-gradient-to-br from-brand/10 to-transparent">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <VideoCameraIcon className="w-4 h-4 text-brand" />
                      Live Session
                  </h3>
                  <p className="text-xs text-textLight leading-relaxed mb-4">
                      Connect to the smart board in Hall 102 to see live annotations from the lecturer.
                  </p>
                  <Button className="w-full text-xs" onClick={() => setIsSyncing(!isSyncing)}>
                      {isSyncing ? 'Disconnect' : 'Join Board Session'}
                  </Button>
              </div>
          </div>
      </div>
    </div>
  );
}
