# WebSocket to Socket.IO Migration Plan

## Project Overview
EmergencyConnect is a React-based emergency response coordination platform that currently uses native WebSockets for real-time communication. The WebSocket implementation is currently **disabled** in the client for Replit environment stability, but the server-side WebSocket server is active.

## Migration Strategy

### 1. Files to Change

#### Server Files
- `server/routes.ts` - Replace native WebSocketServer with Socket.IO server
- `server/index.ts` - May need updates for Socket.IO integration
- `package.json` - Add Socket.IO dependencies

#### Client Files  
- `client/src/hooks/use-websocket.tsx` - Replace with Socket.IO client hook
- `client/src/lib/api.ts` - Update WebSocket URL generation for Socket.IO
- `client/src/components/notification-system.tsx` - Update to use Socket.IO events
- `client/src/pages/admin.tsx` - Update WebSocket message handling  
- `client/src/pages/patient.tsx` - Update WebSocket message handling
- `client/src/pages/ambulance.tsx` - Update WebSocket message handling
- `client/src/pages/enhanced-patient.tsx` - Update WebSocket message handling

### 2. Dependencies to Add

#### Server Dependencies
```json
{
  "socket.io": "^4.7.5"
}
```

#### Client Dependencies  
```json
{
  "socket.io-client": "^4.7.5"
}
```

#### Optional (for horizontal scaling)
```json
{
  "@socket.io/redis-adapter": "^8.2.1",
  "redis": "^4.6.0"
}
```

### 3. TypeScript Typings

#### Server Types
- Create `server/types/socket.ts` with Socket.IO event definitions
- Update existing types to support Socket.IO events

#### Client Types  
- Update `client/src/types/index.ts` with Socket.IO client types
- Create socket event interface definitions

### 4. Implementation Changes

#### Server Changes
- Replace `new WebSocketServer()` with Socket.IO server attachment
- Convert WebSocket message handlers to Socket.IO event handlers
- Implement room-based broadcasting for role-specific messages
- Add proper CORS configuration for Socket.IO

#### Client Changes
- Replace disabled WebSocket hook with functional Socket.IO hook
- Convert message sending from `sendMessage(type, data)` to `socket.emit(event, data)`
- Convert message receiving from `lastMessage` polling to `socket.on(event, handler)`
- Implement automatic reconnection and connection state management

### 5. Event Mapping
Current WebSocket events → Socket.IO events:
- `new_emergency_request` → `emergency:new`
- `ambulance_response` → `ambulance:response`  
- `emergency_status_update` → `emergency:status_update`
- `eta_update` → `ambulance:eta_update`
- `location_update` → `ambulance:location_update`
- `ambulance_status_update` → `ambulance:status_update`
- `database_update` → `admin:database_update`
- `hospital_bed_update` → `hospital:bed_update`

### 6. Testing Strategy

#### Unit Tests
- Socket.IO server initialization and event handling
- Client socket connection and event emission
- Message serialization/deserialization

#### Integration Tests  
- End-to-end emergency request flow with real-time updates
- Multi-user scenarios (patient, ambulance, hospital)
- Connection resilience and reconnection

### 7. Deployment Considerations

#### Environment Variables
- `SOCKET_IO_CORS_ORIGIN` - Configure allowed origins
- `REDIS_URL` - For horizontal scaling (optional)

#### Process Changes
- No changes needed for single-instance deployment
- For multi-instance: Add Redis adapter configuration

### 8. Rollback Procedure

#### Immediate Rollback
1. Revert to previous commit: `git reset --hard HEAD~n`
2. Restart application servers
3. Verify WebSocket functionality restored

#### File-level Rollback
1. Restore backed up files from `*.backup.*` extensions
2. Remove Socket.IO dependencies from package.json
3. Run `npm install` to restore previous state

#### Database Rollback
- No database changes required - migration is transport-layer only

### 9. Risk Assessment

#### Low Risk
- Transport layer change only - no business logic modifications
- Socket.IO is drop-in replacement with better features
- Client WebSocket currently disabled, so limited production impact

#### Medium Risk  
- Need to test all real-time features comprehensively
- Ensure CORS and security configurations are correct

#### High Risk
- Emergency response system requires 100% reliability
- Must verify message delivery guarantees

### 10. Success Criteria

#### Functional Requirements
- ✅ All emergency request flows work with real-time updates
- ✅ Ambulance location tracking functions correctly  
- ✅ Hospital bed status updates in real-time
- ✅ Admin dashboard shows live data updates
- ✅ Cross-role notifications work properly

#### Performance Requirements
- ✅ Message latency < 100ms for local network
- ✅ Successful reconnection within 5 seconds
- ✅ Support 100+ concurrent connections

#### Reliability Requirements
- ✅ 99.9% message delivery success rate
- ✅ Graceful degradation when Socket.IO unavailable
- ✅ No data loss during connection interruptions

## Migration Timeline

1. **Phase 0-1**: Discovery and Planning ✅
2. **Phase 2**: Dependencies (30 minutes)
3. **Phase 3**: Server Migration (1 hour)  
4. **Phase 4**: Client Migration (1 hour)
5. **Phase 5**: Testing (45 minutes)
6. **Phase 6**: Documentation (30 minutes)
7. **Phase 7**: Deployment Verification (30 minutes)

**Total Estimated Time**: 4 hours