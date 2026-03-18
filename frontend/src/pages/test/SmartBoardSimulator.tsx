import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DevicePhoneMobileIcon, 
  CloudArrowUpIcon, 
  CheckCircleIcon, 
  ComputerDesktopIcon,
  WifiIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';

export default function SmartBoardSimulator() {
  const [noteText, setNoteText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);

  const startSync = () => {
    if (!noteText.trim()) return;
    setIsSyncing(true);
    setProgress(0);
  };

  useEffect(() => {
    if (isSyncing) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsSyncing(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            return 100;
          }
          return prev + 5;
        });
      }, 100);
      return () => clearInterval(interval);
    }
    return () => {};
  }, [isSyncing]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      <div className="text-center space-y-2">
         <h1 className="text-3xl font-bold text-white tracking-tight">Smart Board Simulator</h1>
         <p className="text-textLight">Test the automatic Note Sync logic (Teacher Perspective)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Simulated Mobile Device */}
          <div className="flex flex-col items-center">
              <div className="w-[300px] h-[600px] bg-black rounded-[3rem] border-8 border-surface p-6 relative shadow-2xl overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-surface rounded-b-2xl z-10" />
                  
                  <div className="h-full flex flex-col pt-8">
                      <div className="flex justify-between items-center mb-6">
                          <p className="text-[10px] font-bold text-brand uppercase tracking-widest">Faculty Connect</p>
                          <WifiIcon className="w-3 h-3 text-brand animate-pulse" />
                      </div>

                      <div className="flex-1 space-y-4">
                          <p className="text-xs text-textLight">Session: <b>Physics 101</b></p>
                          <div className="glass-card p-4 h-64 bg-white/5 border-white/10 flex flex-col">
                              <label className="text-[8px] font-bold text-textLight mb-2 uppercase tracking-wider">Live Board Input</label>
                              <textarea 
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Type lecture notes or draw..."
                                className="flex-1 bg-transparent text-sm text-white resize-none outline-none placeholder-white/20"
                              />
                          </div>
                          
                          <Button 
                            className="w-full h-12 gap-2" 
                            onClick={startSync}
                            disabled={isSyncing || !noteText.trim()}
                          >
                             {isSyncing ? 'Syncing...' : 'Broadcast to Class'}
                             <CloudArrowUpIcon className="w-5 h-5" />
                          </Button>
                      </div>

                      {isSyncing && (
                          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-10 text-center">
                              <div className="w-16 h-16 border-4 border-brand/20 border-t-brand rounded-full animate-spin mb-4" />
                              <p className="text-white font-bold">Generating PDF & Syncing...</p>
                              <p className="text-[10px] text-textLight mt-2">{progress}% completed</p>
                          </div>
                      )}

                      <AnimatePresence>
                          {success && (
                              <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="absolute bottom-10 left-6 right-6 bg-brand p-4 rounded-xl flex items-center gap-3 shadow-xl shadow-brand/20"
                              >
                                  <CheckCircleIcon className="w-6 h-6 text-background" />
                                  <p className="text-xs font-bold text-background leading-tight">Live Broadcast Successful! Notes updated on Student Dashboards.</p>
                              </motion.div>
                          )}
                      </AnimatePresence>
                  </div>
              </div>
              <p className="mt-4 text-xs text-textLight flex items-center gap-2">
                  <DevicePhoneMobileIcon className="w-4 h-4" />
                  Your Phone / Tablet
              </p>
          </div>

          {/* Explanation & Dashboard View */}
          <div className="space-y-6 flex flex-col justify-center">
              <div className="glass-card p-6 border-brand/30 bg-brand/5">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <PencilIcon className="w-5 h-5 text-brand" />
                      How it works
                  </h2>
                  <ol className="space-y-4 text-sm text-textLight">
                      <li className="flex gap-3">
                          <span className="w-6 h-6 rounded-full bg-brand/20 text-brand flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                          Teacher inputs notes on their personal device (simulated on the left).
                      </li>
                      <li className="flex gap-3">
                          <span className="w-6 h-6 rounded-full bg-brand/20 text-brand flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                          Upon clicking broadcast, our system converts the input into a structured <b>Section PDF</b>.
                      </li>
                      <li className="flex gap-3">
                          <span className="w-6 h-6 rounded-full bg-brand/20 text-brand flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                          The PDF is automatically "pushed" to the <b>Notes Viewer</b> of every student in the cohort via Socket.io.
                      </li>
                  </ol>
              </div>

              <div className="glass-card p-6 bg-surface/40">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                      <ComputerDesktopIcon className="w-5 h-5 text-brand" />
                      Student Dashboard View
                  </h3>
                  <div className="border border-white/10 rounded-lg p-4 bg-background/50">
                      <p className="text-[10px] text-brand font-bold uppercase mb-2">Sync Status</p>
                      <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${isSyncing ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
                          <span className="text-xs text-white">{isSyncing ? 'Faculty is Broadcast LIVE...' : 'Waiting for live feed...'}</span>
                      </div>
                  </div>
              </div>
          </div>

      </div>
    </div>
  );
}
