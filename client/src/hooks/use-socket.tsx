import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
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
  const isInitialized = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isUnmountingRef = useRef(false);

  const connectSocket = useCallback(() => {
    if (!user || !token || socket?.connected || isInitialized.current) return;
    
    console.log('🔌 Connecting to Socket.IO server...');
    isInitialized.current = true;
    isUnmountingRef.current = false;
    setIsConnecting(true);
    setConnectionAttempts(prev => prev + 1);

    // Clear any existing reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Determine the Socket.IO server URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const socketUrl = `${protocol}//${host}`;

    // Create Socket.IO connection with optimized settings
    const newSocket = io(socketUrl, {
      path: '/socket.io',
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 15000,
      reconnection: true, // Enable automatic reconnection
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      forceNew: false,
      autoConnect: true
    });

    // Connection successful
    newSocket.on('connect', () => {
      if (!isUnmountingRef.current) {
        console.log('✅ Socket.IO connected:', newSocket.id);
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionAttempts(0);
      }
    });

    // Connection acknowledgment
    newSocket.on('connection:ack', (data) => {
      if (!isUnmountingRef.current) {
        console.log('🎯 Connection acknowledged:', data);
      }
    });

    // Handle all real-time events with proper error handling
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
        if (!isUnmountingRef.current) {
          console.log(`📨 Received ${event}:`, data);
          setLastMessage({ 
            type: event.replace(':', '_'), // Convert to legacy format for compatibility
            event: event,
            data: data,
            timestamp: new Date().toISOString()
          });
        }
      });
    });

    // Handle legacy event format for backward compatibility
    const legacyEvents = [
      'eta_update',
      'emergency_status_update', 
      'ambulance_response',
      'new_emergency_request',
      'hospital_bed_update',
      'new_message'
    ];

    legacyEvents.forEach(event => {
      newSocket.on(event, (data) => {
        if (!isUnmountingRef.current) {
          console.log(`📨 Received legacy ${event}:`, data);
          setLastMessage({ 
            type: event, 
            event: event,
            data, 
            timestamp: new Date().toISOString() 
          });
        }
      });
    });

    // Connection errors
    newSocket.on('connect_error', (error) => {
      if (!isUnmountingRef.current) {
        console.error('❌ Socket.IO connection error:', error);
        setIsConnecting(false);
        setIsConnected(false);
        
        // Retry connection with exponential backoff (max 3 attempts)
        if (connectionAttempts < 3) {
          const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 10000);
          console.log(`🔄 Scheduling reconnection attempt in ${delay}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isUnmountingRef.current) {
              isInitialized.current = false;
              connectSocket();
            }
          }, delay);
        }
      }
    });

    // Disconnection
    newSocket.on('disconnect', (reason) => {
      if (!isUnmountingRef.current) {
        console.log('🔌 Socket.IO disconnected:', reason);
        setIsConnected(false);
        setIsConnecting(false);
        
        // Let Socket.IO handle automatic reconnection for transport errors
        console.log(`🔌 Socket disconnected due to: ${reason}. Auto-reconnection will be handled by Socket.IO.`);
        
        // Only manually reconnect for server-side disconnections
        if (reason === 'io server disconnect' || reason === 'io client disconnect') {
          console.log(`🔄 Manual reconnection required for: ${reason}`);
          const delay = 2000;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isUnmountingRef.current && connectionAttempts < 3) {
              isInitialized.current = false;
              connectSocket();
            }
          }, delay);
        }
      }
    });

    // Reconnection events
    newSocket.on('reconnect', (attemptNumber) => {
      if (!isUnmountingRef.current) {
        console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionAttempts(0);
      }
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      if (!isUnmountingRef.current) {
        console.log('🔄 Socket.IO reconnection attempt:', attemptNumber);
        setIsConnecting(true);
      }
    });

    newSocket.on('reconnect_failed', () => {
      if (!isUnmountingRef.current) {
        console.error('❌ Socket.IO reconnection failed');
        setIsConnecting(false);
        setIsConnected(false);
      }
    });

    setSocket(newSocket);
  }, [user?.id, token, connectionAttempts]);

  // Initialize connection when user and token are available
  useEffect(() => {
    if (user && token && !isInitialized.current) {
      console.log('🔌 Initializing Socket.IO connection for user:', user.username);
      connectSocket();
    }

    // Cleanup on unmount
    return () => {
      if (socket || reconnectTimeoutRef.current) {
        console.log('🧹 Cleaning up Socket.IO connection');
        isUnmountingRef.current = true;
        isInitialized.current = false;
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        if (socket) {
          socket.removeAllListeners();
          socket.disconnect();
          setSocket(null);
        }
        
        setIsConnected(false);
        setIsConnecting(false);
      }
    };
  }, [user?.id, token]); // Only depend on user ID and token changes

  const sendMessage = useCallback((event: string, data: any): boolean => {
    if (!socket || !socket.connected) {
      console.warn('⚠️ Cannot send message - Socket.IO not connected. Attempting reconnection...');
      // Auto-reconnect if not connected
      if (!isConnecting && user && token) {
        connectSocket();
      }
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
      // Force reconnection on send error
      if (!isConnecting && user && token) {
        setTimeout(() => connectSocket(), 1000);
      }
      return false;
    }
  }, [socket, isConnecting, user, token, connectSocket]);

  const forceReconnect = useCallback(() => {
    console.log('🔄 Force reconnecting Socket.IO...');
    isUnmountingRef.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
    
    setSocket(null);
    setIsConnected(false);
    setIsConnecting(false);
    isInitialized.current = false;
    
    // Wait a moment then reconnect
    setTimeout(() => {
      isUnmountingRef.current = false;
      setConnectionAttempts(0);
      connectSocket();
    }, 1000);
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

// Backward compatibility aliases
export const useWebSocket = useSocket;
export const WebSocketProvider = SocketProvider;