import { Server } from 'socket.io';

let io; // This will hold our Socket.IO instance

export const initSocket = httpServer => {
  const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map(origin => origin.trim())
    : ['http://localhost:5173'];
  const isDevelopment = process.env.NODE_ENV !== 'production';

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || isDevelopment || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`Socket.IO CORS blocked origin: ${origin}`));
      },
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', socket => {
    const origin = socket.handshake.headers.origin || 'unknown origin';
    console.log(`New client connected to WebSockets: ${socket.id} from ${origin}`);

    socket.on('join_camera', cameraId => {
      const room = `camera:${cameraId}`;
      socket.join(room);
    });

    socket.on('leave_camera', cameraId => {
      const room = `camera:${cameraId}`;
      socket.leave(room);
    });

    socket.on('disconnect', reason => {
      console.log(`Client disconnected: ${socket.id} (${reason})`);
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
