import { db } from './db';
import { bedStatusLogs, hospitals } from '@shared/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * Hospital Bed Management System
 * Provides safe, scalable bed seeding for multiple hospitals without data conflicts
 */

interface HospitalBedConfig {
  hospitalId: number;
  hospitalName: string;
  bedConfiguration: Record<string, {
    type: 'icu' | 'general';
    count: number;
    prefix: string;
    name: string;
    floor?: number;
  }>;
  patientNames: string[];
  occupancyRate?: number; // Percentage of beds that should be occupied (default: 57.5%)
}

// Registry of all managed hospitals
const MANAGED_HOSPITALS: HospitalBedConfig[] = [
  {
    hospitalId: 2,
    hospitalName: 'Apollo Hospital Indore',
    occupancyRate: 0.575,
    patientNames: [
      'Rajesh Kumar Singh', 'Priya Sharma', 'Amit Patel', 'Sunita Verma', 'Vikram Singh Rajput',
      'Meera Gupta', 'Anil Agarwal', 'Kavita Jain', 'Suresh Chandra', 'Pooja Mishra',
      'Rohit Sinha', 'Anita Yadav', 'Manoj Tiwari', 'Geeta Devi', 'Ashok Kumar',
      'Sushma Bhargava', 'Deepak Saxena', 'Ritu Malhotra', 'Vinod Khanna', 'Shanti Agarwal'
    ],
    bedConfiguration: {
      'CICU': { type: 'icu', count: 12, prefix: 'CICU', name: 'Cardiac Intensive Care', floor: 3 },
      'NICU': { type: 'icu', count: 8, prefix: 'NICU', name: 'Neuro Intensive Care', floor: 3 },
      'SICU': { type: 'icu', count: 10, prefix: 'SICU', name: 'Surgical Intensive Care', floor: 3 },
      'PICU': { type: 'icu', count: 6, prefix: 'PICU', name: 'Pediatric Intensive Care', floor: 2 },
      'MICU': { type: 'icu', count: 8, prefix: 'MICU', name: 'Medical Intensive Care', floor: 4 },
      'CAR': { type: 'general', count: 15, prefix: 'CAR', name: 'Cardiology Ward', floor: 1 },
      'NEU': { type: 'general', count: 12, prefix: 'NEU', name: 'Neurology Ward', floor: 2 },
      'ONC': { type: 'general', count: 18, prefix: 'ONC', name: 'Oncology Ward', floor: 2 },
      'ORT': { type: 'general', count: 14, prefix: 'ORT', name: 'Orthopedic Ward', floor: 1 },
      'GAS': { type: 'general', count: 10, prefix: 'GAS', name: 'Gastroenterology Ward', floor: 1 },
      'URO': { type: 'general', count: 8, prefix: 'URO', name: 'Urology Ward', floor: 1 },
      'GEN': { type: 'general', count: 19, prefix: 'GEN', name: 'General Medicine Ward', floor: 1 }
    }
  },
  {
    hospitalId: 3,
    hospitalName: 'CARE CHL Hospital Indore',
    occupancyRate: 0.575,
    patientNames: [
      'Arjun Mehta', 'Shreya Kapoor', 'Kiran Chopra', 'Anshuman Sengar', 'Divya Nair',
      'Raghav Malhotra', 'Tanvi Shah', 'Nikhil Bansal', 'Priyanka Thakur', 'Akash Agarwal',
      'Ritika Jain', 'Varun Sharma', 'Nisha Gupta', 'Rohit Verma', 'Sneha Patel',
      'Vishal Singh', 'Komal Yadav', 'Gaurav Kumar', 'Neha Mishra', 'Sachin Tiwari'
    ],
    bedConfiguration: {
      'CICU': { type: 'icu', count: 8, prefix: 'CICU', name: 'Cardiac Intensive Care', floor: 3 },
      'NICU': { type: 'icu', count: 6, prefix: 'NICU', name: 'Neuro Intensive Care', floor: 3 },
      'SICU': { type: 'icu', count: 8, prefix: 'SICU', name: 'Surgical Intensive Care', floor: 3 },
      'PICU': { type: 'icu', count: 4, prefix: 'PICU', name: 'Pediatric Intensive Care', floor: 2 },
      'MICU': { type: 'icu', count: 4, prefix: 'MICU', name: 'Medical Intensive Care', floor: 4 },
      'CAR': { type: 'general', count: 12, prefix: 'CAR', name: 'Cardiology Ward', floor: 1 },
      'NEU': { type: 'general', count: 10, prefix: 'NEU', name: 'Neurology Ward', floor: 2 },
      'ONC': { type: 'general', count: 12, prefix: 'ONC', name: 'Oncology Ward', floor: 2 },
      'ORT': { type: 'general', count: 10, prefix: 'ORT', name: 'Orthopedic Ward', floor: 1 },
      'GAS': { type: 'general', count: 8, prefix: 'GAS', name: 'Gastroenterology Ward', floor: 1 },
      'PED': { type: 'general', count: 8, prefix: 'PED', name: 'Pediatric Ward', floor: 2 },
      'SUR': { type: 'general', count: 10, prefix: 'SUR', name: 'General Surgery Ward', floor: 1 }
    }
  },
  {
    hospitalId: 4,
    hospitalName: 'Bombay Hospital Indore',
    occupancyRate: 0.575,
    patientNames: [
      'Sunil Deshmukh', 'Mangala Patil', 'Ramesh Kulkarni', 'Shobha Joshi', 'Ganesh Pawar',
      'Sunanda Bhosale', 'Pravin Jadhav', 'Madhuri Shinde', 'Dattatray More', 'Sushma Kale',
      'Mahesh Deshpande', 'Vaishali Naik', 'Santosh Gaikwad', 'Rekha Sawant', 'Vijay Kadam',
      'Lata Mane', 'Ashish Salunkhe', 'Kaveri Ranade', 'Ravi Thakur', 'Nanda Joshi'
    ],
    bedConfiguration: {
      'CICU': { type: 'icu', count: 10, prefix: 'CICU', name: 'Cardiac Intensive Care', floor: 3 },
      'NICU': { type: 'icu', count: 8, prefix: 'NICU', name: 'Neuro Intensive Care', floor: 3 },
      'SICU': { type: 'icu', count: 10, prefix: 'SICU', name: 'Surgical Intensive Care', floor: 3 },
      'PICU': { type: 'icu', count: 5, prefix: 'PICU', name: 'Pediatric Intensive Care', floor: 2 },
      'MICU': { type: 'icu', count: 5, prefix: 'MICU', name: 'Medical Intensive Care', floor: 4 },
      'CAR': { type: 'general', count: 14, prefix: 'CAR', name: 'Cardiology Ward', floor: 1 },
      'NEU': { type: 'general', count: 12, prefix: 'NEU', name: 'Neurology Ward', floor: 2 },
      'ONC': { type: 'general', count: 15, prefix: 'ONC', name: 'Oncology Ward', floor: 2 },
      'ORT': { type: 'general', count: 12, prefix: 'ORT', name: 'Orthopedic Ward', floor: 1 },
      'GAS': { type: 'general', count: 10, prefix: 'GAS', name: 'Gastroenterology Ward', floor: 1 },
      'PED': { type: 'general', count: 8, prefix: 'PED', name: 'Pediatric Ward', floor: 2 },
      'SUR': { type: 'general', count: 6, prefix: 'SUR', name: 'General Surgery Ward', floor: 1 }
    }
  }
];

