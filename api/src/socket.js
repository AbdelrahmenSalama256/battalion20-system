const { Server } = require('socket.io');

let io = null;

function initSocket(server) {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

  io = new Server(server, {
    cors: {
      origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
      socket.join(`user_${userId}`);
    }

    socket.on('disconnect', () => {});
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
}

function emitToAll(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

module.exports = { initSocket, getIO, emitToUser, emitToAll };
