// API configuration for different environments
const getApiUrl = (): string => {
  // For production on Vercel, use environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // For development, use current host
  if (import.meta.env.DEV) {
    return window.location.origin;
  }
  
  // Default fallback
  return window.location.origin;
};

export const API_BASE_URL = getApiUrl();

// WebSocket URL configuration
export const getWebSocketUrl = (): string => {
  const apiUrl = getApiUrl();
  const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
  const wsUrl = apiUrl.replace(/^https?/, wsProtocol);
  return `${wsUrl}/ws`;
};

export const getSocketIOUrl = (): string => {
  const apiUrl = getApiUrl();
  const socketProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
  const socketUrl = apiUrl.replace(/^https?/, socketProtocol);
  return socketUrl; // Socket.IO will use /socket.io path automatically
};

// Health check endpoint
export const HEALTH_CHECK_URL = `${API_BASE_URL}/api/health`;