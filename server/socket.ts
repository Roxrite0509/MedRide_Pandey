import { Server as IOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

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

// Authentication middleware for Socket.IO
const authenticateSocket = (socket: any, next: any) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        return next(new Error('Invalid or expired token'));
      }
      
      // Store user data in socket
      socket.data.userId = decoded.id;
      socket.data.username = decoded.username;
      socket.data.role = decoded.role;
      socket.data.ambulanceId = decoded.ambulanceId;
      socket.data.hospitalId = decoded.hospitalId;
      
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
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (User: ${socket.data.username}, Role: ${socket.data.role})`);

    // Join role-based room for broadcasting
    const roleRoom = `role:${socket.data.role}`;
    socket.join(roleRoom);
    console.log(`👥 User ${socket.data.username} joined room: ${roleRoom}`);

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
      
      console.log(`📍 Location update from ambulance ${socket.data.username}:`, data);
      
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
      
      console.log(`🚑 Status update from ambulance ${socket.data.username}:`, data);
      
      // Broadcast to all relevant parties
      io.emit('ambulance:status_update', {
        ambulanceId: socket.data.ambulanceId,
        ...data,
        timestamp: new Date().toISOString()
      });
    });

    // Handle joining specific rooms
    socket.on('join_room', (roomId: string) => {
      socket.join(roomId);
      console.log(`🏠 User ${socket.data.username} joined room: ${roomId}`);
    });

    // Handle leaving specific rooms
    socket.on('leave_room', (roomId: string) => {
      socket.leave(roomId);
      console.log(`🚪 User ${socket.data.username} left room: ${roomId}`);
    });

    // Handle communication messages
    socket.on('communication:send_message', (data) => {
      console.log(`💬 Message from ${socket.data.username}:`, data);
      
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
      console.log(`🔌 Socket disconnected: ${socket.id} (User: ${socket.data.username}, Reason: ${reason})`);
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`❌ Socket error for user ${socket.data.username}:`, error);
    });
  });

  return io;
}

// Utility functions for broadcasting to specific groups
export function broadcastToRole(role: string, event: string, data: any) {
  if (!io) {
    console.warn('Socket.IO not initialized, cannot broadcast to role:', role);
    return;
  }
  
  console.log(`📢 Broadcasting ${event} to role: ${role}`);
  io.to(`role:${role}`).emit(event as keyof ServerToClientEvents, data);
}

export function broadcastToUser(userId: number, event: string, data: any) {
  if (!io) {
    console.warn('Socket.IO not initialized, cannot broadcast to user:', userId);
    return;
  }
  
  console.log(`📢 Broadcasting ${event} to user: ${userId}`);
  io.to(`user:${userId}`).emit(event as keyof ServerToClientEvents, data);
}

export function broadcastToAmbulance(ambulanceId: number, event: string, data: any) {
  if (!io) {
    console.warn('Socket.IO not initialized, cannot broadcast to ambulance:', ambulanceId);
    return;
  }
  
  console.log(`📢 Broadcasting ${event} to ambulance: ${ambulanceId}`);
  io.to(`ambulance:${ambulanceId}`).emit(event as keyof ServerToClientEvents, data);
}

export function broadcastToHospital(hospitalId: number, event: string, data: any) {
  if (!io) {
    console.warn('Socket.IO not initialized, cannot broadcast to hospital:', hospitalId);
    return;
  }
  
  console.log(`📢 Broadcasting ${event} to hospital: ${hospitalId}`);
  io.to(`hospital:${hospitalId}`).emit(event as keyof ServerToClientEvents, data);
}

export function broadcastToAll(event: string, data: any) {
  if (!io) {
    console.warn('Socket.IO not initialized, cannot broadcast to all');
    return;
  }
  
  console.log(`📢 Broadcasting ${event} to all connected clients`);
  io.emit(event as keyof ServerToClientEvents, data);
}

export { io };