/**
 * Seeds beds for all managed hospitals
 * Only clears and re-seeds hospitals that are in the MANAGED_HOSPITALS registry
 */
export async function seedManagedHospitalBeds() {
  console.log('🏥 Starting managed hospital bed seeding...');
  
  const managedHospitalIds = MANAGED_HOSPITALS.map(h => h.hospitalId);
  
  // Only clear beds for hospitals we manage
  if (managedHospitalIds.length > 0) {
    console.log(`🧹 Clearing beds for managed hospitals: ${managedHospitalIds.join(', ')}`);
    await db.delete(bedStatusLogs).where(inArray(bedStatusLogs.hospitalId, managedHospitalIds));
  }
  
  let totalBeds = 0;
  
  for (const hospital of MANAGED_HOSPITALS) {
    console.log(`🏥 Seeding beds for ${hospital.hospitalName} (ID: ${hospital.hospitalId})`);
    const bedCount = await seedHospitalBeds(hospital);
    totalBeds += bedCount;
    console.log(`✅ Seeded ${bedCount} beds for ${hospital.hospitalName}`);
  }
  
  console.log(`🎉 Successfully seeded ${totalBeds} beds across ${MANAGED_HOSPITALS.length} managed hospitals!`);
}

/**
 * Seeds beds for a single hospital configuration
 */
