import { db } from "./db";
import { users, hospitals, ambulances, bedStatusLogs } from "../shared/schema";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  try {
    console.log("Starting database seeding...");

    // Clear existing data to reseed with new hospitals
    console.log("Clearing existing data for fresh seed...");

    // Hash passwords for test users
    const hashedPassword = await bcrypt.hash("password123", 10);

    // Create test users
    const testUsers = [
      {
        username: "patient1",
        email: "patient1@test.com",
        password: hashedPassword,
        role: "patient" as const,
        firstName: "John",
        lastName: "Patient",
        phone: "+1234567890",
        isActive: true
      },
      // Hospital Users for Top 3 Indore Hospitals
      {
        username: "apollo_admin", 
        email: "admin@apolloindore.com",
        password: hashedPassword,
        role: "hospital" as const,
        firstName: "Apollo",
        lastName: "Administrator",
        phone: "+91-731-4285000",
        isActive: true
      },
      {
        username: "chl_admin", 
        email: "admin@careindore.com",
        password: hashedPassword,
        role: "hospital" as const,
        firstName: "CARE CHL",
        lastName: "Administrator",
        phone: "+91-731-4200000",
        isActive: true
      },
      {
        username: "bombay_admin", 
        email: "admin@bombayindore.com",
        password: hashedPassword,
        role: "hospital" as const,
        firstName: "Bombay",
        lastName: "Administrator",
        phone: "+91-731-2552100",
        isActive: true
      },
      {
        username: "ambulance1",
        email: "ambulance1@test.com", 
        password: hashedPassword,
        role: "ambulance" as const,
        firstName: "Ambulance",
        lastName: "Driver",
        phone: "+1234567892",
        isActive: true
      }
    ];

    // Insert users and get their IDs
    const insertedUsers = await db.insert(users).values(testUsers).returning();
    console.log(`Created ${insertedUsers.length} test users`);

    // Create hospitals based on top 3 hospitals in Indore
    const hospitalData = [
      {
        name: "Apollo Hospital Indore",
        address: "Scheme No. 74C, Sector E, Vijay Nagar, Indore, Madhya Pradesh",
        latitude: "22.7532",
        longitude: "75.8937",
        phone: "+91-731-4285000",
        totalBeds: 180,
        availableBeds: 65,
        icuBeds: 30,
        availableIcuBeds: 12,
        emergencyStatus: "available" as const
      },
      {
        name: "CARE CHL Hospital Indore",
        address: "A B Road, Near LIG Square, Indore, Madhya Pradesh",
        latitude: "22.7196",
        longitude: "75.8577",
        phone: "+91-731-4200000",
        totalBeds: 250,
        availableBeds: 85,
        icuBeds: 40,
        availableIcuBeds: 18,
        emergencyStatus: "available" as const
      },
      {
        name: "Bombay Hospital Indore",
        address: "Indore-Dewas Road, Near Meghdoot Garden, Indore, Madhya Pradesh",
        latitude: "22.6797",
        longitude: "75.8333",
        phone: "+91-731-2552100",
        totalBeds: 200,
        availableBeds: 70,
        icuBeds: 35,
        availableIcuBeds: 15,
        emergencyStatus: "available" as const
      }
    ];

    const insertedHospitals = await db.insert(hospitals).values(hospitalData).returning();
    console.log(`Created ${insertedHospitals.length} test hospitals`);

    // Create comprehensive bed status data for all hospitals
    const bedStatusData = [];
    
    // Apollo Hospital Indore (ID: 2) - Comprehensive bed statuses
    const apolloHospital = insertedHospitals.find(h => h.name === "Apollo Hospital Indore");
    if (apolloHospital) {
      // ICU Bed statuses
      bedStatusData.push(
        { hospitalId: apolloHospital.id, bedType: "icu", bedNumber: "CCU-01", status: "occupied", patientId: null },
        { hospitalId: apolloHospital.id, bedType: "icu", bedNumber: "CCU-02", status: "available", patientId: null },
        { hospitalId: apolloHospital.id, bedType: "icu", bedNumber: "CCU-03", status: "occupied", patientId: null },
        { hospitalId: apolloHospital.id, bedType: "icu", bedNumber: "CCU-04", status: "available", patientId: null },
        { hospitalId: apolloHospital.id, bedType: "icu", bedNumber: "CCU-05", status: "reserved", patientId: null },
        { hospitalId: apolloHospital.id, bedType: "icu", bedNumber: "NICU-01", status: "occupied", patientId: null },
        { hospitalId: apolloHospital.id, bedType: "icu", bedNumber: "NICU-02", status: "available", patientId: null },
        { hospitalId: apolloHospital.id, bedType: "icu", bedNumber: "NICU-03", status: "available", patientId: null }
      );
      
      // General bed statuses
      bedStatusData.push(
        { hospitalId: apolloHospital.id, bedType: "general", bedNumber: "MED-101", status: "occupied", patientId: null },
        { hospitalId: apolloHospital.id, bedType: "general", bedNumber: "MED-102", status: "available", patientId: null },
        { hospitalId: apolloHospital.id, bedType: "general", bedNumber: "MED-103", status: "occupied", patientId: null },
        { hospitalId: apolloHospital.id, bedType: "general", bedNumber: "MED-104", status: "available", patientId: null },
        { hospitalId: apolloHospital.id, bedType: "general", bedNumber: "SUR-201", status: "occupied", patientId: null },
        { hospitalId: apolloHospital.id, bedType: "general", bedNumber: "SUR-202", status: "available", patientId: null },
        { hospitalId: apolloHospital.id, bedType: "general", bedNumber: "SUR-203", status: "occupied", patientId: null },
        { hospitalId: apolloHospital.id, bedType: "general", bedNumber: "SUR-204", status: "available", patientId: null },
        { hospitalId: apolloHospital.id, bedType: "general", bedNumber: "ORT-301", status: "available", patientId: null },
        { hospitalId: apolloHospital.id, bedType: "general", bedNumber: "ORT-302", status: "reserved", patientId: null }
      );
    }

    // CARE CHL Hospital Indore (ID: 3) - Advanced care bed statuses  
    const chlHospital = insertedHospitals.find(h => h.name === "CARE CHL Hospital Indore");
    if (chlHospital) {
      // ICU bed statuses
      bedStatusData.push(
        { hospitalId: chlHospital.id, bedType: "icu", bedNumber: "NICU-01", status: "occupied", patientId: null },
        { hospitalId: chlHospital.id, bedType: "icu", bedNumber: "NICU-02", status: "available", patientId: null },
        { hospitalId: chlHospital.id, bedType: "icu", bedNumber: "NICU-03", status: "occupied", patientId: null },
        { hospitalId: chlHospital.id, bedType: "icu", bedNumber: "ICU-01", status: "available", patientId: null },
        { hospitalId: chlHospital.id, bedType: "icu", bedNumber: "ICU-02", status: "reserved", patientId: null },
        { hospitalId: chlHospital.id, bedType: "icu", bedNumber: "CCU-01", status: "occupied", patientId: null },
        { hospitalId: chlHospital.id, bedType: "icu", bedNumber: "CCU-02", status: "available", patientId: null },
        { hospitalId: chlHospital.id, bedType: "icu", bedNumber: "CCU-03", status: "available", patientId: null }
      );
      
      // General bed statuses
      bedStatusData.push(
        { hospitalId: chlHospital.id, bedType: "general", bedNumber: "PED-401", status: "occupied", patientId: null },
        { hospitalId: chlHospital.id, bedType: "general", bedNumber: "PED-402", status: "available", patientId: null },
        { hospitalId: chlHospital.id, bedType: "general", bedNumber: "PED-403", status: "occupied", patientId: null },
        { hospitalId: chlHospital.id, bedType: "general", bedNumber: "CAR-501", status: "available", patientId: null },
        { hospitalId: chlHospital.id, bedType: "general", bedNumber: "CAR-502", status: "occupied", patientId: null },
        { hospitalId: chlHospital.id, bedType: "general", bedNumber: "CAR-503", status: "available", patientId: null },
        { hospitalId: chlHospital.id, bedType: "general", bedNumber: "GEN-601", status: "occupied", patientId: null },
        { hospitalId: chlHospital.id, bedType: "general", bedNumber: "GEN-602", status: "available", patientId: null },
        { hospitalId: chlHospital.id, bedType: "general", bedNumber: "GEN-603", status: "reserved", patientId: null },
        { hospitalId: chlHospital.id, bedType: "general", bedNumber: "MAT-701", status: "available", patientId: null }
      );
    }

    // Bombay Hospital Indore (ID: 4) - Multi-specialty bed statuses
    const bombayHospital = insertedHospitals.find(h => h.name === "Bombay Hospital Indore");
    if (bombayHospital) {
      // ICU bed statuses
      bedStatusData.push(
        { hospitalId: bombayHospital.id, bedType: "icu", bedNumber: "CCU-B1", status: "occupied", patientId: null },
        { hospitalId: bombayHospital.id, bedType: "icu", bedNumber: "CCU-B2", status: "available", patientId: null },
        { hospitalId: bombayHospital.id, bedType: "icu", bedNumber: "CCU-B3", status: "occupied", patientId: null },
        { hospitalId: bombayHospital.id, bedType: "icu", bedNumber: "NICU-B1", status: "available", patientId: null },
        { hospitalId: bombayHospital.id, bedType: "icu", bedNumber: "NICU-B2", status: "reserved", patientId: null },
        { hospitalId: bombayHospital.id, bedType: "icu", bedNumber: "ICU-B1", status: "occupied", patientId: null },
        { hospitalId: bombayHospital.id, bedType: "icu", bedNumber: "ICU-B2", status: "available", patientId: null },
        { hospitalId: bombayHospital.id, bedType: "icu", bedNumber: "ICU-B3", status: "available", patientId: null }
      );
      
      // General bed statuses
      bedStatusData.push(
        { hospitalId: bombayHospital.id, bedType: "general", bedNumber: "ORT-501", status: "occupied", patientId: null },
        { hospitalId: bombayHospital.id, bedType: "general", bedNumber: "ORT-502", status: "available", patientId: null },
        { hospitalId: bombayHospital.id, bedType: "general", bedNumber: "ORT-503", status: "available", patientId: null },
        { hospitalId: bombayHospital.id, bedType: "general", bedNumber: "NEU-601", status: "occupied", patientId: null },
        { hospitalId: bombayHospital.id, bedType: "general", bedNumber: "NEU-602", status: "available", patientId: null },
        { hospitalId: bombayHospital.id, bedType: "general", bedNumber: "GEN-701", status: "available", patientId: null },
        { hospitalId: bombayHospital.id, bedType: "general", bedNumber: "GEN-702", status: "occupied", patientId: null },
        { hospitalId: bombayHospital.id, bedType: "general", bedNumber: "SUR-801", status: "available", patientId: null },
        { hospitalId: bombayHospital.id, bedType: "general", bedNumber: "SUR-802", status: "reserved", patientId: null },
        { hospitalId: bombayHospital.id, bedType: "general", bedNumber: "PED-901", status: "available", patientId: null }
      );
    }

    // Insert all bed status data
    if (bedStatusData.length > 0) {
      const insertedBedStatus = await db.insert(bedStatusLogs).values(bedStatusData).returning();
      console.log(`Created ${insertedBedStatus.length} bed status records for all hospitals`);
    }

    // Create test ambulance
    const hospitalUser = insertedUsers.find(u => u.role === "hospital");
    const ambulanceUser = insertedUsers.find(u => u.role === "ambulance");
    
    const testAmbulance = {
      vehicleNumber: "AMB-001",
      operatorId: ambulanceUser?.id,
      hospitalId: insertedHospitals[0]?.id,
      currentLatitude: "40.7580",
      currentLongitude: "-73.9855", 
      status: "available" as const,
      isActive: true
    };

    const insertedAmbulances = await db.insert(ambulances).values([testAmbulance]).returning();
    console.log(`Created ${insertedAmbulances.length} test ambulances`);

    console.log("Database seeding completed successfully!");
    console.log("Test credentials:");
    console.log("- Patient: username=patient1, password=password123");
    console.log("- Apollo Hospital: username=apollo_admin, password=password123");
    console.log("- CARE CHL Hospital: username=chl_admin, password=password123");
    console.log("- Bombay Hospital: username=bombay_admin, password=password123");
    console.log("- Ambulance: username=ambulance1, password=password123");

  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}