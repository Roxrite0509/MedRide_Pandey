import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 50 }).notNull(), // 'patient', 'ambulance', 'hospital'
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const hospitals = pgTable("hospitals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  phone: varchar("phone", { length: 20 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  totalBeds: integer("total_beds").default(0),
  availableBeds: integer("available_beds").default(0),
  icuBeds: integer("icu_beds").default(0),
  availableIcuBeds: integer("available_icu_beds").default(0),
  emergencyStatus: varchar("emergency_status", { length: 50 }).default("available"), // 'available', 'busy', 'full'
  emergencyServices: text("emergency_services").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ambulances = pgTable("ambulances", {
  id: serial("id").primaryKey(),
  vehicleNumber: varchar("vehicle_number", { length: 50 }).notNull().unique(),
  userId: integer("user_id").references(() => users.id),
  operatorId: integer("operator_id").references(() => users.id),
  hospitalId: integer("hospital_id").references(() => hospitals.id),
  currentLatitude: decimal("current_latitude", { precision: 10, scale: 8 }),
  currentLongitude: decimal("current_longitude", { precision: 11, scale: 8 }),
  status: varchar("status", { length: 50 }).default("available"), // 'available', 'dispatched', 'en_route', 'at_scene', 'transporting'
  operatorPhone: varchar("operator_phone", { length: 20 }),
  licenseNumber: varchar("license_number", { length: 100 }),
  certification: varchar("certification", { length: 100 }),
  equipmentLevel: varchar("equipment_level", { length: 100 }),
  hospitalAffiliation: varchar("hospital_affiliation", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emergencyRequests = pgTable("emergency_requests", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => users.id),
  ambulanceId: integer("ambulance_id").references(() => ambulances.id),
  hospitalId: integer("hospital_id").references(() => hospitals.id),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  address: text("address"),
  priority: varchar("priority", { length: 50 }).default("medium"), // 'low', 'medium', 'high', 'critical'
  status: varchar("status", { length: 50 }).default("pending"), // 'pending', 'accepted', 'dispatched', 'en_route', 'at_scene', 'transporting', 'completed', 'cancelled'
  patientCondition: text("patient_condition"),
  notes: text("notes"),
  requestedAt: timestamp("requested_at").defaultNow(),
  dispatchedAt: timestamp("dispatched_at"),
  completedAt: timestamp("completed_at"),
  estimatedArrival: integer("estimated_arrival"), // ETA in minutes
  patientChosenHospitalId: integer("patient_chosen_hospital_id").references(() => hospitals.id),
  assignedBedNumber: varchar("assigned_bed_number", { length: 20 }), // bed assigned to patient when admitted
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bedStatusLogs = pgTable("bed_status_logs", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  bedType: varchar("bed_type", { length: 50 }).notNull(), // 'general', 'icu', 'trauma'
  bedNumber: varchar("bed_number", { length: 20 }).notNull(),
  wardDescription: varchar("ward_description", { length: 100 }), // ward name like 'Cardiac ICU', 'Maternity Ward'
  floorNumber: integer("floor_number"),
  status: varchar("status", { length: 50 }).notNull(), // 'available', 'occupied', 'maintenance', 'reserved'
  patientName: varchar("patient_name", { length: 100 }), // name of patient occupying the bed
  patientId: integer("patient_id").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communications = pgTable("communications", {
  id: serial("id").primaryKey(),
  emergencyRequestId: integer("emergency_request_id").references(() => emergencyRequests.id),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  receiverId: integer("receiver_id").references(() => users.id),
  message: text("message").notNull(),
  messageType: varchar("message_type", { length: 50 }).default("text"), // 'text', 'system', 'location'
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  emergencyRequests: many(emergencyRequests),
  ambulances: many(ambulances),
  sentMessages: many(communications, { relationName: "sender" }),
  receivedMessages: many(communications, { relationName: "receiver" }),
}));

export const hospitalsRelations = relations(hospitals, ({ many }) => ({
  ambulances: many(ambulances),
  emergencyRequests: many(emergencyRequests),
  bedStatusLogs: many(bedStatusLogs),
}));

export const ambulancesRelations = relations(ambulances, ({ one, many }) => ({
  operator: one(users, { fields: [ambulances.operatorId], references: [users.id] }),
  hospital: one(hospitals, { fields: [ambulances.hospitalId], references: [hospitals.id] }),
  emergencyRequests: many(emergencyRequests),
}));

export const emergencyRequestsRelations = relations(emergencyRequests, ({ one, many }) => ({
  patient: one(users, { fields: [emergencyRequests.patientId], references: [users.id] }),
  ambulance: one(ambulances, { fields: [emergencyRequests.ambulanceId], references: [ambulances.id] }),
  hospital: one(hospitals, { fields: [emergencyRequests.hospitalId], references: [hospitals.id] }),
  communications: many(communications),
}));

export const bedStatusLogsRelations = relations(bedStatusLogs, ({ one }) => ({
  hospital: one(hospitals, { fields: [bedStatusLogs.hospitalId], references: [hospitals.id] }),
  patient: one(users, { fields: [bedStatusLogs.patientId], references: [users.id] }),
  updatedBy: one(users, { fields: [bedStatusLogs.updatedBy], references: [users.id] }),
}));

export const communicationsRelations = relations(communications, ({ one }) => ({
  emergencyRequest: one(emergencyRequests, { fields: [communications.emergencyRequestId], references: [emergencyRequests.id] }),
  sender: one(users, { fields: [communications.senderId], references: [users.id], relationName: "sender" }),
  receiver: one(users, { fields: [communications.receiverId], references: [users.id], relationName: "receiver" }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHospitalSchema = createInsertSchema(hospitals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAmbulanceSchema = createInsertSchema(ambulances).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmergencyRequestSchema = createInsertSchema(emergencyRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBedStatusLogSchema = createInsertSchema(bedStatusLogs).omit({ id: true, createdAt: true });
export const insertCommunicationSchema = createInsertSchema(communications).omit({ id: true, createdAt: true });

// Auth schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
  // Hospital specific fields
  hospitalName: z.string().optional(),
  hospitalAddress: z.string().optional(),
  totalBeds: z.number().optional(),
  icuBeds: z.number().optional(),
  emergencyServices: z.array(z.string()).optional(),
  // Ambulance specific fields
  vehicleNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  certification: z.string().optional(),
  equipmentLevel: z.string().optional(),
  hospitalAffiliation: z.string().optional(),
  selectedHospitalId: z.number().optional(),
  // Patient specific fields
  emergencyContact: z.string().optional(),
  medicalConditions: z.string().optional(),
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Types
export type User = typeof users.$inferSelect;
export type Hospital = typeof hospitals.$inferSelect;
export type Ambulance = typeof ambulances.$inferSelect;
export type EmergencyRequest = typeof emergencyRequests.$inferSelect;
export type BedStatusLog = typeof bedStatusLogs.$inferSelect;
export type Communication = typeof communications.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertHospital = z.infer<typeof insertHospitalSchema>;
export type InsertAmbulance = z.infer<typeof insertAmbulanceSchema>;
export type InsertEmergencyRequest = z.infer<typeof insertEmergencyRequestSchema>;
export type InsertBedStatusLog = z.infer<typeof insertBedStatusLogSchema>;
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
