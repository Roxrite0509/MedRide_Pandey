import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { loginSchema, registerSchema, insertEmergencyRequestSchema, insertCommunicationSchema } from "@shared/schema";
import { z } from "zod";
// Google Maps integration - using fetch API instead of the googlemaps package
// This avoids ES module compatibility issues

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

// Google Maps API key from environment variable
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Utility function to generate random coordinates within a radius
function generateRandomLocationInRadius(centerLat: number, centerLng: number, minRadius: number, maxRadius: number) {
  // Generate random distance between minRadius and maxRadius (in kilometers)
  const distance = Math.random() * (maxRadius - minRadius) + minRadius;
  
  // Generate random angle in radians
  const angle = Math.random() * 2 * Math.PI;
  
  // Convert distance to degrees (approximate: 1 degree ≈ 111 km)
  const deltaLat = (distance / 111) * Math.cos(angle);
  const deltaLng = (distance / (111 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle);
  
  return {
    latitude: centerLat + deltaLat,
    longitude: centerLng + deltaLng
  };
}

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Auth middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Role-based access control
const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Health check endpoint for Railway deployment
  const { healthCheck } = await import('./health');
  app.get('/api/health', healthCheck);

  // Set up WebSocket server on a distinct path
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store connected clients with their user info
  const connectedClients = new Map<string, { ws: WebSocket, userId: number, role: string }>();

  // WebSocket connection setup
  wss.on('connection', async (ws, req) => {
    let userId = 0;
    let userRole = 'guest';
    let ambulanceId = null;

    // Parse auth token from URL parameters
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userProfile = await storage.getUserWithProfile(decoded.id);
        
        if (userProfile) {
          userId = userProfile.id;
          userRole = userProfile.role;
          ambulanceId = userProfile?.ambulanceProfile?.id || null;
          console.log(`User connected: ${userProfile.role} (ID: ${userProfile.id})`);
        }
      } catch (err) {
        console.log('WebSocket auth failed, continuing as guest');
      }
    }

    // Store client connection
    const clientId = `${userRole}-${userId}-${Date.now()}`;
    connectedClients.set(clientId, { ws, userId, role: userRole });

    // Handle WebSocket messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleWebSocketMessage(ws, message, { userId, userRole, ambulanceId });
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    });

    ws.on('close', () => {
      if (userId > 0) {
        console.log(`User disconnected: ${userRole} (ID: ${userId})`);
      }
      connectedClients.delete(clientId);
    });

    // Send connection confirmation
    ws.send(JSON.stringify({ type: 'connected', userId, role: userRole }));
  });

  // WebSocket message handler
  const handleWebSocketMessage = (ws: WebSocket, message: any, userInfo: { userId: number, userRole: string, ambulanceId: number | null }) => {
    // Handle different message types
    switch (message.type) {
      case 'ping':
        // Handle heartbeat ping - respond with pong for robust connection
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ 
              type: 'pong', 
              timestamp: Date.now(),
              originalTimestamp: message.timestamp 
            }));
            console.log('💓 Heartbeat pong sent to', userInfo.userRole);
          } catch (error) {
            console.warn('Failed to send heartbeat pong:', error);
          }
        }
        break;
      case 'eta_update':
        console.log('📡 Broadcasting ETA to all clients:', message.data);
        broadcastToAll({ type: 'eta_update', data: message.data });
        break;
      case 'emergency_request_update':
        broadcastToAll({ type: 'emergency_status_update', data: message.data });
        break;
      case 'ambulance_location_update':
        if (userInfo.userRole === 'ambulance' && userInfo.ambulanceId) {
          // Broadcast ambulance location update to hospitals
          broadcastToRole('hospital', {
            type: 'ambulance_location_update',
            data: {
              ambulanceId: userInfo.ambulanceId,
              latitude: message.data.latitude,
              longitude: message.data.longitude,
              timestamp: Date.now()
            }
          });
        }
        break;
      case 'hospital_bed_update':
        // Broadcast bed updates to all connected clients
        broadcastToAll({
          type: 'hospital_bed_update',
          data: message.data
        });
        break;
      default:
        // Silently ignore unknown WebSocket message types to reduce console spam
    }
  };

  // Broadcast function for WebSocket
  const broadcastToAll = (message: any) => {
    connectedClients.forEach(({ ws }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  };

  const broadcastToRole = (role: string, message: any) => {
    connectedClients.forEach(({ ws, role: clientRole }) => {
      if (clientRole === role && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  };

  // All WebSocket handling is now done in the wss.on('connection') above

  // Remove duplicate function - already defined above

  // Helper function to calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Secure Google Maps configuration endpoint
  app.get('/api/maps/config', authenticateToken, async (req, res) => {
    try {
      if (!GOOGLE_MAPS_API_KEY) {
        return res.status(500).json({ message: 'Google Maps API key not configured' });
      }
      
      // Securely provide API key to authenticated clients
      res.json({ apiKey: GOOGLE_MAPS_API_KEY });
    } catch (error) {
      console.error('Maps config error:', error);
      res.status(500).json({ message: 'Failed to get maps configuration' });
    }
  });

  // Get all ambulance locations endpoint
  app.get('/api/ambulances/locations', authenticateToken, async (req, res) => {
    try {
      // Get ALL ambulances, not just available ones, for patient map visibility
      const allAmbulances = await storage.getAvailableAmbulances();
      console.log(`📍 Fetching ${allAmbulances.length} ambulances for patient map`);
      
      const ambulanceLocations = allAmbulances
        .filter(ambulance => {
          // Only include ambulances with valid coordinates
          const lat = parseFloat(ambulance.currentLatitude || '0');
          const lng = parseFloat(ambulance.currentLongitude || '0');
          return lat !== 0 && lng !== 0;
        })
        .map(ambulance => ({
          id: ambulance.id,
          vehicleNumber: ambulance.vehicleNumber,
          currentLatitude: ambulance.currentLatitude,
          currentLongitude: ambulance.currentLongitude,
          status: ambulance.status,
          certification: ambulance.certification,
          equipmentLevel: ambulance.equipmentLevel,
          hospitalAffiliation: ambulance.hospitalAffiliation,
          operatorId: ambulance.operatorId,
          isActive: ambulance.isActive
        }));
      
      console.log(`📍 Returning ${ambulanceLocations.length} valid ambulance locations`);
      res.json(ambulanceLocations);
    } catch (error) {
      console.error('Get ambulance locations error:', error);
      res.status(500).json({ message: 'Failed to get ambulance locations' });
    }
  });

  // Position ambulances based on reference location (rate limited)
  const positionCallCounts = new Map();
  app.post('/api/ambulances/position-all', authenticateToken, async (req, res) => {
    try {
      // Rate limit to prevent excessive calls
      const userId = req.user.id;
      const now = Date.now();
      const lastCall = positionCallCounts.get(userId);
      
      if (lastCall && (now - lastCall) < 10000) { // 10 second cooldown
        return res.json({ message: 'Position update cooldown active' });
      }
      
      positionCallCounts.set(userId, now);
      
      const { latitude, longitude, source } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: 'Latitude and longitude required' });
      }

      // Check if any ambulance needs location assignment
      const allAmbulances = await storage.getAvailableAmbulances();
      const ambulancesNeedingLocation = allAmbulances.filter(amb => {
        const lat = parseFloat(amb.currentLatitude || '0');
        const lng = parseFloat(amb.currentLongitude || '0');
        return lat === 0 && lng === 0;
      });

      if (ambulancesNeedingLocation.length > 0) {
        const referenceLocation = { lat: parseFloat(latitude), lng: parseFloat(longitude) };
        console.log(`Positioning ambulances around ${source || 'reference'} location: ${referenceLocation.lat}, ${referenceLocation.lng}`);
        
        // Determine radius based on source
        let minRadius, maxRadius;
        if (source === 'operator_location') {
          // When using operator location (no patient requests), use 2km radius
          minRadius = 0.5;
          maxRadius = 2;
        } else {
          // When using patient location, use 1.5-2.5km radius
          minRadius = 1.5;
          maxRadius = 2.5;
        }
        
        for (const ambulance of ambulancesNeedingLocation) {
          const randomLocation = generateRandomLocationInRadius(
            referenceLocation.lat, 
            referenceLocation.lng, 
            minRadius, 
            maxRadius
          );
          
          await storage.updateAmbulanceLocation(
            ambulance.id,
            randomLocation.latitude,
            randomLocation.longitude
          );
          console.log(`Positioned ${ambulance.vehicleNumber} at: ${randomLocation.latitude}, ${randomLocation.longitude} (${source})`);
        }
      }

      res.json({ 
        message: 'Ambulance positioning completed',
        positioned: ambulancesNeedingLocation.length 
      });
    } catch (error) {
      console.error('Error positioning ambulances:', error);
      res.status(500).json({ message: 'Failed to position ambulances' });
    }
  });

  // Get all hospitals endpoint for registration dropdown
  app.get('/api/hospitals', async (req, res) => {
    try {
      const hospitals = await storage.getAllHospitals();
      res.json(hospitals);
    } catch (error) {
      console.error('Get hospitals error:', error);
      res.status(500).json({ message: 'Failed to get hospitals' });
    }
  });

  // Get nearby hospitals endpoint with real-time bed data
  app.get('/api/hospitals/nearby', authenticateToken, async (req, res) => {
    try {
      const { lat, lng } = req.query;
      
      let hospitals;
      if (!lat || !lng) {
        // Return all hospitals if no location provided
        hospitals = await storage.getAllHospitals();
      } else {
        const latitude = parseFloat(lat as string);
        const longitude = parseFloat(lng as string);
        
        // Get nearby hospitals within 30km radius
        hospitals = await storage.getNearbyHospitals(latitude, longitude, 30);
      }

      // Enhance hospitals with real-time bed availability from bed_status_logs
      const hospitalsWithRealTimeBeds = await Promise.all(hospitals.map(async (hospital) => {
        try {
          const bedStatus = await storage.getBedAvailabilityStatus(hospital.id);
          console.log(`🏥 Real-time bed status for ${hospital.name} (ID: ${hospital.id}):`, bedStatus);
          return {
            ...hospital,
            availableBeds: bedStatus.available,
            totalBeds: bedStatus.total,
            availableIcuBeds: bedStatus.icuAvailable,
            icuBeds: bedStatus.icuTotal
          };
        } catch (error) {
          console.error(`Failed to get bed status for hospital ${hospital.id}:`, error);
          // Fallback to static data if real-time data is unavailable
          return hospital;
        }
      }));

      res.json(hospitalsWithRealTimeBeds);
    } catch (error) {
      console.error('Nearby hospitals error:', error);
      res.status(500).json({ message: 'Failed to get nearby hospitals' });
    }
  });

  // Update hospital bed status endpoint
  app.put('/api/hospitals/:id/beds', authenticateToken, async (req, res) => {
    try {
      const hospitalId = parseInt(req.params.id);
      const { totalBeds, availableBeds, icuBeds, availableIcuBeds } = req.body;
      
      const updatedHospital = await storage.updateHospitalBeds(
        hospitalId, 
        totalBeds, 
        availableBeds, 
        icuBeds, 
        availableIcuBeds
      );
      
      // Broadcast bed status update to all connected clients
      connectedClients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: 'hospital_bed_update',
            data: {
              hospitalId,
              totalBeds,
              availableBeds,
              icuBeds,
              availableIcuBeds
            }
          }));
        }
      });
      
      res.json(updatedHospital);
    } catch (error) {
      console.error('Error updating hospital beds:', error);
      res.status(500).json({ message: 'Failed to update hospital beds' });
    }
  });

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create basic user first
      const user = await storage.createUser({
        username: data.username,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      });

      // Create role-specific profiles
      let profileData: any = {};
      let tokenPayload: any = { id: user.id, username: user.username, role: user.role };

      if (data.role === 'hospital' && data.hospitalName) {
        // Create hospital profile
        const hospital = await storage.createHospital({
          userId: user.id,
          name: data.hospitalName,
          address: data.hospitalAddress || '',
          latitude: "0",
          longitude: "0",
          phone: data.phone,
          totalBeds: data.totalBeds || 0,
          availableBeds: data.totalBeds || 0,
          icuBeds: data.icuBeds || 0,
          availableIcuBeds: data.icuBeds || 0,
          emergencyServices: Array.isArray(data.emergencyServices) ? data.emergencyServices.join(',') : (data.emergencyServices || '')
        });
        profileData.hospitalProfile = hospital;
        tokenPayload.hospitalId = hospital.id;
      } else if (data.role === 'ambulance') {
        // Create ambulance profile with auto-generated vehicle number and location
        console.log('🚑 Ambulance registration data:', {
          selectedHospitalId: data.selectedHospitalId,
          operatorPhone: data.phone,
          licenseNumber: data.licenseNumber,
          certification: data.certification,
          equipmentLevel: data.equipmentLevel
        });
        
        if (data.selectedHospitalId) {
          try {
            const ambulance = await storage.createAmbulanceWithAutoGeneration(
              user.id,
              data.selectedHospitalId,
              data.operatorPhone || '',
              data.licenseNumber || '',
              data.certification || '',
              data.equipmentLevel || ''
            );
            profileData.ambulanceProfile = ambulance;
            tokenPayload.ambulanceId = ambulance.id;
            console.log(`✅ Created ambulance ${ambulance.vehicleNumber} for user ${user.username} assigned to hospital ID ${data.selectedHospitalId}`);
          } catch (error) {
            console.error('❌ Failed to create ambulance profile:', error);
            let errorMessage = 'Unknown error';
            if (error instanceof Error) {
              errorMessage = error.message;
            }
            throw new Error('Failed to create ambulance profile: ' + errorMessage);
          }
        } else {
          console.log('⚠️ No hospital selected for ambulance registration');
          throw new Error('Hospital selection is required for ambulance registration');
        }
      }

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

      res.json({ 
        token, 
        user: { 
          ...user, 
          password: undefined,
          ...profileData
        } 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(data.username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(data.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Get user with profile data
      const userWithProfile = await storage.getUserWithProfile(user.id);
      
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // If ambulance user, ensure all ambulances have static locations
      if (userWithProfile && userWithProfile.role === 'ambulance' && userWithProfile.ambulanceProfile) {
        try {
          // Check if any ambulance needs location assignment
          const allAmbulances = await storage.getAvailableAmbulances();
          const ambulancesNeedingLocation = allAmbulances.filter(amb => {
            const lat = parseFloat(amb.currentLatitude || '0');
            const lng = parseFloat(amb.currentLongitude || '0');
            return lat === 0 && lng === 0;
          });

          if (ambulancesNeedingLocation.length > 0) {
            // Try to get patient location from recent emergency requests
            const recentRequests = await storage.getActiveEmergencyRequests();
            let referenceLocation = { lat: 22.7196, lng: 75.8577 }; // Default to Indore

            // Use the most recent patient location if available
            if (recentRequests.length > 0) {
              const latestRequest = recentRequests[0];
              if (latestRequest.patientLatitude && latestRequest.patientLongitude) {
                referenceLocation = {
                  lat: parseFloat(latestRequest.patientLatitude),
                  lng: parseFloat(latestRequest.patientLongitude)
                };
                console.log(`Using patient location as reference: ${referenceLocation.lat}, ${referenceLocation.lng}`);
              }
            }

            // Assign locations to all ambulances that need them
            for (const ambulance of ambulancesNeedingLocation) {
              const randomLocation = generateRandomLocationInRadius(
                referenceLocation.lat, 
                referenceLocation.lng, 
                1.5, 
                2.5
              );
              
              await storage.updateAmbulanceLocation(
                ambulance.id,
                randomLocation.latitude,
                randomLocation.longitude
              );
              console.log(`Assigned location to ${ambulance.vehicleNumber}: ${randomLocation.latitude}, ${randomLocation.longitude}`);
            }
          }
        } catch (error) {
          console.error('Failed to assign ambulance locations:', error);
        }
      }

      res.json({ 
        token, 
        user: { 
          ...(userWithProfile || user), 
          password: undefined 
        } 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Login failed' });
    }
  });

  app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUserWithProfile(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Removed duplicate bed-status route - using the authenticated one later in the file

  // Hospital bed reseeding endpoint (independent operation)
  app.post('/api/hospitals/:id/reseed-beds', async (req, res) => {
    try {
      const identifier = parseInt(req.params.id);
      console.log(`🔄 Reseeding beds for identifier: ${identifier}`);
      
      const { seedIndependentHospital } = await import('./hospital-independent-seeder');
      const bedCount = await seedIndependentHospital(identifier);
      
      res.json({ 
        success: true, 
        message: `Successfully reseeded ${bedCount} beds`,
        bedCount 
      });
    } catch (error) {
      console.error('Error reseeding beds:', error);
      res.status(500).json({ error: 'Failed to reseed beds' });
    }
  });

  // Assign patient to bed endpoint
  app.post('/api/emergency/assign-bed', authenticateToken, requireRole(['hospital']), async (req, res) => {
    try {
      const { emergencyRequestId, bedNumber } = req.body;
      
      console.log('Assigning patient to bed:', { emergencyRequestId, bedNumber });
      
      const updatedRequest = await storage.assignPatientToBed(emergencyRequestId, bedNumber);
      
      // Broadcast update to all connected clients
      broadcastToAll({
        type: 'patient_assigned_to_bed',
        data: {
          emergencyRequestId,
          bedNumber,
          request: updatedRequest
        }
      });
      
      res.json({ 
        message: 'Patient successfully assigned to bed',
        request: updatedRequest 
      });
    } catch (error) {
      console.error('Failed to assign patient to bed:', error);
      res.status(500).json({ message: 'Failed to assign patient to bed' });
    }
  });

  // Emergency Request routes
  app.post('/api/emergency/request', authenticateToken, requireRole(['patient']), async (req, res) => {
    try {
      const { latitude, longitude, address, patientCondition, notes } = req.body;
      
      // For demonstration purposes, offset the patient location slightly 
      // This simulates real-world scenario where patient and ambulance are at different locations
      const offsetLat = parseFloat(latitude) + 0.005; // ~500 meters offset
      const offsetLng = parseFloat(longitude) + 0.005;
      
      console.log('Creating emergency request:', {
        original: { lat: latitude, lng: longitude },
        offset: { lat: offsetLat, lng: offsetLng },
        patientCondition
      });
      
      const emergencyRequest = await storage.createEmergencyRequest({
        patientId: req.user.id,
        latitude: offsetLat.toString(),
        longitude: offsetLng.toString(),
        address: address || `Emergency at ${offsetLat.toFixed(6)}, ${offsetLng.toFixed(6)}`,
        patientCondition,
        notes,
        priority: 'high', // Default to high for all emergency requests
        status: 'pending'
      });

      // Broadcast to all available ambulances
      broadcastToRole('ambulance', {
        type: 'new_emergency_request',
        data: emergencyRequest
      });

      res.json(emergencyRequest);
    } catch (error) {
      console.error('Emergency request creation error:', error);
      res.status(500).json({ message: 'Failed to create emergency request' });
    }
  });

  app.get('/api/emergency/requests', authenticateToken, async (req, res) => {
    try {
      let requests;
      
      switch (req.user.role) {
        case 'patient':
          requests = await storage.getEmergencyRequestsByPatient(req.user.id);
          
          // Enhance requests with ambulance contact info for accepted/dispatched requests
          const enhancedRequests = await Promise.all(requests.map(async (request) => {
            if (request.ambulanceId && ['accepted', 'dispatched', 'en_route', 'at_scene', 'transporting'].includes(request.status)) {
              try {
                const ambulance = await storage.getAmbulance(request.ambulanceId);
                if (ambulance && ambulance.operatorPhone) {
                  return {
                    ...request,
                    ambulanceContact: ambulance.operatorPhone, // Using operatorPhone field for correct contact information
                    ambulanceVehicleNumber: ambulance.vehicleNumber
                  };
                }
              } catch (error) {
                console.error('Error fetching ambulance details:', error);
              }
            }
            return request;
          }));
          
          requests = enhancedRequests;
          break;
        case 'ambulance':
          // Get ambulance ID from user profile
          const ambulanceProfile = await storage.getAmbulanceByOperatorId(req.user.id);
          if (!ambulanceProfile) {
            return res.status(404).json({ message: 'Ambulance profile not found' });
          }
          
          // Get active request assigned to this ambulance (persistent tracking)
          const activeRequest = await storage.getActiveRequestForAmbulance(ambulanceProfile.id);
          
          if (activeRequest) {
            // Return the active request along with pending requests
            const allActiveRequests = await storage.getActiveEmergencyRequests();
            const pendingRequests = allActiveRequests.filter(req => req.status === 'pending');
            
            // Combine active request with pending requests, ensuring no duplicates
            const combinedRequests = [activeRequest, ...pendingRequests.filter(req => req.id !== activeRequest.id)];
            requests = combinedRequests;
          } else {
            // No active request, just return pending requests
            requests = await storage.getActiveEmergencyRequests();
          }
          break;
        case 'hospital':
          requests = await storage.getActiveEmergencyRequests();
          break;
        default:
          return res.status(403).json({ message: 'Unauthorized' });
      }

      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch emergency requests' });
    }
  });

  app.put('/api/emergency/request/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      console.log('Updating emergency request:', { id, updates });
      
      // Special handling for ambulance acceptance to prevent race conditions
      if (updates.status === 'accepted' && updates.ambulanceId) {
        // First check if the request is still available for acceptance
        const currentRequest = await storage.getEmergencyRequest(parseInt(id));
        
        if (!currentRequest) {
          return res.status(404).json({ message: 'Emergency request not found' });
        }
        
        if (currentRequest.status !== 'pending') {
          return res.status(409).json({ 
            message: 'Request already assigned or no longer available',
            currentStatus: currentRequest.status
          });
        }
        
        // Also update ambulance status to busy
        try {
          await storage.updateAmbulance(updates.ambulanceId, { status: 'busy' });
          console.log('Updated ambulance status to busy');
        } catch (error) {
          console.error('Error updating ambulance status:', error);
        }
      }
      
      const updatedRequest = await storage.updateEmergencyRequest(parseInt(id), updates);
      
      console.log('Updated request result:', updatedRequest);
      
      // If request is being cancelled, also update ambulance status to available
      if (updates.status === 'cancelled' && updatedRequest.ambulanceId) {
        try {
          await storage.updateAmbulance(updatedRequest.ambulanceId, { status: 'available' });
          console.log('Updated ambulance status to available after cancellation');
        } catch (error) {
          console.error('Error updating ambulance status after cancellation:', error);
        }
      }
      
      // Broadcast update to relevant parties
      broadcastToRole('patient', {
        type: 'emergency_request_updated',
        data: updatedRequest
      });
      
      broadcastToRole('hospital', {
        type: 'emergency_request_updated',
        data: updatedRequest
      });
      
      broadcastToRole('ambulance', {
        type: 'emergency_request_updated',
        data: updatedRequest
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error('Failed to update emergency request:', error);
      res.status(500).json({ message: 'Failed to update emergency request' });
    }
  });

  // Delete emergency request
  app.delete('/api/emergency/request/:id', authenticateToken, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Get the request to verify ownership
      const request = await storage.getEmergencyRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: 'Emergency request not found' });
      }
      
      // Only allow deletion by the patient who created it or admin roles
      if (request.patientId !== userId && !['hospital', 'ambulance'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Unauthorized to delete this request' });
      }
      
      // Mark as deleted instead of actual deletion to preserve audit trail
      const deletedRequest = await storage.updateEmergencyRequest(requestId, { 
        status: 'deleted',
        notes: (request.notes || '') + ' [DELETED]'
      });
      
      res.json({ message: 'Emergency request deleted successfully' });
    } catch (error) {
      console.error('Delete emergency request error:', error);
      res.status(500).json({ message: 'Failed to delete emergency request' });
    }
  });

  // New endpoint for updating emergency requests with different path for frontend compatibility
  app.put('/api/emergency/requests/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      console.log('Updating emergency request (new endpoint):', { id, updates });
      
      const updatedRequest = await storage.updateEmergencyRequest(parseInt(id), updates);
      
      console.log('Updated request result:', updatedRequest);
      
      // If request is being cancelled, also update ambulance status to available
      if (updates.status === 'cancelled' && updatedRequest.ambulanceId) {
        try {
          await storage.updateAmbulance(updatedRequest.ambulanceId, { status: 'available' });
          console.log('Updated ambulance status to available after cancellation');
        } catch (error) {
          console.error('Error updating ambulance status after cancellation:', error);
        }
      }
      
      // Broadcast update to all connected clients
      broadcastToAll({
        type: 'emergency_request_updated',
        data: updatedRequest
      });
      
      res.json(updatedRequest);
    } catch (error) {
      console.error('Emergency request update error:', error);
      res.status(500).json({ message: 'Failed to update emergency request' });
    }
  });

  // PATCH endpoint for emergency requests (for enhanced patient dashboard)
  app.patch('/api/emergency/request/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      console.log('PATCH emergency request:', { id, updates });
      
      const updatedRequest = await storage.updateEmergencyRequest(parseInt(id), updates);
      
      console.log('PATCH request result:', updatedRequest);
      
      // If request is being cancelled, also update ambulance status to available
      if (updates.status === 'cancelled' && updatedRequest.ambulanceId) {
        try {
          await storage.updateAmbulance(updatedRequest.ambulanceId, { status: 'available' });
          console.log('Updated ambulance status to available after cancellation');
        } catch (error) {
          console.error('Error updating ambulance status after cancellation:', error);
        }
      }
      
      // Broadcast update to all connected clients
      broadcastToAll({
        type: 'emergency_request_updated',
        data: updatedRequest
      });
      
      res.json(updatedRequest);
    } catch (error) {
      console.error('PATCH emergency request error:', error);
      res.status(500).json({ message: 'Failed to update emergency request' });
    }
  });

  // Get available wards endpoint
  app.get('/api/hospitals/:hospitalId/available-wards', authenticateToken, async (req, res) => {
    try {
      const { hospitalId } = req.params;
      const hospitalIdNum = parseInt(hospitalId);
      
      const bedStatusLogs = await storage.getBedStatusByHospital(hospitalIdNum);
      
      // Group beds by ward and count available ones
      const wardMap = new Map();
      
      bedStatusLogs.forEach(bed => {
        const wardName = bed.wardDescription;
        console.log('Processing bed:', bed.bedNumber, 'Ward:', wardName, 'Status:', bed.status);
        
        if (!wardName) {
          console.log('Skipping bed with no ward description:', bed.bedNumber);
          return;
        }
        
        if (!wardMap.has(wardName)) {
          wardMap.set(wardName, { available: 0, total: 0 });
        }
        
        const wardData = wardMap.get(wardName);
        wardData.total++;
        
        if (bed.status === 'available') {
          wardData.available++;
        }
      });
      
      // Convert to array and filter only wards with available beds
      const availableWards = Array.from(wardMap.entries())
        .filter(([_, data]) => data.available > 0)
        .map(([wardName, data]) => ({
          wardName,
          availableBeds: data.available,
          totalBeds: data.total
        }));
      
      console.log(`Found ${availableWards.length} wards with available beds for hospital ${hospitalId}:`, availableWards);
      res.json(availableWards);
    } catch (error) {
      console.error('Failed to get available wards:', error);
      res.status(500).json({ message: 'Failed to get available wards' });
    }
  });

  // Auto-assign patient to ward endpoint
  app.post('/api/hospitals/:hospitalId/assign-patient-to-ward', authenticateToken, async (req, res) => {
    try {
      const { hospitalId } = req.params;
      const { wardName, patientName, requestId } = req.body;
      
      console.log('Auto-assigning patient to ward:', { hospitalId, wardName, patientName, requestId });
      
      const hospitalIdNum = parseInt(hospitalId);
      const bedStatusLogs = await storage.getBedStatusByHospital(hospitalIdNum);
      
      // Find the first available bed in the specified ward
      const availableBed = bedStatusLogs.find(bed => 
        bed.wardDescription === wardName && bed.status === 'available'
      );
      
      if (!availableBed) {
        return res.status(404).json({ message: `No available beds found in ${wardName} ward` });
      }
      
      // Update existing bed status to mark as occupied
      const updatedBed = await storage.updateBedStatus(
        availableBed.hospitalId,
        availableBed.bedNumber,
        'occupied',
        patientName
      );
      
      console.log('Patient assigned to bed:', updatedBed.bedNumber, 'in ward:', wardName);
      
      // Update emergency request status to completed with assigned bed
      await storage.updateEmergencyRequest(parseInt(requestId), { 
        status: 'completed',
        hospitalId: hospitalIdNum,
        assignedBedNumber: availableBed.bedNumber
      });
      
      // Broadcast updates
      broadcastToRole('hospital', {
        type: 'bed_status_updated',
        data: updatedBed
      });
      
      broadcastToRole('patient', {
        type: 'emergency_request_updated',
        data: { id: requestId, status: 'completed' }
      });
      
      res.json({ 
        bed: updatedBed,
        message: `Patient ${patientName} assigned to bed ${availableBed.bedNumber} in ${wardName} ward`
      });
    } catch (error) {
      console.error('Patient assignment error:', error);
      res.status(500).json({ message: 'Failed to assign patient to ward' });
    }
  });

  // Bed assignment endpoint (legacy - for direct bed assignment)
  app.put('/api/hospitals/beds/:bedNumber/assign', authenticateToken, async (req, res) => {
    try {
      const { bedNumber } = req.params;
      const { status, patientName } = req.body;
      
      console.log('Assigning bed:', { bedNumber, status, patientName });
      
      // Determine hospital ID based on user or default to current hospital
      const hospitalId = req.user.hospitalId || 4; // Default to Bombay Hospital for testing
      
      // Find the bed by bedNumber and update it
      const bedStatusLogs = await storage.getBedStatusByHospital(hospitalId);
      const existingBed = bedStatusLogs.find(bed => bed.bedNumber === bedNumber);
      
      if (!existingBed) {
        return res.status(404).json({ message: 'Bed not found' });
      }
      
      // Update existing bed status instead of creating new entry
      const updatedBed = await storage.updateBedStatus(
        existingBed.hospitalId,
        bedNumber,
        status,
        patientName || null
      );
      
      console.log('Bed assigned successfully:', updatedBed);
      
      // Broadcast bed update to all connected hospital users
      broadcastToRole('hospital', {
        type: 'bed_status_updated',
        data: updatedBed
      });
      
      res.json(updatedBed);
    } catch (error) {
      console.error('Bed assignment error:', error);
      res.status(500).json({ message: 'Failed to assign bed' });
    }
  });

  // Ambulance routes
  app.get('/api/ambulances/nearby', authenticateToken, async (req, res) => {
    try {
      const { lat, lng } = req.query;
      const radius = 0.1; // ~10km radius
      
      const ambulances = await storage.getNearbyAmbulances(
        parseFloat(lat as string),
        parseFloat(lng as string),
        radius
      );

      res.json(ambulances);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch nearby ambulances' });
    }
  });

  app.get('/api/ambulances/available', authenticateToken, async (req, res) => {
    try {
      const ambulances = await storage.getAvailableAmbulances();
      res.json(ambulances);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch available ambulances' });
    }
  });

  app.put('/api/ambulances/:id/location', authenticateToken, requireRole(['ambulance']), async (req, res) => {
    try {
      const { id } = req.params;
      const { lat, lng } = req.body;
      
      const ambulance = await storage.updateAmbulanceLocation(parseInt(id), lat, lng);
      
      // Broadcast location update
      broadcastToRole('hospital', {
        type: 'ambulance_location_update',
        ambulanceId: parseInt(id),
        lat,
        lng
      });

      res.json(ambulance);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update ambulance location' });
    }
  });

  // Hospital routes
  app.get('/api/hospitals/available', authenticateToken, async (req, res) => {
    try {
      const hospitals = await storage.getAllHospitals();
      res.json(hospitals);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch hospitals' });
    }
  });

  app.get('/api/hospitals/nearby', authenticateToken, async (req, res) => {
    try {
      const { lat, lng } = req.query;
      const radius = 0.1; // ~10km radius
      
      const hospitals = await storage.getNearbyHospitals(
        parseFloat(lat as string),
        parseFloat(lng as string),
        radius
      );

      res.json(hospitals);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch nearby hospitals' });
    }
  });

  app.post('/api/hospitals/update-status', authenticateToken, requireRole(['hospital']), async (req, res) => {
    try {
      const { hospitalId, emergencyStatus, totalBeds, availableBeds, icuBeds, availableIcuBeds } = req.body;
      
      const hospital = await storage.updateHospital(hospitalId, {
        emergencyStatus,
        totalBeds,
        availableBeds,
        icuBeds,
        availableIcuBeds
      });

      // Broadcast hospital status update
      broadcastToRole('ambulance', {
        type: 'hospital_status_update',
        data: hospital
      });

      res.json(hospital);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update hospital status' });
    }
  });

  // Hospital bed management endpoint
  app.put('/api/hospitals/:hospitalId/beds', authenticateToken, requireRole(['hospital']), async (req, res) => {
    try {
      const hospitalId = parseInt(req.params.hospitalId);
      const { totalBeds, availableBeds, icuBeds, availableIcuBeds } = req.body;
      
      const hospital = await storage.updateHospital(hospitalId, {
        totalBeds,
        availableBeds,
        icuBeds,
        availableIcuBeds
      });

      // Broadcast bed update to all connected clients via WebSocket
      broadcastToAll({
        type: 'hospital_bed_update',
        data: {
          hospitalId,
          totalBeds,
          availableBeds,
          icuBeds,
          availableIcuBeds,
          timestamp: Date.now()
        }
      });

      res.json(hospital);
    } catch (error) {
      console.error('Failed to update hospital beds:', error);
      res.status(500).json({ message: 'Failed to update hospital bed status' });
    }
  });

  // Get bed status logs for a hospital (supports both hospital ID and user ID)
  app.get('/api/hospitals/:hospitalId/bed-status', authenticateToken, async (req, res) => {
    try {
      const identifier = parseInt(req.params.hospitalId);
      console.log(`🏥 Fetching bed status for identifier: ${identifier}`);
      
      // Try to resolve hospital ID from identifier (supports both hospital ID and user ID)
      const hospital = await storage.getHospitalByIdOrUserId(identifier);
      if (!hospital) {
        return res.status(404).json({ message: 'Hospital not found' });
      }
      
      console.log(`🏥 Resolved to hospital ID: ${hospital.id} (${hospital.name})`);
      const bedStatus = await storage.getBedStatusByHospital(hospital.id);
      console.log(`🛏️ Found ${bedStatus.length} bed records for hospital ${hospital.name}`);
      res.json(bedStatus);
    } catch (error) {
      console.error('Bed status fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch bed status', error: error.message });
    }
  });

  // Communication routes
  app.get('/api/communications/:emergencyRequestId', authenticateToken, async (req, res) => {
    try {
      const { emergencyRequestId } = req.params;
      const communications = await storage.getCommunicationsByEmergencyRequest(parseInt(emergencyRequestId));
      res.json(communications);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch communications' });
    }
  });

  // Admin routes - Full database access
  app.get('/api/admin/table/:tableName', authenticateToken, async (req, res) => {
    try {
      // Check admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { tableName } = req.params;
      const validTables = ['users', 'hospitals', 'ambulances', 'emergency_requests', 'bed_status_logs', 'communications'];
      
      if (!validTables.includes(tableName)) {
        return res.status(400).json({ message: 'Invalid table name' });
      }

      console.log(`🔍 Admin fetching table: ${tableName}`);

      // Get table structure
      const columns = await db.execute(sql.raw(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' AND table_schema = 'public'
        ORDER BY ordinal_position
      `));

      // Get table data with ordering
      const data = await db.execute(sql.raw(`
        SELECT * FROM ${tableName} 
        ORDER BY id DESC 
        LIMIT 100
      `));

      // Get total count
      const countResult = await db.execute(sql.raw(`
        SELECT COUNT(*) as count FROM ${tableName}
      `));

      console.log(`📊 Table ${tableName}: ${data.rows.length} rows, ${columns.rows.length} columns`);

      res.json({
        columns: columns.rows.map((row: any) => row.column_name),
        rows: data.rows.map((row: any) => Object.values(row)),
        count: countResult.rows[0].count
      });
    } catch (error) {
      console.error('Admin table fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch table data', error: error.message });
    }
  });

  app.post('/api/admin/sql', authenticateToken, async (req, res) => {
    try {
      // Check admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { query } = req.body;
      console.log('📝 SQL Request body:', req.body);
      console.log('📝 Query received:', query);
      
      if (!query || typeof query !== 'string') {
        console.log('❌ Invalid query:', { query, type: typeof query });
        return res.status(400).json({ message: 'Query is required and must be a string' });
      }

      console.log(`🔍 Admin executing SQL: ${query}`);

      // Allow SELECT, INSERT, UPDATE for admin - but be careful with DELETE/DROP
      const upperQuery = query.toUpperCase().trim();
      
      if (upperQuery.includes('DROP TABLE') || upperQuery.includes('TRUNCATE')) {
        return res.status(400).json({ 
          message: 'DROP TABLE and TRUNCATE operations not allowed in web interface.' 
        });
      }

      const result = await db.execute(sql.raw(query));
      console.log(`✅ SQL executed successfully, ${result.rows.length} rows returned`);
      
      res.json({
        columns: result.fields?.map(field => field.name) || [],
        rows: result.rows.map((row: any) => Object.values(row)),
        count: result.rows.length
      });
    } catch (error) {
      console.error('SQL execution error:', error);
      res.status(500).json({ 
        message: 'SQL execution failed',
        error: error.message 
      });
    }
  });

  // Update record endpoint
  app.put('/api/admin/table/:tableName/:id', authenticateToken, async (req, res) => {
    try {
      // Check admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { tableName, id } = req.params;
      const updateData = req.body;
      const validTables = ['users', 'hospitals', 'ambulances', 'emergency_requests', 'bed_status_logs', 'communications'];
      
      if (!validTables.includes(tableName)) {
        return res.status(400).json({ message: 'Invalid table name' });
      }

      console.log(`📝 Admin updating record: ${tableName} ID ${id}`, updateData);

      // Build dynamic UPDATE query
      const setClause = Object.keys(updateData)
        .map(key => `${key} = $${Object.keys(updateData).indexOf(key) + 1}`)
        .join(', ');
      
      const values = Object.values(updateData);
      
      const updateQuery = `UPDATE ${tableName} SET ${setClause} WHERE id = $${values.length + 1}`;
      
      await db.execute(sql.raw(updateQuery, [...values, id]));

      console.log(`✅ Updated record in ${tableName}`);

      res.json({ message: 'Record updated successfully' });
    } catch (error) {
      console.error('Update error:', error);
      res.status(500).json({ message: 'Failed to update record', error: error.message });
    }
  });

  app.delete('/api/admin/table/:tableName/:id', authenticateToken, async (req, res) => {
    try {
      // Check admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { tableName, id } = req.params;
      const validTables = ['users', 'hospitals', 'ambulances', 'emergency_requests', 'bed_status_logs', 'communications'];
      
      if (!validTables.includes(tableName)) {
        return res.status(400).json({ message: 'Invalid table name' });
      }

      // Prevent deletion of critical records
      if (tableName === 'users' && req.user.id.toString() === id) {
        return res.status(400).json({ message: 'Cannot delete your own admin account' });
      }

      console.log(`🗑️ Admin deleting record: ${tableName} ID ${id}`);

      const result = await db.execute(sql.raw(`
        DELETE FROM ${tableName} 
        WHERE id = ${id}
      `));

      console.log(`✅ Deleted record from ${tableName}`);

      res.json({ message: 'Record deleted successfully' });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ message: 'Failed to delete record', error: error.message });
    }
  });

  return httpServer;
}
