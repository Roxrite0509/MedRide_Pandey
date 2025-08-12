export const EMERGENCY_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export const EMERGENCY_STATUSES = {
  PENDING: 'pending',
  DISPATCHED: 'dispatched',
  EN_ROUTE: 'en_route',
  AT_SCENE: 'at_scene',
  TRANSPORTING: 'transporting',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const AMBULANCE_STATUSES = {
  AVAILABLE: 'available',
  DISPATCHED: 'dispatched',
  EN_ROUTE: 'en_route',
  AT_SCENE: 'at_scene',
  TRANSPORTING: 'transporting',
  MAINTENANCE: 'maintenance',
} as const;

export const HOSPITAL_STATUSES = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  FULL: 'full',
} as const;

export const USER_ROLES = {
  PATIENT: 'patient',
  AMBULANCE: 'ambulance',
  HOSPITAL: 'hospital',
} as const;

export const BED_TYPES = {
  GENERAL: 'general',
  ICU: 'icu',
  TRAUMA: 'trauma',
} as const;

export const BED_STATUSES = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  MAINTENANCE: 'maintenance',
  RESERVED: 'reserved',
} as const;

export const COLORS = {
  PRIMARY: 'hsl(207, 90%, 54%)',
  EMERGENCY: 'hsl(0, 84%, 60%)',
  SUCCESS: 'hsl(142, 76%, 36%)',
  WARNING: 'hsl(38, 92%, 50%)',
  MUTED: 'hsl(210, 40%, 98%)',
} as const;

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
