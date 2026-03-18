import fc from 'fast-check';
import { setupSocketIO, endQuizSession } from './realtime';
import { Server } from 'socket.io';
import prisma from '../../config/database';
import redisClient from '../../config/redis';

jest.mock('../../config/database', () => {
  return {
    __esModule: true,
    default: {
      quizSession: { update: jest.fn() },
      quizParticipation: { create: jest.fn() },
    },
  };
});

jest.mock('../../config/redis', () => {
  let store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      get: jest.fn(async (key: string) => store.get(key) || null),
      set: jest.fn(async (key: string, val: string) => store.set(key, val)),
      del: jest.fn(async (key: string) => store.delete(key)),
      _store: store,
    }
  };
});

// Mock Socket.IO server semantics for memory usage
class MockSocket {
  events: Record<string, Function> = {};
  rooms: string[] = [];
  emitted: Array<{ event: string; args: any[] }> = [];

  on(event: string, cb: Function) {
    this.events[event] = cb;
  }
  join(room: string) {
    this.rooms.push(room);
  }
  emit(event: string, ...args: any[]) {
    this.emitted.push({ event, args });
  }
  trigger(event: string, ...args: any[]) {
    if (this.events[event]) return this.events[event](...args);
  }
}

class MockServer {
  connectionCb: Function | null = null;
  rooms: Record<string, { emitted: Array<{ event: string; args: any[] }> }> = {};

  on(event: string, cb: Function) {
    if (event === 'connection') this.connectionCb = cb;
  }
  
  to(room: string) {
    if (!this.rooms[room]) this.rooms[room] = { emitted: [] };
    return {
      emit: (event: string, ...args: any[]) => {
        this.rooms[room].emitted.push({ event, args });
      }
    };
  }
}

describe('Feature: insightu-platform, Real-time Quizzes', () => {
  let io: MockServer;

  beforeEach(() => {
    jest.clearAllMocks();
    (redisClient as any)._store.clear();
    io = new MockServer();
    setupSocketIO(io as unknown as Server);
  });

  it('Property 36, 38, 39, 33: WebSocket quiz joining, answering, and live leaderboard sync', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 6, maxLength: 6 }), // sessionCode
        fc.uuid(), // studentId
        async (sessionCode, studentId) => {
          jest.clearAllMocks();
          (redisClient as any)._store.clear();
          io.rooms = {};

          // Setup active quiz in mock redis
          await redisClient.set(`quiz:${sessionCode}`, JSON.stringify({
            sessionId: 'sess-1',
            quizId: 'quiz-1',
            status: 'IN_PROGRESS',
            currentQuestionIndex: 0,
            leaderboard: {}
          }));

          const socket = new MockSocket();
          // Simulate connection
          if (io.connectionCb) io.connectionCb(socket);

          // Test property 36: Join session
          await socket.trigger('joinSession', { sessionCode, studentId });
          
          expect(socket.rooms).toContain(sessionCode);
          const joinAck = socket.emitted.find(e => e.event === 'sessionJoined');
          expect(joinAck).toBeDefined();

          // Test property 38 & 39: submit Answer and leaderboard emit (prop 33)
          await socket.trigger('submitAnswer', {
            sessionCode,
            studentId,
            questionIndex: 0,
            answerIndex: 1
          });

          // Server should have broadcasted leaderboard update
          const roomEvents = io.rooms[sessionCode]?.emitted || [];
          const lbUpdate = roomEvents.find(e => e.event === 'leaderboardUpdate');
          
          expect(lbUpdate).toBeDefined();
          const newLb = lbUpdate!.args[0];
          expect(newLb[studentId]).toBe(10); // +10 mock from our simplified implementation

          // Clean up to avoid bleeding
          jest.clearAllMocks();
          (redisClient as any)._store.clear();
          io.rooms = {};
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Property 40: Persistence on session end', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 6, maxLength: 6 }), // sessionCode
        fc.array(fc.record({ id: fc.uuid(), score: fc.integer({ min: 10, max: 100 }) })),
        async (sessionCode, students) => {
          jest.clearAllMocks();
          (redisClient as any)._store.clear();

          const leaderboard: Record<string, number> = {};
          students.forEach(s => leaderboard[s.id] = s.score);

          await redisClient.set(`quiz:${sessionCode}`, JSON.stringify({
            sessionId: `sess-${sessionCode}`,
            quizId: 'quiz-1',
            status: 'IN_PROGRESS',
            currentQuestionIndex: 5,
            leaderboard
          }));

          const resLb = await endQuizSession(sessionCode);
          
          expect(resLb).toEqual(leaderboard);
          expect(prisma.quizSession.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: `sess-${sessionCode}` } })
          );
          
          expect(prisma.quizParticipation.create).toHaveBeenCalledTimes(students.length);
          
          const redisEntry = await redisClient.get(`quiz:${sessionCode}`);
          expect(redisEntry).toBeNull(); // Should be deleted
        }
      ),
      { numRuns: 20 }
    );
  });
});
