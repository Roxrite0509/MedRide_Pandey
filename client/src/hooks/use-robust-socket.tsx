import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './use-auth';

interface RobustSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (event: string, data: any) => void;
  lastMessage: any;
}

const RobustSocketContext = createContext<RobustSocketContextType | null>(null);

export function RobustSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const connectionAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const isManualDisconnect = useRef(false);

  useEffect(() => {
    if (!user || !token) return;

    console.log('🔌 Initializing robust Socket.IO connection...');
    isManualDisconnect.current = false;
    connectionAttempts.current = 0;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const socketUrl = `${protocol}//${host}`;

    const createConnection = () => {
      const newSocket = io(socketUrl, {
        path: '/socket.io',
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: false, // Handle reconnection manually
        timeout: 15000,
        forceNew: true,
      });

      // Connection successful
      newSocket.on('connect', () => {
        console.log('✅ Robust Socket.IO connected:', newSocket.id);
        setIsConnected(true);
        connectionAttempts.current = 0;
        
        // Clear any pending reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      });

      // Connection acknowledgment
      newSocket.on('connection:ack', (data) => {
        console.log('🎯 Connection acknowledged:', data);
      });

      // Handle real-time events
      const eventHandlers = [
        'emergency:new',
        'ambulance:response', 
        'emergency:status_update',
        'ambulance:eta_update',
        'ambulance:location_update',
        'ambulance:status_update',
        'hospital:bed_update',
        'communication:new_message'
      ];

      eventHandlers.forEach(event => {
        newSocket.on(event, (data) => {
          console.log(`📨 Received ${event}:`, data);
          setLastMessage({
            type: event.replace(':', '_'),
            event,
            data,
            timestamp: new Date().toISOString()
          });
        });
      });

      // Handle disconnection
      newSocket.on('disconnect', (reason) => {
        console.log('🔌 Robust Socket.IO disconnected:', reason);
        setIsConnected(false);
        
        // Only attempt reconnection if not manually disconnected
        if (!isManualDisconnect.current && connectionAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, connectionAttempts.current), 10000);
          console.log(`🔄 Scheduling reconnection attempt ${connectionAttempts.current + 1} in ${delay}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectionAttempts.current++;
            console.log(`🔄 Reconnection attempt ${connectionAttempts.current}/${maxReconnectAttempts}`);
            createConnection();
          }, delay);
        }
      });

      // Handle connection errors
      newSocket.on('connect_error', (error) => {
        console.error('❌ Robust Socket.IO connection error:', error);
        setIsConnected(false);
        
        if (!isManualDisconnect.current && connectionAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(2000 * Math.pow(2, connectionAttempts.current), 15000);
          console.log(`🔄 Scheduling reconnection after error in ${delay}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectionAttempts.current++;
            createConnection();
          }, delay);
        }
      });

      setSocket(newSocket);
      return newSocket;
    };

    const currentSocket = createConnection();

    return () => {
      console.log('🧹 Cleaning up robust Socket.IO connection');
      isManualDisconnect.current = true;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (currentSocket) {
        currentSocket.removeAllListeners();
        currentSocket.disconnect();
      }
    };
  }, [user?.id, token]);

  const sendMessage = (event: string, data: any) => {
    if (socket?.connected) {
      console.log(`📤 Sending ${event}:`, data);
      socket.emit(event, data);
    } else {
      console.warn('⚠️ Cannot send message - Robust Socket.IO not connected');
    }
  };

  return (
    <RobustSocketContext.Provider value={{ socket, isConnected, sendMessage, lastMessage }}>
      {children}
    </RobustSocketContext.Provider>
  );
}

export function useRobustSocket() {
  const context = useContext(RobustSocketContext);
  if (!context) {
    throw new Error('useRobustSocket must be used within a RobustSocketProvider');
  }
  return context;
}