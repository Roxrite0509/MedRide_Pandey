import { Server as IOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// JWT Secret for authentication
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required for security');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security');
  }
  return secret;
})();

// Socket.IO event types
export interface ServerToClientEvents {
  'emergency:new': (data: any) => void;
  'ambulance:response': (data: any) => void;
  'emergency:status_update': (data: any) => void;
  'ambulance:eta_update': (data: any) => void;
  'ambulance:location_update': (data: any) => void;
  'ambulance:status_update': (data: any) => void;
  'admin:database_update': (data: any) => void;
  'hospital:bed_update': (data: any) => void;
  'communication:new_message': (data: any) => void;
  'connection:ack': (data: { success: boolean; message: string }) => void;
}

export interface ClientToServerEvents {
  'ambulance:location_update': (data: { lat: number; lng: number }) => void;
  'ambulance:status_update': (data: any) => void;
  'emergency:create': (data: any) => void;
  'communication:send_message': (data: any) => void;
  'join_room': (roomId: string) => void;
  'leave_room': (roomId: string) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: number;
  username: string;
  role: string;
  ambulanceId?: number;
  hospitalId?: number;
}

let io: IOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// Simple JWT authentication middleware for Socket.IO
const authenticateSocket = (socket: any, next: any) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        console.warn('Socket authentication failed:', err.message);
        return next(new Error('Invalid or expired token'));
      }
      
      // Store user data in socket
      socket.data.userId = decoded.id;
      socket.data.username = decoded.username;
      socket.data.role = decoded.role;
      socket.data.ambulanceId = decoded.ambulanceId;
      socket.data.hospitalId = decoded.hospitalId;
      
      console.log(`🔐 Socket authenticated: ${decoded.username} (${decoded.role})`);
      next();
    });
  } catch (error) {
    next(new Error('Authentication failed'));
  }
};

export function initializeSocketIO(httpServer: HttpServer): IOServer {
  io = new IOServer(httpServer, {
    path: '/socket.io',
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? [process.env.CLIENT_URL || 'https://your-domain.com']
        : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    // Optimized connection settings - configurable via environment
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT || '60000'), // Default 60s
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL || '25000'), // Default 25s
  });

  // Authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    // Join role-based room for broadcasting
    const roleRoom = `role:${socket.data.role}`;
    socket.join(roleRoom);

    // Join user-specific room
    const userRoom = `user:${socket.data.userId}`;
    socket.join(userRoom);

    // Join role-specific rooms based on user type
    if (socket.data.role === 'ambulance' && socket.data.ambulanceId) {
      socket.join(`ambulance:${socket.data.ambulanceId}`);
    }
    
    if (socket.data.role === 'hospital' && socket.data.hospitalId) {
      socket.join(`hospital:${socket.data.hospitalId}`);
    }

    // Send connection acknowledgment
    socket.emit('connection:ack', {
      success: true,
      message: 'Connected to EmergencyConnect real-time services'
    });

    // Handle ambulance location updates
    socket.on('ambulance:location_update', (data) => {
      if (socket.data.role !== 'ambulance') return;
      
      // Location update received
      
      // Broadcast to patients and hospitals
      socket.to('role:patient').emit('ambulance:location_update', {
        ambulanceId: socket.data.ambulanceId,
        lat: data.lat,
        lng: data.lng,
        timestamp: new Date().toISOString()
      });
      
      socket.to('role:hospital').emit('ambulance:location_update', {
        ambulanceId: socket.data.ambulanceId,
        lat: data.lat,
        lng: data.lng,
        timestamp: new Date().toISOString()
      });
    });

    // Handle ambulance status updates
    socket.on('ambulance:status_update', (data) => {
      if (socket.data.role !== 'ambulance') return;
      
      // Status update received
      
      // Optimized targeted broadcast instead of global emission
      const updateData = {
        ambulanceId: socket.data.ambulanceId,
        ...data,
        timestamp: new Date().toISOString()
      };
      
      // Send to relevant hospitals and patients only
      socket.to('role:patient').emit('ambulance:status_update', updateData);
      socket.to('role:hospital').emit('ambulance:status_update', updateData);
      
      // Send to admin users for monitoring
      socket.to('role:admin').emit('ambulance:status_update', updateData);
    });

    // Handle joining specific rooms
    socket.on('join_room', (roomId: string) => {
      socket.join(roomId);
      // User joined room
    });

    // Handle leaving specific rooms
    socket.on('leave_room', (roomId: string) => {
      socket.leave(roomId);
      // User left room
    });

    // Handle communication messages
    socket.on('communication:send_message', (data) => {
      // Message received
      
      // Broadcast to specific user or room
      if (data.targetUserId) {
        socket.to(`user:${data.targetUserId}`).emit('communication:new_message', {
          ...data,
          senderId: socket.data.userId,
          senderName: socket.data.username,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      // Socket disconnected
    });

    // Handle connection errors
    socket.on('error', (error) => {
      // Socket error occurred
    });
  });

  return io;
}

// Removed all broadcasting functions - using simplified Socket.IO for basic real-time communication only

export { io };