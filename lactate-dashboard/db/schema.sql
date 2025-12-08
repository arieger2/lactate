-- Lactate Dashboard Database Schema
-- Database: laktat
-- Version: 2.0 - New CustomerProfile structure

-- Drop old tables if they exist
DROP TABLE IF EXISTS adjusted_thresholds CASCADE;
DROP TABLE IF EXISTS lactate_data CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Create patient_profiles table (replaces customers)
CREATE TABLE patient_profiles (
    profile_id VARCHAR(255) PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    birth_date DATE,
    height_cm INTEGER,
    weight_kg DECIMAL(5,2),
    email VARCHAR(255),
    phone VARCHAR(50),
    additional_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create test_infos table (replaces sessions)
CREATE TABLE test_infos (
    test_id VARCHAR(255) PRIMARY KEY,
    profile_id VARCHAR(255) NOT NULL,
    test_date DATE NOT NULL,
    test_time TIME NOT NULL,
    device VARCHAR(50) NOT NULL CHECK (device IN ('bike', 'treadmill', 'other')),
    unit VARCHAR(20) NOT NULL CHECK (unit IN ('watt', 'kmh', 'other')),
    start_load DECIMAL(5,2) NOT NULL,
    increment DECIMAL(5,2) NOT NULL,
    stage_duration_min INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profile_id) REFERENCES patient_profiles(profile_id) ON DELETE CASCADE
);

-- Create stages table (replaces lactate_data)
CREATE TABLE stages (
    id SERIAL PRIMARY KEY,
    test_id VARCHAR(255) NOT NULL,
    stage INTEGER NOT NULL,
    duration_min NUMERIC(5,3) NOT NULL,
    load DECIMAL(5,2) NOT NULL,
    theoretical_load DECIMAL(5,2),
    heart_rate_bpm INTEGER,
    lactate_mmol DECIMAL(4,2) NOT NULL,
    rr_systolic INTEGER,
    rr_diastolic INTEGER,
    is_final_approximation BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES test_infos(test_id) ON DELETE CASCADE,
    UNIQUE(test_id, stage)
);

-- Create adjusted_thresholds table (updated to use test_id/profile_id)
CREATE TABLE adjusted_thresholds (
    id SERIAL PRIMARY KEY,
    test_id VARCHAR(255) NOT NULL,
    profile_id VARCHAR(255) NOT NULL,
    lt1_load NUMERIC NOT NULL,
    lt1_lactate DECIMAL(4,2) NOT NULL,
    lt2_load NUMERIC NOT NULL,
    lt2_lactate DECIMAL(4,2) NOT NULL,
    adjusted_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES test_infos(test_id) ON DELETE CASCADE,
    FOREIGN KEY (profile_id) REFERENCES patient_profiles(profile_id) ON DELETE CASCADE,
    UNIQUE(test_id)
);

-- Create manual_zones table
CREATE TABLE manual_zones (
    id SERIAL PRIMARY KEY,
    test_id VARCHAR(255) NOT NULL,
    profile_id VARCHAR(255) NOT NULL,
    zone_id INTEGER NOT NULL,
    range_start NUMERIC NOT NULL,
    range_end NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES test_infos(test_id) ON DELETE CASCADE,
    FOREIGN KEY (profile_id) REFERENCES patient_profiles(profile_id) ON DELETE CASCADE,
    UNIQUE(test_id, zone_id)
);

-- Create indexes for better performance
CREATE INDEX idx_patient_profiles_name ON patient_profiles(last_name, first_name);
CREATE INDEX idx_patient_profiles_email ON patient_profiles(email);

CREATE INDEX idx_test_infos_profile_id ON test_infos(profile_id);
CREATE INDEX idx_test_infos_test_date ON test_infos(test_date);
CREATE INDEX idx_test_infos_device ON test_infos(device);

CREATE INDEX idx_stages_test_id ON stages(test_id);
CREATE INDEX idx_stages_stage ON stages(stage);
CREATE INDEX idx_stages_load ON stages(load);

CREATE INDEX idx_adjusted_thresholds_test_id ON adjusted_thresholds(test_id);
CREATE INDEX idx_adjusted_thresholds_profile_id ON adjusted_thresholds(profile_id);

CREATE INDEX idx_manual_zones_test_id ON manual_zones(test_id);
CREATE INDEX idx_manual_zones_profile_id ON manual_zones(profile_id);

-- Add comments to tables
COMMENT ON TABLE patient_profiles IS 'Stores patient/athlete profile information';
COMMENT ON TABLE test_infos IS 'Stores test protocol information (device, unit, increment, etc.)';
COMMENT ON TABLE stages IS 'Stores individual lactate test stage measurements';
COMMENT ON TABLE adjusted_thresholds IS 'Stores manually adjusted threshold values by users';
COMMENT ON TABLE manual_zones IS 'Stores manually adjusted training zone ranges';

-- Add column comments for clarity
COMMENT ON COLUMN stages.load IS 'Load value (watt or kmh depending on test_infos.unit)';
COMMENT ON COLUMN stages.is_final_approximation IS 'Indicates if this stage was estimated/approximated';
COMMENT ON COLUMN test_infos.unit IS 'Unit of measurement: watt (bike), kmh (treadmill), or other';
COMMENT ON COLUMN test_infos.device IS 'Test device: bike, treadmill, or other';