async function seedHospitalBeds(config: HospitalBedConfig): Promise<number> {
  const beds = [];
  let patientIndex = 0;
  const occupancyRate = config.occupancyRate || 0.575;
  
  for (const [wardCode, wardConfig] of Object.entries(config.bedConfiguration)) {
    for (let i = 1; i <= wardConfig.count; i++) {
      const bedNumber = `${wardConfig.prefix}-${i.toString().padStart(2, '0')}`;
      
      // Determine bed status based on occupancy rate
      const isOccupied = Math.random() < occupancyRate;
      const status = isOccupied ? 'occupied' : 'available';
      const patientName = isOccupied ? config.patientNames[patientIndex % config.patientNames.length] : null;
      
      if (isOccupied) {
        patientIndex++;
      }
      
      beds.push({
        hospitalId: config.hospitalId,
        bedType: wardConfig.type,
        bedNumber,
        wardDescription: wardConfig.name,
        floorNumber: wardConfig.floor || 1,
        status,
        patientName,
        patientId: null,
        updatedBy: null
      });
    }
  }
  
  // Insert beds in batches for better performance
  const batchSize = 50;
  for (let i = 0; i < beds.length; i += batchSize) {
    const batch = beds.slice(i, i + batchSize);
    await db.insert(bedStatusLogs).values(batch);
  }
  
  return beds.length;
}

/**
 * Adds a new hospital to the managed hospitals list
 * Use this when adding new hospitals to prevent seeding conflicts
 */
export function registerNewHospital(config: HospitalBedConfig) {
  console.log(`📋 Registering new hospital: ${config.hospitalName} (ID: ${config.hospitalId})`);
  MANAGED_HOSPITALS.push(config);
}

/**
 * Seeds beds for a specific hospital (for individual hospital management)
 * Can identify hospital by either hospital ID or user ID
 */
export async function seedSpecificHospital(identifier: number) {
  let config = MANAGED_HOSPITALS.find(h => h.hospitalId === identifier);
  
  // If not found by hospital ID, try to find by user ID
  if (!config) {
    // Map user ID to hospital ID for lookup
    const userToHospitalMap: Record<number, number> = {
      11: 2, // apollo_admin -> Apollo Hospital
      12: 3, // chl_admin -> CHL Hospital
      13: 4, // bombay_admin -> Bombay Hospital
      97: 5, // vis_admin -> Vishesh Jupiter Hospital
    };
    
    const hospitalId = userToHospitalMap[identifier];
    if (hospitalId) {
      config = MANAGED_HOSPITALS.find(h => h.hospitalId === hospitalId);
    }
  }
  
  if (!config) {
    throw new Error(`Hospital with identifier ${identifier} not found in managed hospitals registry`);
  }
  
  console.log(`🏥 Seeding beds for specific hospital: ${config.hospitalName} (ID: ${config.hospitalId})`);
  
  // Clear existing beds for this hospital only
  await db.delete(bedStatusLogs).where(eq(bedStatusLogs.hospitalId, config.hospitalId));
  
  // Seed new beds
  const bedCount = await seedHospitalBeds(config);
  console.log(`✅ Seeded ${bedCount} beds for ${config.hospitalName}`);
  
  return bedCount;
}

/**
 * Seeds beds for a hospital by user ID (independent operation)
 */
export async function seedHospitalByUserId(userId: number) {
  return await seedSpecificHospital(userId);
}

/**
 * Checks if a hospital is managed by this system
 */
export function isManagedHospital(hospitalId: number): boolean {
  return MANAGED_HOSPITALS.some(h => h.hospitalId === hospitalId);
}

/**
 * Gets list of all managed hospital IDs
 */
export function getManagedHospitalIds(): number[] {
  return MANAGED_HOSPITALS.map(h => h.hospitalId);
}