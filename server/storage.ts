import {
  users,
  hospitals,
  ambulances,
  emergencyRequests,
  bedStatusLogs,
  communications,
  type User,
  type Hospital,
  type Ambulance,
  type EmergencyRequest,
  type BedStatusLog,
  type Communication,
  type InsertUser,
  type InsertHospital,
  type InsertAmbulance,
  type InsertEmergencyRequest,
  type InsertBedStatusLog,
  type InsertCommunication,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, ne, gte, or, isNotNull } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserWithProfile(id: number): Promise<User & { hospitalProfile?: Hospital; ambulanceProfile?: Ambulance } | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  
  // Hospital operations
  getHospital(id: number): Promise<Hospital | undefined>;
  getHospitalByUserId(userId: number): Promise<Hospital | undefined>;
  getHospitalByIdOrUserId(identifier: number): Promise<Hospital | undefined>;
  getAllHospitals(): Promise<Hospital[]>;
  getNearbyHospitals(lat: number, lng: number, radius: number): Promise<Hospital[]>;
  createHospital(hospital: InsertHospital): Promise<Hospital>;
  updateHospital(id: number, hospital: Partial<InsertHospital>): Promise<Hospital>;
  updateHospitalBeds(id: number, totalBeds: number, availableBeds: number, icuBeds: number, availableIcuBeds: number): Promise<Hospital>;
  
  // Ambulance operations
  getAmbulance(id: number): Promise<Ambulance | undefined>;
  getAmbulancesByHospital(hospitalId: number): Promise<Ambulance[]>;
  getAvailableAmbulances(): Promise<Ambulance[]>;
  getNearbyAmbulances(lat: number, lng: number, radius: number): Promise<Ambulance[]>;
  createAmbulance(ambulance: InsertAmbulance): Promise<Ambulance>;
  createAmbulanceWithAutoGeneration(userId: number, hospitalId: number, licenseNumber: string, certification: string, equipmentLevel: string): Promise<Ambulance>;
  updateAmbulance(id: number, ambulance: Partial<InsertAmbulance>): Promise<Ambulance>;
  updateAmbulanceLocation(id: number, lat: number, lng: number): Promise<Ambulance>;
  getNextAmbulanceNumber(): Promise<string>;
  
  // Emergency Request operations
  getEmergencyRequest(id: number): Promise<EmergencyRequest | undefined>;
  getEmergencyRequestsByPatient(patientId: number): Promise<EmergencyRequest[]>;
  getEmergencyRequestsByAmbulance(ambulanceId: number): Promise<EmergencyRequest[]>;
  getEmergencyRequestsByHospital(hospitalId: number): Promise<EmergencyRequest[]>;
  getActiveEmergencyRequests(): Promise<EmergencyRequest[]>;
  createEmergencyRequest(request: InsertEmergencyRequest): Promise<EmergencyRequest>;
  updateEmergencyRequest(id: number, request: Partial<InsertEmergencyRequest>): Promise<EmergencyRequest>;
  assignPatientToBed(emergencyRequestId: number, bedNumber: string): Promise<EmergencyRequest>;
  
  // Statistics operations
  getCompletedRequestsCount(ambulanceId: number): Promise<number>;
  getBedAvailabilityStatus(hospitalId: number): Promise<{ available: number; total: number; icuAvailable: number; icuTotal: number }>;
  
  // Bed Status operations
  getBedStatusByHospital(hospitalId: number): Promise<BedStatusLog[]>;
  createBedStatusLog(bedStatus: InsertBedStatusLog): Promise<BedStatusLog>;
  updateBedStatus(hospitalId: number, bedNumber: string, status: string, patientName?: string | null, patientId?: number | null): Promise<BedStatusLog>;
  
  // Communication operations
  getCommunicationsByEmergencyRequest(emergencyRequestId: number): Promise<Communication[]>;
  createCommunication(communication: InsertCommunication): Promise<Communication>;
  markCommunicationAsRead(id: number): Promise<Communication>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserWithProfile(id: number): Promise<User & { hospitalProfile?: Hospital; ambulanceProfile?: Ambulance } | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (!user) return undefined;

      let profile: any = { ...user };

      if (user.role === 'hospital') {
        try {
          const [hospital] = await db.select().from(hospitals).where(eq(hospitals.userId, id));
          if (hospital) profile.hospitalProfile = hospital;
        } catch (error) {
          console.error('Error fetching hospital profile:', error);
        }
      } else if (user.role === 'ambulance') {
        try {
          // Fix: Use operator_id column to find ambulance profile
          const [ambulance] = await db.select().from(ambulances).where(eq(ambulances.operatorId, id));
          if (ambulance) {
            console.log('Found ambulance profile for user', id, ':', ambulance.vehicleNumber);
            profile.ambulanceProfile = ambulance;
          } else {
            console.log('No ambulance profile found for user', id);
          }
        } catch (error) {
          console.error('Error fetching ambulance profile:', error);
        }
      }

      return profile;
    } catch (error) {
      console.error('Error in getUserWithProfile:', error);
      // Fallback to basic user info
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Hospital operations
  async getHospital(id: number): Promise<Hospital | undefined> {
    const [hospital] = await db.select().from(hospitals).where(eq(hospitals.id, id));
    return hospital;
  }

  async getHospitalByUserId(userId: number): Promise<Hospital | undefined> {
    const [hospital] = await db.select().from(hospitals).where(eq(hospitals.userId, userId));
    return hospital;
  }

  async getHospitalByIdOrUserId(identifier: number): Promise<Hospital | undefined> {
    // Try by hospital ID first, then by user ID
    let hospital = await this.getHospital(identifier);
    if (!hospital) {
      hospital = await this.getHospitalByUserId(identifier);
    }
    return hospital;
  }

  async getAllHospitals(): Promise<Hospital[]> {
    return db.select().from(hospitals);
  }

  async getNearbyHospitals(lat: number, lng: number, radius: number): Promise<Hospital[]> {
    // Simple distance calculation - in production, use PostGIS
    return db.select().from(hospitals).where(
      sql`sqrt(power(${hospitals.latitude} - ${lat}, 2) + power(${hospitals.longitude} - ${lng}, 2)) <= ${radius}`
    );
  }

  async createHospital(hospital: InsertHospital): Promise<Hospital> {
    console.log('Creating hospital with data:', hospital);
    try {
      const [newHospital] = await db.insert(hospitals).values(hospital).returning();
      console.log('Successfully created hospital:', newHospital);
      return newHospital;
    } catch (error) {
      console.error('Database error creating hospital:', error);
      throw error;
    }
  }

  async updateHospital(id: number, hospital: Partial<InsertHospital>): Promise<Hospital> {
    const [updatedHospital] = await db
      .update(hospitals)
      .set({ ...hospital, updatedAt: new Date() })
      .where(eq(hospitals.id, id))
      .returning();
    return updatedHospital;
  }

  async updateHospitalBeds(id: number, totalBeds: number, availableBeds: number, icuBeds: number, availableIcuBeds: number): Promise<Hospital> {
    const [updatedHospital] = await db
      .update(hospitals)
      .set({
        totalBeds,
        availableBeds,
        icuBeds,
        availableIcuBeds,
        updatedAt: new Date(),
      })
      .where(eq(hospitals.id, id))
      .returning();
    return updatedHospital;
  }

  // Ambulance operations
  async getAmbulance(id: number): Promise<Ambulance | undefined> {
    const [ambulance] = await db.select().from(ambulances).where(eq(ambulances.id, id));
    return ambulance;
  }

  async getAmbulanceByOperatorId(operatorId: number): Promise<Ambulance | undefined> {
    const [ambulance] = await db.select().from(ambulances).where(eq(ambulances.operatorId, operatorId));
    return ambulance;
  }

  async getAmbulancesByHospital(hospitalId: number): Promise<Ambulance[]> {
    return db.select().from(ambulances).where(eq(ambulances.hospitalId, hospitalId)).orderBy(ambulances.id);
  }

  async getAvailableAmbulances(): Promise<Ambulance[]> {
    return db.select().from(ambulances).where(
      and(eq(ambulances.status, "available"), eq(ambulances.isActive, true))
    ).orderBy(ambulances.id);
  }

  async getNearbyAmbulances(lat: number, lng: number, radius: number): Promise<Ambulance[]> {
    return db.select().from(ambulances).where(
      and(
        eq(ambulances.isActive, true),
        sql`sqrt(power(${ambulances.currentLatitude} - ${lat}, 2) + power(${ambulances.currentLongitude} - ${lng}, 2)) <= ${radius}`
      )
    ).orderBy(ambulances.id);
  }

  async createAmbulance(ambulance: InsertAmbulance): Promise<Ambulance> {
    console.log('Creating ambulance with data:', ambulance);
    try {
      const [newAmbulance] = await db.insert(ambulances).values(ambulance).returning();
      console.log('Successfully created ambulance:', newAmbulance);
      return newAmbulance;
    } catch (error) {
      console.error('Database error creating ambulance:', error);
      throw error;
    }
  }

  async updateAmbulance(id: number, ambulance: Partial<InsertAmbulance>): Promise<Ambulance> {
    const [updatedAmbulance] = await db
      .update(ambulances)
      .set({ ...ambulance, updatedAt: new Date() })
      .where(eq(ambulances.id, id))
      .returning();
    return updatedAmbulance;
  }

  async updateAmbulanceLocation(id: number, lat: number, lng: number): Promise<Ambulance> {
    const [updatedAmbulance] = await db
      .update(ambulances)
      .set({
        currentLatitude: lat.toString(),
        currentLongitude: lng.toString(),
        updatedAt: new Date(),
      })
      .where(eq(ambulances.id, id))
      .returning();
    return updatedAmbulance;
  }

  async getNextAmbulanceNumber(): Promise<string> {
    // Get all existing vehicle numbers to find the next available one
    const existingAmbulances = await db.select({ vehicleNumber: ambulances.vehicleNumber }).from(ambulances);
    console.log('🔍 Existing ambulance numbers:', existingAmbulances.map(a => a.vehicleNumber));
    
    const existingNumbers = existingAmbulances.map(a => {
      const match = a.vehicleNumber.match(/AMB-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    }).filter(num => num > 0);
    
    console.log('🔍 Extracted numbers:', existingNumbers);
    
    // Find the next available number
    let nextNumber = 1;
    while (existingNumbers.includes(nextNumber)) {
      nextNumber++;
    }
    
    const result = `AMB-${nextNumber.toString().padStart(3, '0')}`;
    console.log('🔍 Generated next number:', result);
    return result;
  }

  async createAmbulanceWithAutoGeneration(
    userId: number, 
    hospitalId: number, 
    operatorPhone: string,
    licenseNumber: string, 
    certification: string, 
    equipmentLevel: string
  ): Promise<Ambulance> {
    // Get hospital location for generating nearby coordinates
    const hospital = await this.getHospital(hospitalId);
    if (!hospital) {
      throw new Error('Hospital not found');
    }

    // Generate next vehicle number
    const vehicleNumber = await this.getNextAmbulanceNumber();

    // Generate random location within 3km radius of hospital
    const centerLat = parseFloat(hospital.latitude || '22.7196');
    const centerLng = parseFloat(hospital.longitude || '75.8577');
    
    const location = this.generateRandomLocationInRadius(centerLat, centerLng, 0.5, 3);

    // Create ambulance record
    const ambulanceData: InsertAmbulance = {
      vehicleNumber,
      operatorId: userId,
      hospitalId,
      currentLatitude: location.latitude.toString(),
      currentLongitude: location.longitude.toString(),
      status: 'available',
      operatorPhone,
      licenseNumber,
      certification,
      equipmentLevel,
      hospitalAffiliation: hospital.name,
      isActive: true
    };

    const [newAmbulance] = await db.insert(ambulances).values(ambulanceData).returning();
    return newAmbulance;
  }

  // Utility function to generate random coordinates within a radius
  private generateRandomLocationInRadius(centerLat: number, centerLng: number, minRadius: number, maxRadius: number) {
    const distance = Math.random() * (maxRadius - minRadius) + minRadius;
    const angle = Math.random() * 2 * Math.PI;
    
    const deltaLat = (distance / 111) * Math.cos(angle);
    const deltaLng = (distance / (111 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle);
    
    return {
      latitude: centerLat + deltaLat,
      longitude: centerLng + deltaLng
    };
  }

  // Emergency Request operations
  async getEmergencyRequest(id: number): Promise<EmergencyRequest | undefined> {
    const [request] = await db.select().from(emergencyRequests).where(eq(emergencyRequests.id, id));
    return request;
  }

  async getEmergencyRequestsByPatient(patientId: number): Promise<EmergencyRequest[]> {
    return db.select({
      id: emergencyRequests.id,
      patientId: emergencyRequests.patientId,
      ambulanceId: emergencyRequests.ambulanceId,
      hospitalId: emergencyRequests.hospitalId,
      latitude: emergencyRequests.latitude,
      longitude: emergencyRequests.longitude,
      address: emergencyRequests.address,
      priority: emergencyRequests.priority,
      status: emergencyRequests.status,
      patientCondition: emergencyRequests.patientCondition,
      notes: emergencyRequests.notes,
      requestedAt: emergencyRequests.requestedAt,
      dispatchedAt: emergencyRequests.dispatchedAt,
      completedAt: emergencyRequests.completedAt,
      estimatedArrival: emergencyRequests.estimatedArrival,
      patientChosenHospitalId: emergencyRequests.patientChosenHospitalId,
      assignedBedNumber: emergencyRequests.assignedBedNumber, // Explicitly include this field
      createdAt: emergencyRequests.createdAt,
      updatedAt: emergencyRequests.updatedAt,
      patient: {
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        phoneNumber: users.phone
      },
      ambulance: {
        id: ambulances.id,
        vehicleNumber: ambulances.vehicleNumber,
        operatorPhone: ambulances.operatorPhone,
        certification: ambulances.certification,
        equipmentLevel: ambulances.equipmentLevel,
        hospitalAffiliation: ambulances.hospitalAffiliation,
        status: ambulances.status
      }
    })
    .from(emergencyRequests)
    .leftJoin(users, eq(emergencyRequests.patientId, users.id))
    .leftJoin(ambulances, eq(emergencyRequests.ambulanceId, ambulances.id))
    .where(
      and(
        eq(emergencyRequests.patientId, patientId),
        sql`${emergencyRequests.status} != 'deleted'`
      )
    )
    .orderBy(desc(emergencyRequests.createdAt));
  }

  async getEmergencyRequestsByAmbulance(ambulanceId: number): Promise<EmergencyRequest[]> {
    return db.select({
      ...emergencyRequests,
      patient: {
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        phoneNumber: users.phone
      },
      ambulance: {
        id: ambulances.id,
        vehicleNumber: ambulances.vehicleNumber,
        operatorId: ambulances.operatorId,
        hospitalId: ambulances.hospitalId,
        currentLatitude: ambulances.currentLatitude,
        currentLongitude: ambulances.currentLongitude,
        status: ambulances.status,
        operatorPhone: ambulances.operatorPhone,
        licenseNumber: ambulances.licenseNumber,
        certification: ambulances.certification,
        equipmentLevel: ambulances.equipmentLevel,
        hospitalAffiliation: ambulances.hospitalAffiliation,
        isActive: ambulances.isActive
      }
    })
    .from(emergencyRequests)
    .leftJoin(users, eq(emergencyRequests.patientId, users.id))
    .leftJoin(ambulances, eq(emergencyRequests.ambulanceId, ambulances.id))
    .where(
      and(
        eq(emergencyRequests.ambulanceId, ambulanceId),
        sql`${emergencyRequests.status} NOT IN ('completed', 'cancelled', 'deleted')`
      )
    )
    .orderBy(desc(emergencyRequests.createdAt));
  }

  async getActiveRequestForAmbulance(ambulanceId: number): Promise<EmergencyRequest | null> {
    const [activeRequest] = await db.select({
      ...emergencyRequests,
      patient: {
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        phoneNumber: users.phone
      },
      ambulance: {
        id: ambulances.id,
        vehicleNumber: ambulances.vehicleNumber,
        operatorId: ambulances.operatorId,
        hospitalId: ambulances.hospitalId,
        currentLatitude: ambulances.currentLatitude,
        currentLongitude: ambulances.currentLongitude,
        status: ambulances.status,
        operatorPhone: ambulances.operatorPhone,
        licenseNumber: ambulances.licenseNumber,
        certification: ambulances.certification,
        equipmentLevel: ambulances.equipmentLevel,
        hospitalAffiliation: ambulances.hospitalAffiliation,
        isActive: ambulances.isActive
      }
    })
    .from(emergencyRequests)
    .leftJoin(users, eq(emergencyRequests.patientId, users.id))
    .leftJoin(ambulances, eq(emergencyRequests.ambulanceId, ambulances.id))
    .where(
      and(
        eq(emergencyRequests.ambulanceId, ambulanceId),
        sql`${emergencyRequests.status} IN ('accepted', 'dispatched', 'en_route', 'at_scene', 'transporting')`
      )
    )
    .orderBy(desc(emergencyRequests.createdAt))
    .limit(1);
    
    return activeRequest || null;
  }

  async getEmergencyRequestsByHospital(hospitalId: number): Promise<EmergencyRequest[]> {
    return db.select().from(emergencyRequests)
      .where(eq(emergencyRequests.hospitalId, hospitalId))
      .orderBy(desc(emergencyRequests.createdAt));
  }

  async getActiveEmergencyRequests(): Promise<EmergencyRequest[]> {
    return db.select({
      ...emergencyRequests,
      patient: {
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        phoneNumber: users.phone
      },
      ambulance: {
        id: ambulances.id,
        vehicleNumber: ambulances.vehicleNumber,
        operatorId: ambulances.operatorId,
        hospitalId: ambulances.hospitalId,
        currentLatitude: ambulances.currentLatitude,
        currentLongitude: ambulances.currentLongitude,
        status: ambulances.status,
        operatorPhone: ambulances.operatorPhone,
        licenseNumber: ambulances.licenseNumber,
        certification: ambulances.certification,
        equipmentLevel: ambulances.equipmentLevel,
        hospitalAffiliation: ambulances.hospitalAffiliation,
        isActive: ambulances.isActive
      }
    })
    .from(emergencyRequests)
    .leftJoin(users, eq(emergencyRequests.patientId, users.id))
    .leftJoin(ambulances, eq(emergencyRequests.ambulanceId, ambulances.id))
    .where(sql`${emergencyRequests.status} NOT IN ('completed', 'cancelled', 'deleted')`)
    .orderBy(desc(emergencyRequests.createdAt));
  }

  async createEmergencyRequest(request: InsertEmergencyRequest): Promise<EmergencyRequest> {
    const [newRequest] = await db.insert(emergencyRequests).values(request).returning();
    return newRequest;
  }

  async updateEmergencyRequest(id: number, request: Partial<InsertEmergencyRequest>): Promise<EmergencyRequest> {
    const [updatedRequest] = await db
      .update(emergencyRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(eq(emergencyRequests.id, id))
      .returning();
    return updatedRequest;
  }

  async assignPatientToBed(emergencyRequestId: number, bedNumber: string): Promise<EmergencyRequest> {
    // Update emergency request with assigned bed and mark as completed
    const [updatedRequest] = await db
      .update(emergencyRequests)
      .set({ 
        assignedBedNumber: bedNumber,
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(emergencyRequests.id, emergencyRequestId))
      .returning();

    // Update bed status to occupied
    if (updatedRequest.hospitalId) {
      await db
        .update(bedStatusLogs)
        .set({ 
          status: 'occupied',
          patientId: updatedRequest.patientId
        })
        .where(
          and(
            eq(bedStatusLogs.hospitalId, updatedRequest.hospitalId),
            eq(bedStatusLogs.bedNumber, bedNumber)
          )
        );
    }

    return updatedRequest;
  }

  // Bed Status operations
  async getBedStatusByHospital(hospitalId: number): Promise<BedStatusLog[]> {
    try {
      const bedStatusData = await db.select().from(bedStatusLogs)
        .where(eq(bedStatusLogs.hospitalId, hospitalId))
        .orderBy(desc(bedStatusLogs.createdAt));
      
      // Return ONLY real patient names from database - NO MOCK DATA
      return bedStatusData.map(bed => {
        return {
          ...bed,
          // Use only the real patient name from database, no fallback to mock names
          patientName: bed.patientName || null,
          isRealPatient: true
        } as any;
      });
    } catch (error) {
      console.error('Error fetching bed status:', error);
      throw error;
    }
  }

  private getPatientNameForBed(hospitalId: number, bedNumber: string): string {
    // Hospital-specific patient name mappings with authentic Indian names
    const hospitalPatientNames = {
      2: { // Apollo Hospital Indore - North Indian names
        'CICU-01': 'Rajesh Kumar Sharma', 'CICU-03': 'Priya Agarwal', 'CICU-05': 'Amit Singh',
        'NICU-01': 'Baby Gupta', 'SICU-02': 'Sunita Verma', 'PICU-01': 'Arjun Patel',
        'CARD-101': 'Vikram Malhotra', 'CARD-103': 'Kavita Joshi', 'CARD-105': 'Ramesh Tiwari',
        'NEUR-201': 'Deepak Pandey', 'NEUR-203': 'Meera Khanna', 'NEUR-205': 'Suresh Gupta',
        'ONCO-301': 'Pooja Sharma', 'ONCO-303': 'Ravi Kumar', 'ONCO-305': 'Anita Singh',
        'ORTH-401': 'Manoj Agarwal', 'ORTH-403': 'Sushma Verma', 'ORTH-405': 'Dinesh Jain',
        'GAST-501': 'Rohit Gupta', 'GAST-503': 'Neeta Sharma', 'GAST-505': 'Vinod Kumar',
        'PED-601': 'Karan Singh', 'PED-603': 'Ritu Agarwal', 'PED-605': 'Harsh Verma',
        'SURG-701': 'Santosh Pandey', 'SURG-703': 'Lata Joshi', 'SURG-705': 'Mukesh Gupta',
        'MED-801': 'Ashok Sharma', 'MED-803': 'Radha Singh', 'MED-805': 'Prakash Verma'
      },
      3: { // CARE CHL Hospital Indore - Central Indian names  
        'CICU-01': 'Sachin Jain', 'CICU-03': 'Rekha Chouhan', 'CICU-05': 'Nitin Patel',
        'NICU-01': 'Baby Agrawal', 'SICU-02': 'Madhuri Sharma', 'PICU-01': 'Aditya Verma',
        'MICU-02': 'Rajendra Singh', 'CARD-101': 'Geeta Malviya', 'CARD-103': 'Ajay Joshi',
        'NEUR-201': 'Vandana Gupta', 'NEUR-203': 'Mahesh Tiwari', 'NEUR-205': 'Shanti Devi',
        'ONCO-301': 'Ramesh Agrawal', 'ONCO-303': 'Pushpa Sharma', 'ONCO-305': 'Sunil Chouhan',
        'ORTH-401': 'Kiran Patel', 'ORTH-403': 'Jagdish Verma', 'ORTH-405': 'Usha Jain',
        'GAST-501': 'Arun Singh', 'GAST-503': 'Manju Gupta', 'GAST-505': 'Dilip Sharma',
        'PED-601': 'Ravi Agrawal', 'PED-603': 'Saroj Malviya', 'PED-605': 'Vivek Joshi',
        'SURG-701': 'Mohan Verma', 'SURG-703': 'Kamala Chouhan', 'SURG-705': 'Bharat Patel',
        'MED-801': 'Shyam Tiwari', 'MED-803': 'Savita Sharma', 'MED-805': 'Prem Singh'
      },
      4: { // Bombay Hospital Indore - Marathi/Western Indian names
        'CICU-01': 'Mahesh Patil', 'CICU-03': 'Sunanda Kulkarni', 'CICU-05': 'Prakash Desai',
        'NICU-01': 'Baby Joshi', 'SICU-02': 'Vaishali Marathe', 'PICU-01': 'Rohan Shinde',
        'MICU-02': 'Suresh Bhosale', 'CARD-101': 'Asha Deshpande', 'CARD-103': 'Vinay Patil',
        'NEUR-201': 'Mangala Kulkarni', 'NEUR-203': 'Ganesh Desai', 'NEUR-205': 'Laxmi Joshi',
        'ONCO-301': 'Rajesh Marathe', 'ONCO-303': 'Sushma Shinde', 'ONCO-305': 'Anil Bhosale',
        'ORTH-401': 'Seema Deshpande', 'ORTH-403': 'Ashok Patil', 'ORTH-405': 'Rajani Kulkarni',
        'GAST-501': 'Vishnu Desai', 'GAST-503': 'Kavita Joshi', 'GAST-505': 'Narayan Marathe',
        'PED-601': 'Pradeep Shinde', 'PED-603': 'Nanda Bhosale', 'PED-605': 'Umesh Deshpande',
        'SURG-701': 'Ramdas Patil', 'SURG-703': 'Shobha Kulkarni', 'SURG-705': 'Baban Desai',
        'MED-801': 'Dattatray Joshi', 'MED-803': 'Rohini Marathe', 'MED-805': 'Pandurang Shinde'
      },
      5: { // Vishesh Jupiter Hospital - Mixed Indian names
        'CICU-01': 'Dr. Ramesh Agarwal', 'CICU-03': 'Smt. Kamala Devi', 'CICU-05': 'Shri Vinod Kumar',
        'NICU-01': 'Baby Sharma', 'SICU-02': 'Mrs. Sunita Gupta', 'PICU-01': 'Master Arjun Singh',
        'MICU-02': 'Mr. Rajesh Verma', 'CARD-101': 'Mrs. Priya Jain', 'CARD-103': 'Shri Manoj Tiwari',
        'NEUR-201': 'Smt. Geeta Sharma', 'NEUR-203': 'Mr. Suresh Agarwal', 'NEUR-205': 'Mrs. Meera Gupta',
        'ONCO-301': 'Shri Ravi Kumar', 'ONCO-303': 'Smt. Pooja Singh', 'ONCO-305': 'Mr. Ashok Verma',
        'ORTH-401': 'Mrs. Sushma Jain', 'ORTH-403': 'Shri Dinesh Tiwari', 'ORTH-405': 'Smt. Anita Sharma',
        'GAST-501': 'Mr. Vikram Agarwal', 'GAST-503': 'Mrs. Kavita Gupta', 'GAST-505': 'Shri Rohit Singh',
        'PED-601': 'Master Karan Verma', 'PED-603': 'Mrs. Ritu Jain', 'PED-605': 'Master Harsh Tiwari',
        'SURG-701': 'Mr. Santosh Sharma', 'SURG-703': 'Smt. Lata Agarwal', 'SURG-705': 'Shri Mukesh Gupta',
        'MED-801': 'Mrs. Radha Singh', 'MED-803': 'Mr. Prakash Verma', 'MED-805': 'Smt. Shanti Jain'
      }
    };

    const hospitalNames = hospitalPatientNames[hospitalId as keyof typeof hospitalPatientNames];
    
    // If we have a specific name for this bed, use it
    if (hospitalNames && hospitalNames[bedNumber as keyof typeof hospitalNames]) {
      return hospitalNames[bedNumber as keyof typeof hospitalNames];
    }
    
    // Fallback names based on hospital region
    const fallbackNames = {
      2: ['Rahul Sharma', 'Anjali Gupta', 'Vikash Singh', 'Preeti Verma', 'Amit Kumar'],
      3: ['Sachin Jain', 'Rekha Chouhan', 'Nitin Agrawal', 'Madhuri Sharma', 'Rajesh Malviya'],
      4: ['Mahesh Patil', 'Sunanda Kulkarni', 'Prakash Desai', 'Vaishali Marathe', 'Suresh Bhosale'],
      5: ['Ramesh Agarwal', 'Kamala Devi', 'Vinod Kumar', 'Sunita Gupta', 'Rajesh Verma']
    };
    
    const names = fallbackNames[hospitalId as keyof typeof fallbackNames] || fallbackNames[2];
    const bedHash = bedNumber.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return names[bedHash % names.length];
  }

  async createBedStatusLog(bedStatus: InsertBedStatusLog): Promise<BedStatusLog> {
    const [newBedStatus] = await db.insert(bedStatusLogs).values(bedStatus).returning();
    return newBedStatus;
  }

  // Update existing bed status instead of creating new entries
  async updateBedStatus(hospitalId: number, bedNumber: string, status: string, patientName?: string | null, patientId?: number | null): Promise<BedStatusLog> {
    const [updatedBed] = await db
      .update(bedStatusLogs)
      .set({ 
        status,
        patientName,
        patientId,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(bedStatusLogs.hospitalId, hospitalId),
          eq(bedStatusLogs.bedNumber, bedNumber)
        )
      )
      .returning();
    return updatedBed;
  }

  // Communication operations
  async getCommunicationsByEmergencyRequest(emergencyRequestId: number): Promise<Communication[]> {
    return db.select().from(communications)
      .where(eq(communications.emergencyRequestId, emergencyRequestId))
      .orderBy(desc(communications.createdAt));
  }

  async createCommunication(communication: InsertCommunication): Promise<Communication> {
    const [newCommunication] = await db.insert(communications).values(communication).returning();
    return newCommunication;
  }

  async markCommunicationAsRead(id: number): Promise<Communication> {
    const [updatedCommunication] = await db
      .update(communications)
      .set({ isRead: true })
      .where(eq(communications.id, id))
      .returning();
    return updatedCommunication;
  }

  // Statistics operations
  async getCompletedRequestsCount(ambulanceId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(emergencyRequests)
      .where(and(
        eq(emergencyRequests.ambulanceId, ambulanceId),
        eq(emergencyRequests.status, 'completed')
      ));
    return result[0]?.count || 0;
  }

  async getBedAvailabilityStatus(hospitalId: number): Promise<{ available: number; total: number; icuAvailable: number; icuTotal: number }> {
    // Calculate real-time bed availability from bed_status_logs table
    const bedStatusData = await db.select().from(bedStatusLogs).where(eq(bedStatusLogs.hospitalId, hospitalId));
    
    if (bedStatusData.length === 0) {
      return { available: 0, total: 0, icuAvailable: 0, icuTotal: 0 };
    }

    // Count beds by type and status
    const generalTotal = bedStatusData.filter(bed => bed.bedType === 'general').length;
    const generalAvailable = bedStatusData.filter(bed => bed.bedType === 'general' && bed.status === 'available').length;
    
    const icuTotal = bedStatusData.filter(bed => bed.bedType === 'icu').length;
    const icuAvailable = bedStatusData.filter(bed => bed.bedType === 'icu' && bed.status === 'available').length;
    
    return {
      available: generalAvailable,
      total: generalTotal,
      icuAvailable: icuAvailable,
      icuTotal: icuTotal
    };
  }
}

export const storage = new DatabaseStorage();
