const { Server } = require('socket.io');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*'
    }
  });

  io.on('connection', (socket) => {
    socket.emit('connected', { message: 'Socket BelaGuest conectado com sucesso.' });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io não foi inicializado.');
  }

  return io;
}

module.exports = {
  initSocket,
  getIO
};
