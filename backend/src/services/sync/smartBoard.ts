import { Server } from 'socket.io';

// Mock Smart Board Sync Service for testing phase (Req: Live class note syncing)
export function initializeSmartBoardSync(io: Server) {
  const smartBoardNamespace = io.of('/smart-board');

  smartBoardNamespace.on('connection', (socket) => {
    console.log('Smart Board interface connected:', socket.id);

    socket.on('join-session', (sessionId: string) => {
      socket.join(sessionId);
      console.log(`Socket ${socket.id} joined board session: ${sessionId}`);
    });

    // Simulate incoming board strokes/data
    socket.on('board-update', (data: any) => {
      // Broadcast to everyone in the session except sender
      socket.to(data.sessionId).emit('live-stroke', data.stroke);
    });

    socket.on('disconnect', () => {
      console.log('Smart Board interface disconnected');
    });
  });
}

// Simulated "Testing Phase" Auto-updates
export function startSimulationMode(io: Server, sessionId: string) {
    setInterval(() => {
        io.of('/smart-board').to(sessionId).emit('live-stroke', {
            type: 'pen',
            color: '#66FCF1',
            points: [Math.random() * 500, Math.random() * 500]
        });
    }, 5000); // Send a mock stroke every 5 seconds for testing
}
