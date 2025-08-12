// API response types for better type safety
export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'patient' | 'ambulance' | 'hospital' | 'admin';
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
  userId?: number;
  name: string;
  address: string;
  phone?: string;
  latitude: string;
  longitude: string;
  totalBeds: number;
  availableBeds: number;
  icuBeds: number;
  availableIcuBeds: number;
  emergencyStatus: 'available' | 'busy' | 'full';
  emergencyServices: string[];
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
  operatorPhone?: string;
  licenseNumber?: string;
  certification?: string;
  equipmentLevel?: string;
  hospitalAffiliation?: string;
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
  status: 'pending' | 'accepted' | 'dispatched' | 'en_route' | 'at_scene' | 'transporting' | 'completed' | 'cancelled';
  patientCondition?: string;
  notes?: string;
  requestedAt: string;
  dispatchedAt?: string;
  completedAt?: string;
  estimatedArrival?: number;
  patientChosenHospitalId?: number;
  assignedBedNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp?: number;
}

export interface ToastMessage {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}