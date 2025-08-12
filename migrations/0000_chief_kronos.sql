CREATE TABLE "ambulances" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_number" varchar(50) NOT NULL,
	"operator_id" integer,
	"hospital_id" integer,
	"current_latitude" numeric(10, 8),
	"current_longitude" numeric(11, 8),
	"status" varchar(50) DEFAULT 'available',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ambulances_vehicle_number_unique" UNIQUE("vehicle_number")
);
--> statement-breakpoint
CREATE TABLE "bed_status_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"bed_type" varchar(50) NOT NULL,
	"bed_number" varchar(20) NOT NULL,
	"status" varchar(50) NOT NULL,
	"patient_id" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "communications" (
	"id" serial PRIMARY KEY NOT NULL,
	"emergency_request_id" integer,
	"sender_id" integer NOT NULL,
	"receiver_id" integer,
	"message" text NOT NULL,
	"message_type" varchar(50) DEFAULT 'text',
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "emergency_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer,
	"ambulance_id" integer,
	"hospital_id" integer,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"address" text,
	"priority" varchar(50) DEFAULT 'medium',
	"status" varchar(50) DEFAULT 'pending',
	"patient_condition" text,
	"notes" text,
	"requested_at" timestamp DEFAULT now(),
	"dispatched_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hospitals" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"phone" varchar(20),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"total_beds" integer DEFAULT 0,
	"available_beds" integer DEFAULT 0,
	"icu_beds" integer DEFAULT 0,
	"available_icu_beds" integer DEFAULT 0,
	"emergency_status" varchar(50) DEFAULT 'available',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"role" varchar(50) NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"phone" varchar(20),
	"profile_image_url" varchar(500),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ambulances" ADD CONSTRAINT "ambulances_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambulances" ADD CONSTRAINT "ambulances_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bed_status_logs" ADD CONSTRAINT "bed_status_logs_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bed_status_logs" ADD CONSTRAINT "bed_status_logs_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bed_status_logs" ADD CONSTRAINT "bed_status_logs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_emergency_request_id_emergency_requests_id_fk" FOREIGN KEY ("emergency_request_id") REFERENCES "public"."emergency_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_requests" ADD CONSTRAINT "emergency_requests_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_requests" ADD CONSTRAINT "emergency_requests_ambulance_id_ambulances_id_fk" FOREIGN KEY ("ambulance_id") REFERENCES "public"."ambulances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_requests" ADD CONSTRAINT "emergency_requests_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;