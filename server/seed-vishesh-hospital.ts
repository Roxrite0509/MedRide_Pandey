import { db } from './db';
import { bedStatusLogs } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Seed beds for Vishesh Jupiter Hospital (ID: 5)
export async function seedVisheshHospitalBeds() {
  console.log('🏥 Starting bed seeding for Vishesh Jupiter Hospital...');
  
  try {
    // Clear existing bed status logs for this hospital
    console.log('🧹 Clearing existing bed status logs for Vishesh Jupiter Hospital...');
    await db.delete(bedStatusLogs).where(eq(bedStatusLogs.hospitalId, 5));

    // Authentic Indian patient names for Vishesh Jupiter (North Indian style)
    const patientNames = [
      'Rajesh Kumar Singh', 'Priya Sharma', 'Amit Patel', 'Sunita Verma', 'Vikram Singh Rajput',
      'Meera Gupta', 'Anil Agarwal', 'Kavita Jain', 'Suresh Chandra', 'Pooja Mishra',
      'Rohit Sinha', 'Anita Yadav', 'Manoj Tiwari', 'Geeta Devi', 'Ashok Kumar',
      'Sushma Bhargava', 'Deepak Saxena', 'Ritu Malhotra', 'Vinod Khanna', 'Shanti Agarwal',
      'Rakesh Pandey', 'Usha Sharma', 'Sanjay Joshi', 'Lakshmi Iyer', 'Harish Chandra',
      'Kamla Devi', 'Narayan Das', 'Sarita Singh', 'Mukesh Gupta', 'Radha Krishna'
    ];

    // Vishesh Jupiter Hospital bed configuration (80 beds total: 30 ICU, 50 General)
    const specialtyBeds = {
      // ICU Beds (30 total)
      'CICU': { type: 'icu', count: 8, prefix: 'CICU', name: 'Cardiac Intensive Care' },
      'NICU': { type: 'icu', count: 6, prefix: 'NICU', name: 'Neuro Intensive Care' },
      'SICU': { type: 'icu', count: 8, prefix: 'SICU', name: 'Surgical Intensive Care' },
      'PICU': { type: 'icu', count: 4, prefix: 'PICU', name: 'Pediatric Intensive Care' },
      'MICU': { type: 'icu', count: 4, prefix: 'MICU', name: 'Medical Intensive Care' },
      
      // General Beds (50 total)
      'CAR': { type: 'general', count: 8, prefix: 'CAR', name: 'Cardiology Ward' },
      'NEU': { type: 'general', count: 6, prefix: 'NEU', name: 'Neurology Ward' },
      'ONC': { type: 'general', count: 8, prefix: 'ONC', name: 'Oncology Ward' },
      'ORT': { type: 'general', count: 6, prefix: 'ORT', name: 'Orthopedic Ward' },
      'GAS': { type: 'general', count: 5, prefix: 'GAS', name: 'Gastroenterology Ward' },
      'PED': { type: 'general', count: 5, prefix: 'PED', name: 'Pediatric Ward' },
      'SUR': { type: 'general', count: 6, prefix: 'SUR', name: 'General Surgery Ward' },
      'MED': { type: 'general', count: 6, prefix: 'MED', name: 'Internal Medicine Ward' }
    };

    const bedEntries = [];
    let patientIndex = 0;

    // Generate beds for each specialty
    for (const [wardCode, config] of Object.entries(specialtyBeds)) {
      console.log(`🏥 Generating ${config.count} beds for ${config.name} (${wardCode})`);
      
      for (let i = 1; i <= config.count; i++) {
        const bedNumber = `${config.prefix}-${i.toString().padStart(2, '0')}`;
        
        // 60% occupancy rate for realistic hospital status
        const isOccupied = Math.random() < 0.6;
        const patientName = isOccupied ? patientNames[patientIndex % patientNames.length] : null;
        
        if (isOccupied) {
          patientIndex++;
        }

        bedEntries.push({
          hospitalId: 5, // Vishesh Jupiter Hospital ID
          bedNumber,
          wardDescription: config.name,
          bedType: config.type,
          status: isOccupied ? 'occupied' : 'available',
          patientName,
          floorNumber: config.type === 'icu' ? 3 : 1
        });
      }
    }

    // Insert beds in batches
    const batchSize = 20;
    for (let i = 0; i < bedEntries.length; i += batchSize) {
      const batch = bedEntries.slice(i, i + batchSize);
      await db.insert(bedStatusLogs).values(batch);
      console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(bedEntries.length / batchSize)}`);
    }

    const occupiedBeds = bedEntries.filter(bed => bed.isOccupied).length;
    const availableBeds = bedEntries.length - occupiedBeds;
    const icuBeds = bedEntries.filter(bed => bed.bedType === 'icu');
    const occupiedIcuBeds = icuBeds.filter(bed => bed.isOccupied).length;
    const availableIcuBeds = icuBeds.length - occupiedIcuBeds;

    console.log(`🎉 Successfully seeded ${bedEntries.length} beds for Vishesh Jupiter Hospital!`);
    console.log(`📊 VISHESH JUPITER: ${bedEntries.length} total (${icuBeds.length} ICU, ${bedEntries.length - icuBeds.length} General) - ${availableBeds} available, ${occupiedBeds} occupied`);
    console.log(`📊 ICU: ${availableIcuBeds} available, ${occupiedIcuBeds} occupied`);

  } catch (error) {
    console.error('Error seeding Vishesh Jupiter Hospital beds:', error);
    throw error;
  }
}

// Generate realistic medical conditions based on ward type
function generateMedicalCondition(wardCode: string): string {
  const conditions = {
    'CICU': ['Acute Myocardial Infarction', 'Cardiac Arrhythmia', 'Heart Failure', 'Cardiogenic Shock'],
    'NICU': ['Stroke Recovery', 'Head Injury', 'Neurological Monitoring', 'Post-operative Care'],
    'SICU': ['Post-operative Care', 'Multiple Trauma', 'Surgical Complications', 'Critical Surgery Recovery'],
    'PICU': ['Pediatric Emergency', 'Respiratory Distress', 'Pediatric Surgery', 'Fever Management'],
    'MICU': ['Respiratory Failure', 'Sepsis', 'Multi-organ Dysfunction', 'Critical Medical Care'],
    'CAR': ['Hypertension', 'Angina', 'Cardiac Catheterization', 'Heart Disease Management'],
    'NEU': ['Migraine', 'Epilepsy', 'Neurological Assessment', 'Brain Tumor'],
    'ONC': ['Cancer Treatment', 'Chemotherapy', 'Radiation Therapy', 'Palliative Care'],
    'ORT': ['Fracture Repair', 'Joint Replacement', 'Spinal Surgery', 'Sports Injury'],
    'GAS': ['Gastritis', 'Liver Disease', 'Digestive Disorders', 'Endoscopy'],
    'PED': ['Childhood Illness', 'Vaccination', 'Pediatric Care', 'Growth Monitoring'],
    'SUR': ['Surgical Recovery', 'Appendectomy', 'Hernia Repair', 'General Surgery'],
    'MED': ['Diabetes Management', 'Hypertension', 'Respiratory Infection', 'General Medicine']
  };

  const wardConditions = conditions[wardCode] || conditions['MED'];
  return wardConditions[Math.floor(Math.random() * wardConditions.length)];
}