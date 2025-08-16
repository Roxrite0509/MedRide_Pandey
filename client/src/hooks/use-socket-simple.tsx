import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/hooks/use-auth";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (event: string, data: any) => void;
  lastMessage: any;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  const connectionRef = useRef<boolean>(false);
  const isUnmountingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!user || !token || connectionRef.current) return;

    console.log('🔌 Initializing Socket.IO connection...');
    connectionRef.current = true;
    isUnmountingRef.current = false;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const socketUrl = `${protocol}//${host}`;

    const newSocket = io(socketUrl, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5, // Increased from 2
      reconnectionDelay: 1000, // Reduced from 3000
      reconnectionDelayMax: 5000, // Reduced from 10000
      timeout: 20000,
      forceNew: false,
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      if (!isUnmountingRef.current) {
        console.log('✅ Socket.IO connected:', newSocket.id);
        setIsConnected(true);
      }
    });

    newSocket.on('connection:ack', (data) => {
      if (!isUnmountingRef.current) {
        console.log('🎯 Connection acknowledged:', data);
      }
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

    newSocket.on('disconnect', (reason) => {
      if (!isUnmountingRef.current) {
        console.log('🔌 Socket.IO disconnected:', reason);
        setIsConnected(false);
        
        // Only attempt reconnection for client-side disconnects
        if (reason === 'transport close' || reason === 'ping timeout') {
          setTimeout(() => {
            if (!isUnmountingRef.current && newSocket && !newSocket.connected) {
              console.log('🔄 Attempting manual reconnection...');
              newSocket.connect();
            }
          }, 2000);
        }
      }
    });

    newSocket.on('connect_error', (error) => {
      if (!isUnmountingRef.current) {
        console.error('❌ Socket.IO connection error:', error);
        setIsConnected(false);
      }
    });

    setSocket(newSocket);

    return () => {
      console.log('🧹 Cleaning up Socket.IO connection');
      isUnmountingRef.current = true;
      connectionRef.current = false;
      if (newSocket) {
        newSocket.removeAllListeners();
        newSocket.disconnect();
      }
    };
  }, [user?.id, token]);

  const sendMessage = (event: string, data: any) => {
    if (socket?.connected) {
      console.log(`📤 Sending ${event}:`, data);
      socket.emit(event, data);
    } else {
      console.warn('⚠️ Cannot send message - Socket.IO not connected');
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, sendMessage, lastMessage }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}