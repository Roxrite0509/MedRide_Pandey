import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/hooks/use-auth";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionAttempts: number;
  sendMessage: (event: string, data: any) => boolean;
  lastMessage: any;
  forceReconnect: () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const { user } = useAuth();
  const token = localStorage.getItem('token');

  const connectSocket = useCallback(() => {
    if (!user || !token || socket?.connected) return;

    setIsConnecting(true);
    setConnectionAttempts(prev => prev + 1);

    console.log('🔌 Connecting to Socket.IO server...');

    // Determine the Socket.IO server URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const socketUrl = `${protocol}//${host}`;

    // Create Socket.IO connection
    const newSocket = io(socketUrl, {
      path: '/socket.io',
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 5
    });

    // Connection successful
    newSocket.on('connect', () => {
      console.log('✅ Socket.IO connected:', newSocket.id);
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionAttempts(0);
    });

    // Connection acknowledgment
    newSocket.on('connection:ack', (data) => {
      console.log('🎯 Connection acknowledged:', data);
    });

    // Handle all real-time events
    const eventHandlers = [
      'emergency:new',
      'ambulance:response', 
      'emergency:status_update',
      'ambulance:eta_update',
      'ambulance:location_update',
      'ambulance:status_update',
      'admin:database_update',
      'hospital:bed_update',
      'communication:new_message'
    ];

    eventHandlers.forEach(event => {
      newSocket.on(event, (data) => {
        console.log(`📨 Received ${event}:`, data);
        setLastMessage({ 
          type: event.replace(':', '_'), // Convert to legacy format for compatibility
          event: event,
          data: data,
          timestamp: new Date().toISOString()
        });
      });
    });

    // Handle legacy event format for backward compatibility
    newSocket.on('eta_update', (data) => {
      setLastMessage({ type: 'eta_update', data, timestamp: new Date().toISOString() });
    });

    newSocket.on('emergency_status_update', (data) => {
      setLastMessage({ type: 'emergency_status_update', data, timestamp: new Date().toISOString() });
    });

    newSocket.on('ambulance_response', (data) => {
      setLastMessage({ type: 'ambulance_response', data, timestamp: new Date().toISOString() });
    });

    newSocket.on('new_emergency_request', (data) => {
      setLastMessage({ type: 'new_emergency_request', event: 'new_emergency_request', data, timestamp: new Date().toISOString() });
    });

    newSocket.on('hospital_bed_update', (data) => {
      setLastMessage({ type: 'hospital_bed_update', event: 'hospital_bed_update', data, timestamp: new Date().toISOString() });
    });

    newSocket.on('new_message', (data) => {
      setLastMessage({ type: 'new_message', event: 'new_message', data, timestamp: new Date().toISOString() });
    });

    // Connection errors
    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      setIsConnecting(false);
      setIsConnected(false);
    });

    // Disconnection
    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
      setIsConnected(false);
      setIsConnecting(false);
      
      // Auto-reconnect for certain reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, reconnect manually
        setTimeout(() => {
          if (newSocket && !newSocket.connected) {
            newSocket.connect();
          }
        }, 1000);
      }
    });

    // Reconnection events
    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionAttempts(0);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Socket.IO reconnection attempt:', attemptNumber);
      setIsConnecting(true);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ Socket.IO reconnection failed');
      setIsConnecting(false);
      setIsConnected(false);
    });

    setSocket(newSocket);
  }, [user, token, socket?.connected]);

  // Initialize connection when user and token are available
  useEffect(() => {
    if (user && token && !socket) {
      connectSocket();
    }

    // Cleanup on unmount or user change
    return () => {
      if (socket) {
        console.log('🧹 Cleaning up Socket.IO connection');
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setIsConnecting(false);
      }
    };
  }, [user, token, connectSocket]);

  const sendMessage = useCallback((event: string, data: any): boolean => {
    if (!socket || !socket.connected) {
      console.warn('⚠️ Cannot send message - Socket.IO not connected');
      return false;
    }

    try {
      console.log(`📤 Sending ${event}:`, data);
      
      // Handle legacy event format conversions
      const eventMappings: { [key: string]: string } = {
        'location_update': 'ambulance:location_update',
        'ambulance_status_update': 'ambulance:status_update',
        'emergency_create': 'emergency:create',
        'send_message': 'communication:send_message'
      };

      const actualEvent = eventMappings[event] || event;
      socket.emit(actualEvent, data);
      
      return true;
    } catch (error) {
      console.error('❌ Error sending Socket.IO message:', error);
      return false;
    }
  }, [socket]);

  const forceReconnect = useCallback(() => {
    console.log('🔄 Force reconnecting Socket.IO...');
    if (socket) {
      socket.disconnect();
      socket.connect();
    } else {
      connectSocket();
    }
  }, [socket, connectSocket]);

  const contextValue: SocketContextType = {
    socket,
    isConnected,
    isConnecting,
    connectionAttempts,
    sendMessage,
    lastMessage,
    forceReconnect
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

// Backward compatibility alias
export const WebSocketProvider = SocketProvider;

export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  if (!context) {
    // Return safe defaults if context not available
    return {
      socket: null,
      isConnected: false,
      isConnecting: false,
      connectionAttempts: 0,
      sendMessage: () => {
        console.warn('⚠️ useSocket called outside of SocketProvider');
        return false;
      },
      lastMessage: null,
      forceReconnect: () => {
        console.warn('⚠️ useSocket called outside of SocketProvider');
      }
    };
  }
  return context;
}

// Backward compatibility alias
export const useWebSocket = useSocket;