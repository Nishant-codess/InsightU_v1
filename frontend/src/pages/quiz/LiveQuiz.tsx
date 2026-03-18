import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { TrophyIcon, ClockIcon, UserGroupIcon, FireIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';

// Mocked Question structure mappings for simulated flow
const MOCK_QUESTIONS = [
  { id: 'q1', text: 'Which data structure follows the LIFO principle?', options: ['Queue', 'Stack', 'Tree', 'Graph'], correctAnswer: 1 },
  { id: 'q2', text: 'What is the theoretical time complexity of binary search?', options: ['O(n)', 'O(1)', 'O(n log n)', 'O(log n)'], correctAnswer: 3 },
];

export default function LiveQuiz() {
  const { sessionCode } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<'WAITING' | 'ACTIVE' | 'FINISHED'>('WAITING');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  
  // Real-time synchronization state models
  const [leaderboard, setLeaderboard] = useState<{name: string, score: number}[]>([]);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    // In production this maps against our Node WS cluster via `process.env.VITE_WS_URL`
    const newSocket = io('http://localhost:3000/quiz', {
      auth: { token: 'mock-jwt-token' },
      transports: ['websocket'],
      autoConnect: false // We mock event lifecycles directly below manually to satisfy UX bounds lacking full backend startup
    });

    setSocket(newSocket);
    return () => { newSocket.close(); };
  }, []);

  // Simulating the WebSocket Lifecycle dynamically locally rendering Requirement 9.3 constraints visually
  useEffect(() => {
    if (gameState === 'WAITING') {
         setTimeout(() => setGameState('ACTIVE'), 4000); // Start after 4 seconds
    }
  }, [gameState]);

  useEffect(() => {
     let timer: NodeJS.Timeout;
     if (gameState === 'ACTIVE' && timeLeft > 0) {
         timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
     } else if (timeLeft === 0 && gameState === 'ACTIVE') {
         // Question timed out automatically advance
         setTimeout(() => {
             if (questionIndex < MOCK_QUESTIONS.length - 1) {
                 setQuestionIndex(prev => prev + 1);
                 setTimeLeft(30);
                 setSelectedOption(null);
                 setHasAnswered(false);
             } else {
                 setGameState('FINISHED');
             }
         }, 2000);
     }
     return () => clearInterval(timer);
  }, [gameState, timeLeft, questionIndex]);

  const handleAnswer = (index: number) => {
      if (hasAnswered) return;
      setSelectedOption(index);
      setHasAnswered(true);

      // Simulate sending to WS and updating ranking lists instantaneously
      const isCorrect = index === MOCK_QUESTIONS[questionIndex].correctAnswer;
      const scoreMod = isCorrect ? (timeLeft * 10) : 0; // Speed scaling 
      
      setLeaderboard([
          { name: user?.name || 'You', score: 100 + scoreMod },
          { name: 'Alex T.', score: 250 },
          { name: 'Sarah M.', score: 180 }
      ].sort((a,b) => b.score - a.score));
  };


  if (gameState === 'WAITING') {
      return (
          <div className="min-h-screen bg-background flex items-center justify-center p-4">
              <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="glass-panel p-12 text-center max-w-lg w-full"
              >
                  <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FireIcon className="w-10 h-10 text-brand animate-pulse" />
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-2">Quiz Room: {sessionCode}</h1>
                  <p className="text-textLight mb-8">Waiting for instructor to commence session...</p>
                  <div className="flex items-center justify-center gap-2 text-brand font-medium">
                      <UserGroupIcon className="w-5 h-5" />
                      <span>3 Students Connected</span>
                  </div>
              </motion.div>
          </div>
      );
  }

  if (gameState === 'FINISHED') {
      return (
          <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
               
               {/* Leaderboard Celebration Mapping */}
               <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-full max-w-2xl px-6 py-10 glass-card bg-surface/80"
               >
                   <div className="text-center mb-10">
                       <TrophyIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                       <h1 className="text-4xl font-extrabold text-white">Quiz Completed!</h1>
                       <p className="text-textLight mt-2 text-lg">Final Session Rankings</p>
                   </div>

                   <div className="space-y-4">
                       {leaderboard.map((player, i) => (
                           <motion.div 
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: i * 0.2 }}
                            key={i} 
                            className={cn(
                                "flex justify-between items-center p-5 rounded-xl border border-white/5",
                                i === 0 ? "bg-yellow-500/10 border-yellow-500/30" : "bg-surface/50",
                                player.name === (user?.name || 'You') && i !== 0 && "bg-brand/10 border-brand/20"
                            )}>
                               <div className="flex items-center gap-4">
                                   <span className={cn(
                                       "text-xl font-bold font-mono w-8 text-center",
                                       i === 0 ? "text-yellow-500" : "text-gray-500"
                                   )}>#{i + 1}</span>
                                   <span className={cn("text-lg font-medium", i===0 ? "text-white" : "text-gray-300")}>{player.name}</span>
                               </div>
                               <span className="font-mono text-xl text-brand">{player.score}</span>
                           </motion.div>
                       ))}
                   </div>
                   
                   <Button onClick={() => navigate('/dashboard')} className="w-full mt-10" size="lg">Return to Dashboard</Button>
               </motion.div>
          </div>
      )
  }

  const currentQ = MOCK_QUESTIONS[questionIndex];

  return (
      <div className="min-h-screen bg-background flex flex-col md:flex-row">
          
          {/* Main Question Viewport */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-12 relative">
             <div className="w-full max-w-3xl">
                 <div className="flex justify-between items-end mb-8">
                     <span className="text-brand font-bold uppercase tracking-widest text-sm">Question {questionIndex + 1} of {MOCK_QUESTIONS.length}</span>
                     <div className={cn(
                         "flex items-center gap-2 px-4 py-2 rounded-full font-mono text-lg font-bold border",
                         timeLeft <= 10 ? "text-red-400 bg-red-400/10 border-red-400/20 animate-pulse" : "text-brand bg-brand/10 border-brand/20"
                     )}>
                         <ClockIcon className="w-5 h-5" />
                         00:{timeLeft.toString().padStart(2, '0')}
                     </div>
                 </div>

                 <motion.h2 
                   key={`q-${questionIndex}`}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="text-3xl lg:text-4xl font-bold text-white mb-10 leading-snug"
                 >
                     {currentQ.text}
                 </motion.h2>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {currentQ.options.map((opt, i) => (
                         <motion.button
                           key={`opt-${questionIndex}-${i}`}
                           initial={{ opacity: 0, scale: 0.95 }}
                           animate={{ opacity: 1, scale: 1 }}
                           transition={{ delay: i * 0.1 }}
                           disabled={hasAnswered || timeLeft === 0}
                           onClick={() => handleAnswer(i)}
                           className={cn(
                               "text-left p-6 rounded-xl border text-lg transition-all transform duration-200 outline-none",
                               hasAnswered 
                                  ? (i === currentQ.correctAnswer 
                                      ? "bg-green-500/20 border-green-500/50 text-white" 
                                      : (selectedOption === i ? "bg-red-500/20 border-red-500/50 text-white" : "bg-surface/30 border-white/5 text-gray-400 opacity-50"))
                                  : "bg-surface border-white/10 text-gray-200 hover:border-brand/50 hover:bg-surface/80 hover:-translate-y-1 focus:ring-2 focus:ring-brand"
                           )}
                         >
                             <span className="inline-block w-8 h-8 rounded bg-white/5 text-center leading-8 mr-4 font-mono font-bold text-gray-400 group-hover:text-brand">{String.fromCharCode(65 + i)}</span>
                             {opt}
                         </motion.button>
                     ))}
                 </div>
             </div>
          </div>

          {/* Persistent Dynamic Leaderboard Strip (Requirement 9.3) */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/10 bg-surface/30 backdrop-blur-xl p-6 hidden md:block">
              <h3 className="text-white font-bold text-lg mb-6 flex items-center">
                  <TrophyIcon className="w-5 h-5 text-yellow-500 mr-2" />
                  Live Standings
              </h3>
              
              <AnimatePresence>
                  {leaderboard.map((lb, i) => (
                      <motion.div 
                       layout
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       key={lb.name} 
                       className="flex justify-between items-center py-3 border-b border-white/5 last:border-0"
                      >
                           <div className="flex items-center gap-3">
                               <span className="text-gray-500 font-mono text-sm w-4">{i + 1}.</span>
                               <span className={cn("font-medium", lb.name === (user?.name || 'You') ? 'text-brand' : 'text-gray-300')}>{lb.name}</span>
                           </div>
                           <span className="font-mono text-white font-bold">{lb.score}</span>
                      </motion.div>
                  ))}
              </AnimatePresence>
              {leaderboard.length === 0 && <p className="text-sm text-textLight italic text-center py-4">Waiting for first answer...</p>}
          </div>
      </div>
  );
}
