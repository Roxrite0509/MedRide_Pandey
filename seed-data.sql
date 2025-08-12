-- Sample data for EmergencyConnect platform

-- Insert sample hospitals
INSERT INTO hospitals (name, address, phone, latitude, longitude, total_beds, available_beds, icu_beds, available_icu_beds, emergency_status) VALUES
('City General Hospital', '123 Main St, Downtown', '+1-555-0001', '40.7128', '-74.0060', 200, 45, 20, 8, 'available'),
('Metro Emergency Center', '456 Oak Ave, Midtown', '+1-555-0002', '40.7200', '-74.0100', 150, 30, 15, 5, 'busy'),
('St. Mary''s Medical Center', '789 Pine Rd, Uptown', '+1-555-0003', '40.7300', '-73.9900', 180, 25, 18, 3, 'available'),
('Regional Trauma Center', '321 Elm St, Eastside', '+1-555-0004', '40.7150', '-73.9950', 250, 60, 25, 12, 'available');

-- Insert sample users (passwords are hashed for 'password123')
INSERT INTO users (username, email, password, role, first_name, last_name, phone, is_active) VALUES
('patient1', 'john.doe@email.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'patient', 'John', 'Doe', '+1-555-1001', true),
('patient2', 'jane.smith@email.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'patient', 'Jane', 'Smith', '+1-555-1002', true),
('ambulance1', 'driver1@emergency.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ambulance', 'Mike', 'Johnson', '+1-555-2001', true),
('ambulance2', 'driver2@emergency.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ambulance', 'Sarah', 'Williams', '+1-555-2002', true),
('hospital1', 'admin@citygeneral.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'hospital', 'Dr. Maria', 'Garcia', '+1-555-3001', true),
('hospital2', 'admin@metroemergency.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'hospital', 'Dr. Robert', 'Chen', '+1-555-3002', true);

-- Insert sample ambulances
INSERT INTO ambulances (vehicle_number, operator_id, hospital_id, current_latitude, current_longitude, status, is_active) VALUES
('EMT-001', 3, 1, '40.7140', '-74.0070', 'available', true),
('EMT-002', 4, 2, '40.7180', '-74.0080', 'available', true),
('EMT-003', NULL, 1, '40.7160', '-74.0050', 'available', true),
('EMT-004', NULL, 3, '40.7220', '-73.9920', 'maintenance', false);

-- Insert sample emergency requests
INSERT INTO emergency_requests (patient_id, ambulance_id, hospital_id, latitude, longitude, address, priority, status, patient_condition, notes) VALUES
(1, 1, 1, '40.7128', '-74.0060', '123 Emergency St, Downtown', 'high', 'completed', 'Chest pain', 'Patient stable, transported successfully'),
(2, NULL, NULL, '40.7200', '-74.0100', '456 Crisis Ave, Midtown', 'medium', 'pending', 'Minor injury', 'Waiting for ambulance dispatch');

-- Insert sample bed status logs
INSERT INTO bed_status_logs (hospital_id, bed_type, bed_number, status, patient_id, updated_by) VALUES
(1, 'icu', 'ICU-001', 'occupied', 1, 5),
(1, 'icu', 'ICU-002', 'available', NULL, 5),
(1, 'general', 'GEN-001', 'occupied', NULL, 5),
(1, 'general', 'GEN-002', 'available', NULL, 5),
(2, 'icu', 'ICU-101', 'occupied', NULL, 6),
(2, 'icu', 'ICU-102', 'maintenance', NULL, 6);

-- Insert sample communications
INSERT INTO communications (emergency_request_id, sender_id, receiver_id, message, message_type, is_read) VALUES
(1, 3, 5, 'Patient pickup confirmed, ETA 15 minutes', 'text', true),
(1, 5, 3, 'ICU bed reserved, room 204 ready', 'text', true),
(2, 2, NULL, 'Emergency request submitted', 'system', false);