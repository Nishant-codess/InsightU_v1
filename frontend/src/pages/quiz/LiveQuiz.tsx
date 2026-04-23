import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { TrophyIcon, UserGroupIcon, FireIcon, SparklesIcon, ShieldExclamationIcon, BoltIcon, CursorArrowRaysIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';

// Mocked Question structure mappings for simulated flow
const MOCK_QUESTIONS = [
  { id: 'q1', text: 'Which data structure follows the LIFO principle?', options: ['Queue', 'Stack', 'Tree', 'Graph'], correctAnswer: 1 },
  { id: 'q2', text: 'What is the theoretical time complexity of binary search?', options: ['O(n)', 'O(1)', 'O(n log n)', 'O(log n)'], correctAnswer: 3 },
];

type PowerUpType = 'FIFTY_FIFTY' | 'TIME_FREEZE' | 'DOUBLE_POINTS' | 'SHIELD';

interface PowerUp {
  type: PowerUpType;
  used: boolean;
}

interface PlayerAvatar {
  id: string;
  name: string;
  score: number;
  joinedAt: number;
}

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
  const [powerUps, setPowerUps] = useState<PowerUp[]>([
    { type: 'FIFTY_FIFTY', used: false },
    { type: 'TIME_FREEZE', used: false },
    { type: 'DOUBLE_POINTS', used: false },
    { type: 'SHIELD', used: false },
  ]);
  const [playerAvatars, setPlayerAvatars] = useState<PlayerAvatar[]>([
    { id: '1', name: 'You', score: 0, joinedAt: Date.now() },
  ]);
  const [showScoreReveal, setShowScoreReveal] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);

  useEffect(() => {
    const newSocket = io('http://localhost:3000/quiz', {
      auth: { token: 'mock-jwt-token' },
      transports: ['websocket'],
      autoConnect: false
    });

    setSocket(newSocket);
    return () => { newSocket.close(); };
  }, []);

  // Simulating the WebSocket Lifecycle
  useEffect(() => {
    if (gameState === 'WAITING') {
      setTimeout(() => setGameState('ACTIVE'), 4000);
    }
  }, [gameState]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'ACTIVE' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'ACTIVE') {
      setTimeout(() => {
        if (questionIndex < MOCK_QUESTIONS.length - 1) {
          setQuestionIndex(prev => prev + 1);
          setTimeLeft(30);
          setSelectedOption(null);
          setHasAnswered(false);
          setShowScoreReveal(false);
          setLastAnswerCorrect(null);
          setHiddenOptions([]);
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
    setShowScoreReveal(true);

    const isCorrect = index === MOCK_QUESTIONS[questionIndex].correctAnswer;
    setLastAnswerCorrect(isCorrect);
    const scoreMod = isCorrect ? (timeLeft * 10) : 0;
    
    setLeaderboard([
      { name: user?.name || 'You', score: 100 + scoreMod },
      { name: 'Alex T.', score: 250 },
      { name: 'Sarah M.', score: 180 }
    ].sort((a,b) => b.score - a.score));
  };

  const handlePowerUp = (type: PowerUpType) => {
    const powerUp = powerUps.find(p => p.type === type);
    if (!powerUp || powerUp.used) return;

    // Mark as used
    setPowerUps(prev => prev.map(p => p.type === type ? { ...p, used: true } : p));

    // Apply effect based on type
    if (type === 'FIFTY_FIFTY') {
      const currentQ = MOCK_QUESTIONS[questionIndex];
      const incorrectIndices = currentQ.options
        .map((_, i) => i)
        .filter(i => i !== currentQ.correctAnswer);
      const toHide = incorrectIndices.sort(() => Math.random() - 0.5).slice(0, 2);
      setHiddenOptions(toHide);
    } else if (type === 'TIME_FREEZE') {
      setTimeLeft(prev => prev + 10);
    } else if (type === 'DOUBLE_POINTS') {
      // This would be applied when answer is submitted
    } else if (type === 'SHIELD') {
      // This would protect from losing points
    }
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
          
          {/* Animated waiting lobby with player avatars */}
          <div className="mb-8">
            <p className="text-sm text-textLight mb-4">Players Joining</p>
            <div className="flex justify-center gap-4 flex-wrap">
              <AnimatePresence>
                {playerAvatars.map((player, i) => (
                  <motion.div
                    key={player.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.2 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center text-white font-bold">
                      {player.name.charAt(0)}
                    </div>
                    <p className="text-xs text-textLight mt-2">{player.name}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-brand font-medium">
            <UserGroupIcon className="w-5 h-5" />
            <span>{playerAvatars.length} Students Connected</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'FINISHED') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Confetti animation */}
        <AnimatePresence>
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -20, opacity: 1, x: Math.random() * 100 - 50 }}
              animate={{ y: 400, opacity: 0, x: Math.random() * 200 - 100 }}
              transition={{ duration: 2 + Math.random() * 1, delay: Math.random() * 0.5 }}
              className="fixed w-2 h-2 bg-brand rounded-full pointer-events-none"
            />
          ))}
        </AnimatePresence>

        {/* Leaderboard Celebration Mapping */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-2xl px-6 py-10 glass-card bg-surface/80 relative z-10"
        >
          <div className="text-center mb-10">
            <TrophyIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-4xl font-extrabold text-white">Quiz Completed!</h1>
            <p className="text-textLight mt-2 text-lg">Final Session Rankings</p>
          </div>

          {/* Top 3 Podium */}
          <div className="flex justify-center items-end gap-4 mb-8 h-40">
            {leaderboard.slice(0, 3).map((player, i) => {
              const heights = ['h-32', 'h-40', 'h-24'];
              const medals = ['🥈', '🥇', '🥉'];
              return (
                <motion.div
                  key={i}
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.2 }}
                  className="flex flex-col items-center"
                >
                  <div className="text-3xl mb-2">{medals[i]}</div>
                  <div className={cn(
                    heights[i],
                    'w-20 bg-gradient-to-t from-brand to-purple-600 rounded-t-lg flex items-end justify-center pb-4 relative'
                  )}>
                    <span className="text-white font-bold text-lg">#{i + 1}</span>
                  </div>
                  <p className="text-white font-bold mt-2">{player.name}</p>
                  <p className="text-brand font-mono">{player.score} pts</p>
                </motion.div>
              );
            })}
          </div>

          {/* Full Leaderboard */}
          <div className="space-y-2 mb-8">
            {leaderboard.map((player, i) => (
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                key={i} 
                className={cn(
                  "flex justify-between items-center p-4 rounded-lg border",
                  i < 3 ? "bg-brand/10 border-brand/30" : "bg-surface/50 border-white/5",
                  player.name === (user?.name || 'You') && i >= 3 && "bg-brand/5 border-brand/20"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-lg font-bold font-mono w-8 text-center",
                    i < 3 ? "text-brand" : "text-gray-500"
                  )}>#{i + 1}</span>
                  <span className={cn("text-base font-medium", i < 3 ? "text-white" : "text-gray-300")}>{player.name}</span>
                </div>
                <span className="font-mono text-lg text-brand">{player.score}</span>
              </motion.div>
            ))}
          </div>
          
          <Button onClick={() => navigate('/dashboard')} className="w-full" size="lg">Return to Dashboard</Button>
        </motion.div>
      </div>
    );
  }

  const currentQ = MOCK_QUESTIONS[questionIndex];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      
      {/* Main Question Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-12 relative">
        <div className="w-full max-w-3xl">
          {/* Question Header */}
          <div className="flex justify-between items-end mb-8">
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-brand font-bold uppercase tracking-widest text-sm"
            >
              Question {questionIndex + 1} of {MOCK_QUESTIONS.length}
            </motion.span>
            
            {/* Countdown Ring Timer */}
            <motion.div 
              className={cn(
                "relative w-24 h-24 flex items-center justify-center",
                timeLeft <= 10 && "animate-pulse"
              )}
            >
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="3"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className={cn(
                    "text-brand",
                    timeLeft <= 10 && "text-red-500"
                  )}
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - timeLeft / 30)}`}
                  transition={{ duration: 0.3 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={cn(
                    "text-2xl font-bold font-mono",
                    timeLeft <= 10 ? "text-red-400" : "text-brand"
                  )}>
                    {timeLeft}s
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Animated Question Card */}
          <motion.div
            key={`q-${questionIndex}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 100 }}
            className="mb-10"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-10 leading-snug">
              {currentQ.text}
            </h2>
          </motion.div>

          {/* Bouncing Answer Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {currentQ.options.map((opt, i) => (
              <motion.button
                key={`opt-${questionIndex}-${i}`}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: i * 0.1, type: 'spring' }}
                whileHover={!hasAnswered && !hiddenOptions.includes(i) ? { scale: 1.05, y: -5 } : {}}
                whileTap={!hasAnswered && !hiddenOptions.includes(i) ? { scale: 0.95 } : {}}
                disabled={hasAnswered || timeLeft === 0 || hiddenOptions.includes(i)}
                onClick={() => handleAnswer(i)}
                className={cn(
                  "text-left p-6 rounded-xl border text-lg transition-all transform duration-200 outline-none relative overflow-hidden",
                  hiddenOptions.includes(i) && "opacity-0 pointer-events-none",
                  hasAnswered 
                    ? (i === currentQ.correctAnswer 
                      ? "bg-green-500/20 border-green-500/50 text-white" 
                      : (selectedOption === i ? "bg-red-500/20 border-red-500/50 text-white" : "bg-surface/30 border-white/5 text-gray-400 opacity-50"))
                    : "bg-surface border-white/10 text-gray-200 hover:border-brand/50 hover:bg-surface/80 focus:ring-2 focus:ring-brand"
                )}
              >
                <span className="inline-block w-8 h-8 rounded bg-white/5 text-center leading-8 mr-4 font-mono font-bold text-gray-400">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </motion.button>
            ))}
          </div>

          {/* Score Reveal Animation */}
          <AnimatePresence>
            {showScoreReveal && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className={cn(
                  "text-center py-4 px-6 rounded-lg font-bold text-lg",
                  lastAnswerCorrect
                    ? "bg-green-500/20 text-green-400 border border-green-500/50"
                    : "bg-red-500/20 text-red-400 border border-red-500/50"
                )}
              >
                {lastAnswerCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Power-up Tray */}
      <div className="w-full md:w-32 border-t md:border-t-0 md:border-l border-white/10 bg-surface/30 backdrop-blur-xl p-4 flex md:flex-col gap-3 md:gap-4 justify-center md:justify-start md:pt-8">
        <div className="hidden md:block text-white font-bold text-sm mb-2 text-center">Power-ups</div>
        {powerUps.map((powerUp) => {
          const icons = {
            FIFTY_FIFTY: <CursorArrowRaysIcon className="w-5 h-5" />,
            TIME_FREEZE: <BoltIcon className="w-5 h-5" />,
            DOUBLE_POINTS: <SparklesIcon className="w-5 h-5" />,
            SHIELD: <ShieldExclamationIcon className="w-5 h-5" />,
          };
          const labels = {
            FIFTY_FIFTY: '50/50',
            TIME_FREEZE: '+10s',
            DOUBLE_POINTS: '2x',
            SHIELD: 'Shield',
          };

          return (
            <motion.button
              key={powerUp.type}
              whileHover={!powerUp.used ? { scale: 1.1 } : {}}
              whileTap={!powerUp.used ? { scale: 0.95 } : {}}
              disabled={powerUp.used}
              onClick={() => handlePowerUp(powerUp.type)}
              className={cn(
                "w-12 h-12 md:w-full md:h-14 rounded-lg border-2 flex items-center justify-center transition-all",
                "md:flex-col md:gap-1 md:text-xs md:font-bold",
                powerUp.used
                  ? "bg-gray-700/30 border-gray-600/30 text-gray-500 opacity-50 cursor-not-allowed"
                  : "bg-brand/20 border-brand/50 text-brand hover:bg-brand/30 cursor-pointer"
              )}
              title={labels[powerUp.type]}
            >
              {icons[powerUp.type]}
              <span className="hidden md:inline text-xs">{labels[powerUp.type]}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Persistent Dynamic Leaderboard Strip */}
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
                <span className={cn("font-medium text-sm", lb.name === (user?.name || 'You') ? 'text-brand' : 'text-gray-300')}>
                  {lb.name}
                </span>
              </div>
              <span className="font-mono text-white font-bold text-sm">{lb.score}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {leaderboard.length === 0 && <p className="text-sm text-textLight italic text-center py-4">Waiting for first answer...</p>}
      </div>
    </div>
  );
}
