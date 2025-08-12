import { db } from './db';
import { bedStatusLogs, hospitals } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Independent Hospital Bed Seeding System
 * Each hospital can seed its own beds without affecting others
 */

interface IndependentHospitalConfig {
  hospitalId: number;
  userId: number;
  hospitalName: string;
  bedConfiguration: Record<string, {
    type: 'icu' | 'general';
    count: number;
    prefix: string;
    name: string;
    floor?: number;
  }>;
  patientNames: string[];
  occupancyRate?: number;
}

// Individual hospital configurations - completely independent
const HOSPITAL_CONFIGS: Record<number, IndependentHospitalConfig> = {
  // Apollo Hospital Indore (Hospital ID: 2, User ID: 11)
  2: {
    hospitalId: 2,
    userId: 11,
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

  // CARE CHL Hospital Indore (Hospital ID: 3, User ID: 12)
  3: {
    hospitalId: 3,
    userId: 12,
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

  // Bombay Hospital Indore (Hospital ID: 4, User ID: 13)
  4: {
    hospitalId: 4,
    userId: 13,
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
  },

  // Vishesh Jupiter Hospital (Hospital ID: 5, User ID: 97)
  5: {
    hospitalId: 5,
    userId: 97,
    hospitalName: 'Vishesh Jupiter Hospital',
    occupancyRate: 0.575,
    patientNames: [
      'Rajesh Kumar Singh', 'Priya Sharma', 'Amit Patel', 'Sunita Verma', 'Vikram Singh Rajput',
      'Meera Gupta', 'Anil Agarwal', 'Kavita Jain', 'Suresh Chandra', 'Pooja Mishra',
      'Rohit Sinha', 'Anita Yadav', 'Manoj Tiwari', 'Geeta Devi', 'Ashok Kumar',
      'Sushma Bhargava', 'Deepak Saxena', 'Ritu Malhotra', 'Vinod Khanna', 'Shanti Agarwal',
      'Rakesh Pandey', 'Usha Sharma', 'Sanjay Joshi', 'Lakshmi Iyer', 'Harish Chandra',
      'Kamla Devi', 'Narayan Das', 'Sarita Singh', 'Mukesh Gupta', 'Radha Krishna',
      'Arjun Mehta', 'Shreya Kapoor', 'Kiran Chopra', 'Anshuman Sengar', 'Divya Nair',
      'Raghav Malhotra', 'Tanvi Shah', 'Nikhil Bansal', 'Priyanka Thakur', 'Akash Agarwal',
      'Ritika Jain', 'Varun Sharma', 'Nisha Gupta', 'Rohit Verma', 'Sneha Patel',
      'Vishal Singh'
    ],
    bedConfiguration: {
      'CICU': { type: 'icu', count: 8, prefix: 'CICU', name: 'Cardiac Intensive Care Unit', floor: 3 },
      'NICU': { type: 'icu', count: 6, prefix: 'NICU', name: 'Neuro Intensive Care Unit', floor: 3 },
      'SICU': { type: 'icu', count: 8, prefix: 'SICU', name: 'Surgical Intensive Care Unit', floor: 3 },
      'PICU': { type: 'icu', count: 4, prefix: 'PICU', name: 'Pediatric Intensive Care Unit', floor: 2 },
      'MICU': { type: 'icu', count: 4, prefix: 'MICU', name: 'Medical Intensive Care Unit', floor: 4 },
      'CAR': { type: 'general', count: 8, prefix: 'CAR', name: 'Cardiology Ward', floor: 1 },
      'NEU': { type: 'general', count: 6, prefix: 'NEU', name: 'Neurology Ward', floor: 2 },
      'ONC': { type: 'general', count: 8, prefix: 'ONC', name: 'Oncology Ward', floor: 2 },
      'ORT': { type: 'general', count: 6, prefix: 'ORT', name: 'Orthopedic Ward', floor: 1 },
      'GAS': { type: 'general', count: 5, prefix: 'GAS', name: 'Gastroenterology Ward', floor: 1 },
      'PED': { type: 'general', count: 5, prefix: 'PED', name: 'Pediatric Ward', floor: 2 },
      'SUR': { type: 'general', count: 6, prefix: 'SUR', name: 'General Surgery Ward', floor: 1 },
      'MED': { type: 'general', count: 6, prefix: 'MED', name: 'Internal Medicine Ward', floor: 1 }
    }
  }
};

/**
 * Seed beds for a specific hospital independently
 * Can be called by hospital ID or user ID
 */
export async function seedIndependentHospital(identifier: number): Promise<number> {
  let config = HOSPITAL_CONFIGS[identifier];
  
  // If not found by hospital ID, try user ID
  if (!config) {
    config = Object.values(HOSPITAL_CONFIGS).find(c => c.userId === identifier);
  }
  
  if (!config) {
    throw new Error(`Hospital configuration not found for identifier: ${identifier}`);
  }
  
  console.log(`🏥 Independent seeding for ${config.hospitalName} (Hospital ID: ${config.hospitalId})`);
  
  // Clear existing beds for this hospital only
  await db.delete(bedStatusLogs).where(eq(bedStatusLogs.hospitalId, config.hospitalId));
  
  // Generate beds for this hospital
  const beds = [];
  let patientIndex = 0;
  const occupancyRate = config.occupancyRate || 0.575;
  
  for (const [wardCode, wardConfig] of Object.entries(config.bedConfiguration)) {
    for (let i = 1; i <= wardConfig.count; i++) {
      const bedNumber = `${wardConfig.prefix}-${i.toString().padStart(2, '0')}`;
      
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
  
  // Insert beds in batches
  const batchSize = 50;
  for (let i = 0; i < beds.length; i += batchSize) {
    const batch = beds.slice(i, i + batchSize);
    await db.insert(bedStatusLogs).values(batch);
  }
  
  console.log(`✅ Seeded ${beds.length} beds for ${config.hospitalName}`);
  return beds.length;
}

/**
 * Check if a hospital needs seeding (has no bed data)
 */
export async function checkHospitalNeedsSeeding(identifier: number): Promise<boolean> {
  let hospitalId = identifier;
  
  // If identifier might be user ID, convert to hospital ID
  const config = Object.values(HOSPITAL_CONFIGS).find(c => c.userId === identifier);
  if (config) {
    hospitalId = config.hospitalId;
  }
  
  const existingBeds = await db.select()
    .from(bedStatusLogs)
    .where(eq(bedStatusLogs.hospitalId, hospitalId))
    .limit(1);
    
  return existingBeds.length === 0;
}

/**
 * Get hospital configuration by ID or user ID
 */
export function getHospitalConfig(identifier: number): IndependentHospitalConfig | undefined {
  let config = HOSPITAL_CONFIGS[identifier];
  if (!config) {
    config = Object.values(HOSPITAL_CONFIGS).find(c => c.userId === identifier);
  }
  return config;
}

/**
 * Initialize all hospitals independently (used on startup)
 */
export async function initializeAllHospitals(): Promise<void> {
  console.log('🏥 Initializing all hospitals independently...');
  
  for (const config of Object.values(HOSPITAL_CONFIGS)) {
    try {
      const needsSeeding = await checkHospitalNeedsSeeding(config.hospitalId);
      if (needsSeeding) {
        console.log(`🔄 Hospital ${config.hospitalName} needs seeding...`);
        await seedIndependentHospital(config.hospitalId);
      } else {
        console.log(`✅ Hospital ${config.hospitalName} already has bed data`);
      }
    } catch (error) {
      console.error(`❌ Failed to initialize ${config.hospitalName}:`, error);
    }
  }
  
  console.log('🎉 Hospital initialization complete');
}