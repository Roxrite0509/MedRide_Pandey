export interface User {
  id: number;
  username: string;
  email: string;
  role: 'patient' | 'ambulance' | 'hospital';
  firstName?: string;
  lastName?: string;
  phone?: string;
  profileImageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Hospital {
  id: number;
  name: string;
  address: string;
  phone?: string;
  latitude?: string;
  longitude?: string;
  totalBeds: number;
  availableBeds: number;
  icuBeds: number;
  availableIcuBeds: number;
  emergencyStatus: 'available' | 'busy' | 'full';
  createdAt: string;
  updatedAt: string;
}

export interface Ambulance {
  id: number;
  vehicleNumber: string;
  operatorId?: number;
  hospitalId?: number;
  currentLatitude?: string;
  currentLongitude?: string;
  status: 'available' | 'dispatched' | 'en_route' | 'at_scene' | 'transporting';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyRequest {
  id: number;
  patientId?: number;
  ambulanceId?: number;
  hospitalId?: number;
  latitude: string;
  longitude: string;
  address?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'dispatched' | 'en_route' | 'at_scene' | 'transporting' | 'completed' | 'cancelled';
  patientCondition?: string;
  notes?: string;
  requestedAt: string;
  dispatchedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BedStatusLog {
  id: number;
  hospitalId: number;
  bedType: 'general' | 'icu' | 'trauma';
  bedNumber: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  patientId?: number;
  updatedBy?: number;
  createdAt: string;
}

export interface Communication {
  id: number;
  emergencyRequestId?: number;
  senderId: number;
  receiverId?: number;
  message: string;
  messageType: 'text' | 'system' | 'location';
  isRead: boolean;
  createdAt: string;
}

export interface WebSocketMessage {
  type: 'new_emergency_request' | 'emergency_request_updated' | 'ambulance_location_update' | 'hospital_status_update' | 'new_message' | 'location_update' | 'chat_message';
  data?: any;
  [key: string]: any;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    altitudeAccuracy?: number;
    heading?: number;
    speed?: number;
  };
  timestamp: number;
}
