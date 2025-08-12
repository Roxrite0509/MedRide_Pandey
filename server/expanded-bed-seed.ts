import { db } from './db';
import { bedStatusLogs } from '@shared/schema';
import { sql } from 'drizzle-orm';

// Comprehensive Indian hospital bed seeding with authentic medical specialties
export async function seedExpandedBeds() {
  console.log('🏥 Starting expanded bed seeding for all three hospitals...');

  // Authentic Indian patient names for occupied bed display (stored as comments for UI)
  // These names will be used in the frontend for realistic patient name display
  const patientNamesByHospital = {
    apollo: [
      'Rajesh Kumar Singh', 'Priya Sharma', 'Amit Patel', 'Sunita Verma', 'Vikram Singh Rajput',
      'Meera Gupta', 'Anil Agarwal', 'Kavita Jain', 'Suresh Chandra', 'Pooja Mishra',
      'Rohit Sinha', 'Anita Yadav', 'Manoj Tiwari', 'Geeta Devi', 'Ashok Kumar',
      'Sushma Bhargava', 'Deepak Saxena', 'Ritu Malhotra', 'Vinod Khanna', 'Shanti Agarwal',
      'Rakesh Pandey', 'Usha Sharma', 'Sanjay Joshi', 'Lakshmi Iyer', 'Harish Chandra',
      'Kamla Devi', 'Narayan Das', 'Sarita Singh', 'Mukesh Gupta', 'Radha Krishna'
    ],
    chl: [
      'Arjun Mehta', 'Shreya Kapoor', 'Kiran Chopra', 'Anshuman Sengar', 'Divya Nair',
      'Raghav Malhotra', 'Tanvi Shah', 'Nikhil Bansal', 'Priyanka Thakur', 'Akash Agarwal',
      'Ritika Jain', 'Varun Sharma', 'Nisha Gupta', 'Rohit Verma', 'Sneha Patel',
      'Vishal Singh', 'Komal Yadav', 'Gaurav Kumar', 'Neha Mishra', 'Sachin Tiwari',
      'Pooja Bhardwaj', 'Manish Soni', 'Riya Agarwal', 'Aditya Khanna', 'Sonal Joshi',
      'Kartik Pandey', 'Swati Sharma', 'Rahul Saxena', 'Isha Gupta', 'Pankaj Singh'
    ],
    bombay: [
      'Sunil Deshmukh', 'Mangala Patil', 'Ramesh Kulkarni', 'Shobha Joshi', 'Ganesh Pawar',
      'Sunanda Bhosale', 'Pravin Jadhav', 'Madhuri Shinde', 'Dattatray More', 'Sushma Kale',
      'Mahesh Deshpande', 'Vaishali Naik', 'Santosh Gaikwad', 'Rekha Sawant', 'Vijay Kadam',
      'Lata Mane', 'Ashish Salunkhe', 'Kaveri Ranade', 'Ravi Thakur', 'Nanda Joshi',
      'Dinesh Rane', 'Sapna Patwardhan', 'Nitin Bhagat', 'Swapna Deshpande', 'Anand Khot',
      'Archana Gharge', 'Baban Chavan', 'Priti Bhosle', 'Hemant Ghorpade', 'Sadhana Kelkar'
    ]
  };

  // Indian medical specialties with realistic bed configurations
  const specialtyBeds = {
    apollo: {
      // Apollo Hospital Indore - 120 beds total
      'CICU': { type: 'icu', count: 12, prefix: 'CICU', name: 'Cardiac Intensive Care' },
      'NICU': { type: 'icu', count: 8, prefix: 'NICU', name: 'Neuro Intensive Care' },
      'SICU': { type: 'icu', count: 10, prefix: 'SICU', name: 'Surgical Intensive Care' },
      'PICU': { type: 'icu', count: 6, prefix: 'PICU', name: 'Pediatric Intensive Care' },
      'MICU': { type: 'icu', count: 8, prefix: 'MICU', name: 'Medical Intensive Care' },
      'CAR': { type: 'general', count: 15, prefix: 'CAR', name: 'Cardiology Ward' },
      'NEU': { type: 'general', count: 12, prefix: 'NEU', name: 'Neurology Ward' },
      'ONC': { type: 'general', count: 18, prefix: 'ONC', name: 'Oncology Ward' },
      'ORT': { type: 'general', count: 14, prefix: 'ORT', name: 'Orthopedic Ward' },
      'GAS': { type: 'general', count: 10, prefix: 'GAS', name: 'Gastroenterology Ward' },
      'URO': { type: 'general', count: 8, prefix: 'URO', name: 'Urology Ward' },
      'GEN': { type: 'general', count: 19, prefix: 'GEN', name: 'General Medicine Ward' }
    },
    chl: {
      // CARE CHL Hospital Indore - 100 beds total  
      'CCU': { type: 'icu', count: 10, prefix: 'CCU', name: 'Coronary Care Unit' },
      'TICU': { type: 'icu', count: 8, prefix: 'TICU', name: 'Trauma Intensive Care' },
      'NICU': { type: 'icu', count: 6, prefix: 'NICU', name: 'Neonatal Intensive Care' },
      'RICU': { type: 'icu', count: 6, prefix: 'RICU', name: 'Respiratory Intensive Care' },
      'MAT': { type: 'general', count: 12, prefix: 'MAT', name: 'Maternity Ward' },
      'PED': { type: 'general', count: 10, prefix: 'PED', name: 'Pediatric Ward' },
      'SUR': { type: 'general', count: 15, prefix: 'SUR', name: 'Surgery Ward' },
      'MED': { type: 'general', count: 12, prefix: 'MED', name: 'Medicine Ward' },
      'OBS': { type: 'general', count: 8, prefix: 'OBS', name: 'Obstetrics Ward' },
      'GYN': { type: 'general', count: 6, prefix: 'GYN', name: 'Gynecology Ward' },
      'ENT': { type: 'general', count: 7, prefix: 'ENT', name: 'ENT Ward' }
    },
    bombay: {
      // Bombay Hospital Indore - 115 beds total
      'CVICU': { type: 'icu', count: 8, prefix: 'CVICU', name: 'Cardiovascular ICU' },
      'MICU': { type: 'icu', count: 7, prefix: 'MICU', name: 'Medical ICU' },
      'SICU': { type: 'icu', count: 7, prefix: 'SICU', name: 'Surgical ICU' },
      'NICU': { type: 'icu', count: 5, prefix: 'NICU', name: 'Neurological ICU' },
      'PICU': { type: 'icu', count: 5, prefix: 'PICU', name: 'Pediatric ICU' },
      'HDU': { type: 'icu', count: 6, prefix: 'HDU', name: 'High Dependency Unit' },
      'CAR': { type: 'general', count: 12, prefix: 'CAR', name: 'Cardiology Ward' },
      'NEU': { type: 'general', count: 10, prefix: 'NEU', name: 'Neurology Ward' },
      'ORT': { type: 'general', count: 12, prefix: 'ORT', name: 'Orthopedic Ward' },
      'SUR': { type: 'general', count: 14, prefix: 'SUR', name: 'General Surgery Ward' },
      'MED': { type: 'general', count: 11, prefix: 'MED', name: 'General Medicine Ward' },
      'PED': { type: 'general', count: 8, prefix: 'PED', name: 'Pediatric Ward' },
      'MAT': { type: 'general', count: 10, prefix: 'MAT', name: 'Maternity Ward' }
    }
  };

  const bedStatuses = ['available', 'occupied', 'reserved', 'maintenance'];
  const getRandomStatus = () => {
    const weights = [0.4, 0.45, 0.1, 0.05]; // 40% available, 45% occupied, 10% reserved, 5% maintenance
    const random = Math.random();
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i];
      if (random <= sum) return bedStatuses[i];
    }
    return 'available';
  };

  // Clear existing bed data for main hospitals only (preserve Vishesh Jupiter Hospital data)
  console.log('🧹 Clearing existing bed status logs for main hospitals only...');
  await db.delete(bedStatusLogs).where(sql`hospital_id IN (2, 3, 4)`);

  const allBeds = [];
  let patientIndex = 0;

  // Generate beds for each hospital
  const hospitals = [
    { id: 2, name: 'apollo', config: specialtyBeds.apollo, names: patientNamesByHospital.apollo },
    { id: 3, name: 'chl', config: specialtyBeds.chl, names: patientNamesByHospital.chl },
    { id: 4, name: 'bombay', config: specialtyBeds.bombay, names: patientNamesByHospital.bombay }
  ];

  for (const hospital of hospitals) {
    console.log(`🏥 Generating beds for ${hospital.name.toUpperCase()} Hospital (ID: ${hospital.id})`);
    let hospitalPatientIndex = 0;
    
    for (const [specialty, config] of Object.entries(hospital.config)) {
      for (let i = 1; i <= config.count; i++) {
        const bedNumber = `${config.prefix}-${i.toString().padStart(3, '0')}`;
        const status = getRandomStatus();
        
        let patientId = null;
        if (status === 'occupied') {
          // Use null for occupied beds since we don't have real patient records
          // In a real system, these would be linked to actual patient records
          patientId = null;
          hospitalPatientIndex++;
        }

        allBeds.push({
          hospitalId: hospital.id,
          bedType: config.type,
          bedNumber,
          wardDescription: config.name, // Use config.name instead of config.wardName
          floorNumber: 1, // Default floor since config doesn't have floor property
          status,
          patientName: status === 'occupied' ? hospital.names[hospitalPatientIndex % hospital.names.length] : null,
          patientId,
          updatedBy: hospital.id + 9 // Hospital admin user IDs (11, 12, 13)
        });
      }
    }
  }

  // Insert all beds in batches
  const batchSize = 50;
  for (let i = 0; i < allBeds.length; i += batchSize) {
    const batch = allBeds.slice(i, i + batchSize);
    await db.insert(bedStatusLogs).values(batch);
    console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allBeds.length/batchSize)}`);
  }

  console.log(`🎉 Successfully seeded ${allBeds.length} beds across all hospitals!`);
  
  // Print summary
  for (const hospital of hospitals) {
    const hospitalBeds = allBeds.filter(bed => bed.hospitalId === hospital.id);
    const icuBeds = hospitalBeds.filter(bed => bed.bedType === 'icu').length;
    const generalBeds = hospitalBeds.filter(bed => bed.bedType === 'general').length;
    const availableBeds = hospitalBeds.filter(bed => bed.status === 'available').length;
    const occupiedBeds = hospitalBeds.filter(bed => bed.status === 'occupied').length;
    
    console.log(`📊 ${hospital.name.toUpperCase()}: ${hospitalBeds.length} total (${icuBeds} ICU, ${generalBeds} General) - ${availableBeds} available, ${occupiedBeds} occupied`);
  }

  return allBeds.length;
}