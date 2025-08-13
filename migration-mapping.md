# WebSocket to Socket.IO Migration Mapping

## Phase 3 Server Migration - COMPLETED ✅

### Files Changed:
1. **server/routes.ts** - Replaced native WebSocket with Socket.IO
2. **server/socket.ts** - NEW: Created comprehensive Socket.IO server implementation

### Code Pattern Changes:

#### Original WebSocket Implementation:
```typescript
import { WebSocketServer, WebSocket } from "ws";
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
wss.on('connection', async (ws, req) => {
  // Handle WebSocket connections
});
```

#### New Socket.IO Implementation:
```typescript
import { initializeSocketIO, broadcastToRole, broadcastToUser } from "./socket";
const io = initializeSocketIO(httpServer);
console.log('🚀 Socket.IO server initialized on path /socket.io');
```

## Phase 4 Client Migration - COMPLETED ✅

### Files Changed:
1. **client/src/hooks/use-socket.tsx** - NEW: Created Socket.IO client hook
2. **client/src/hooks/use-websocket.tsx** - Updated to re-export Socket.IO implementation
3. **client/src/App.tsx** - Updated provider import and usage
4. **client/src/lib/api.ts** - Added Socket.IO URL helper function

### Code Pattern Changes:

#### Original WebSocket (Disabled) Implementation:
```typescript
// For Replit environment stability, WebSocket is disabled
const [isConnected] = useState(true);
const sendMessage = (type: string, data: any): boolean => {
  // Simulate successful message sending for UI compatibility
  return true;
};
```

#### New Socket.IO Implementation:
```typescript
const newSocket = io(socketUrl, {
  path: '/socket.io',
  auth: { token: token },
  transports: ['websocket', 'polling']
});

const sendMessage = useCallback((event: string, data: any): boolean => {
  if (!socket || !socket.connected) return false;
  socket.emit(actualEvent, data);
  return true;
}, [socket]);
```

## Event Mapping Conversion

### Legacy WebSocket Events → Socket.IO Events:
- `new_emergency_request` → `emergency:new`
- `ambulance_response` → `ambulance:response`  
- `emergency_status_update` → `emergency:status_update`
- `eta_update` → `ambulance:eta_update`
- `location_update` → `ambulance:location_update`
- `ambulance_status_update` → `ambulance:status_update`
- `database_update` → `admin:database_update`
- `hospital_bed_update` → `hospital:bed_update`
- `new_message` → `communication:new_message`

### Backward Compatibility
- Original event names are still supported for existing components
- Event mapping is handled automatically in the Socket.IO client hook
- Components using `useWebSocket()` continue working without changes

## Dependencies Added
- `socket.io`: ^4.7.5 (server)
- `socket.io-client`: ^4.7.5 (client)

## Features Enabled
✅ Real-time emergency notifications
✅ Ambulance location tracking  
✅ Hospital bed status updates
✅ Admin dashboard live updates
✅ Cross-role communication
✅ Automatic reconnection
✅ Room-based broadcasting
✅ Authentication via JWT tokens
✅ CORS configuration
✅ Transport fallback (WebSocket → Polling)

## Backup Files Created
- `server/routes.backup.ts` - Original server implementation
- `client/src/hooks/use-websocket.backup.tsx` - Original client implementation

## Migration Status: ✅ COMPLETE
Server and client migration completed successfully. Socket.IO is now the primary real-time communication layer for EmergencyConnect.