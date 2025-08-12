/**
 * Example: How to add a new hospital to the system
 * This example shows how to safely add Vishesh Jupiter Hospital
 * without breaking existing hospital bed data
 */

import { registerNewHospital, seedSpecificHospital } from './hospital-bed-manager';

// Step 1: Define the new hospital configuration
const visheshJupiterConfig = {
  hospitalId: 5,
  hospitalName: 'Vishesh Jupiter Hospital',
  occupancyRate: 0.575, // 57.5% occupancy rate
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
    // ICU Units (30 beds total)
    'CICU': { type: 'icu' as const, count: 8, prefix: 'CICU', name: 'Cardiac Intensive Care Unit', floor: 3 },
    'NICU': { type: 'icu' as const, count: 6, prefix: 'NICU', name: 'Neuro Intensive Care Unit', floor: 3 },
    'SICU': { type: 'icu' as const, count: 8, prefix: 'SICU', name: 'Surgical Intensive Care Unit', floor: 3 },
    'PICU': { type: 'icu' as const, count: 4, prefix: 'PICU', name: 'Pediatric Intensive Care Unit', floor: 2 },
    'MICU': { type: 'icu' as const, count: 4, prefix: 'MICU', name: 'Medical Intensive Care Unit', floor: 4 },
    
    // General Wards (50 beds total)
    'CAR': { type: 'general' as const, count: 8, prefix: 'CAR', name: 'Cardiology Ward', floor: 1 },
    'NEU': { type: 'general' as const, count: 6, prefix: 'NEU', name: 'Neurology Ward', floor: 2 },
    'ONC': { type: 'general' as const, count: 8, prefix: 'ONC', name: 'Oncology Ward', floor: 2 },
    'ORT': { type: 'general' as const, count: 6, prefix: 'ORT', name: 'Orthopedic Ward', floor: 1 },
    'GAS': { type: 'general' as const, count: 5, prefix: 'GAS', name: 'Gastroenterology Ward', floor: 1 },
    'PED': { type: 'general' as const, count: 5, prefix: 'PED', name: 'Pediatric Ward', floor: 2 },
    'SUR': { type: 'general' as const, count: 6, prefix: 'SUR', name: 'General Surgery Ward', floor: 1 },
    'MED': { type: 'general' as const, count: 6, prefix: 'MED', name: 'Internal Medicine Ward', floor: 1 }
  }
};

/**
 * Function to add Vishesh Jupiter Hospital to the system
 * This should be called during application initialization
 */
export async function addVisheshJupiterHospital() {
  try {
    console.log('🏥 Adding Vishesh Jupiter Hospital to the system...');
    
    // Step 2: Register the hospital in the managed hospitals system
    registerNewHospital(visheshJupiterConfig);
    
    // Step 3: Seed the hospital's bed data
    await seedSpecificHospital(5);
    
    console.log('✅ Vishesh Jupiter Hospital successfully added with 80 beds (30 ICU + 50 General)');
    
  } catch (error) {
    console.error('❌ Failed to add Vishesh Jupiter Hospital:', error);
    throw error;
  }
}

/**
 * INSTRUCTIONS FOR ADDING FUTURE HOSPITALS:
 * 
 * 1. Create a new hospital configuration object following the visheshJupiterConfig pattern
 * 2. Make sure the hospitalId is unique and matches your database
 * 3. Define appropriate bed configurations for your hospital's specialties
 * 4. Choose appropriate patient names for the region/hospital style
 * 5. Set a realistic occupancy rate (usually 0.50 to 0.80)
 * 6. Call registerNewHospital() with your configuration
 * 7. Call seedSpecificHospital() to generate the bed data
 * 8. Update the frontend hospital-bed-layout.tsx mapping if needed
 * 
 * BENEFITS OF THIS APPROACH:
 * - No data conflicts between hospitals
 * - Existing hospital data is never touched
 * - Easy to add new hospitals without affecting others
 * - Centralized configuration management
 * - Consistent bed generation logic
 * - Safe seeding and re-seeding
 */