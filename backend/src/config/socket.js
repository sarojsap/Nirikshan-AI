import { Server } from 'socket.io';

let io; // This will hold our Socket.IO instance

export const initSocket = httpServer => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', socket => {
    console.log(`New client connected to WebSockets: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

// We will use this function in our controllers to get the io instance
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized.');
  }
  return io;
};
