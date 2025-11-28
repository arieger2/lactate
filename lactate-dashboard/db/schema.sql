-- Lactate Dashboard Database Schema
-- Database: laktat

-- Create customers table for managing customer information
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    date_of_birth DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table for tracking test sessions
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    customer_id VARCHAR(255),
    athlete_name VARCHAR(255),
    test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    test_type VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE SET NULL
);

-- Create lactate_data table for storing measurement points
CREATE TABLE IF NOT EXISTS lactate_data (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    customer_id VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    power INTEGER NOT NULL,
    lactate DECIMAL(4,2) NOT NULL,
    heart_rate INTEGER,
    fat_oxidation DECIMAL(4,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE SET NULL
);

-- Create threshold_results table for storing calculated thresholds
CREATE TABLE IF NOT EXISTS threshold_results (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    method VARCHAR(50) NOT NULL,
    lt1_power INTEGER,
    lt1_lactate DECIMAL(4,2),
    lt2_power INTEGER,
    lt2_lactate DECIMAL(4,2),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
    UNIQUE(session_id, method)
);

-- Create training_zones table for storing calculated training zones
CREATE TABLE IF NOT EXISTS training_zones (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    method VARCHAR(50) NOT NULL,
    zone_number INTEGER NOT NULL,
    zone_name VARCHAR(100) NOT NULL,
    power_min INTEGER NOT NULL,
    power_max INTEGER NOT NULL,
    lactate_range VARCHAR(50),
    description TEXT,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

-- Create adjusted_thresholds table for storing manually adjusted threshold values
CREATE TABLE IF NOT EXISTS adjusted_thresholds (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    lt1_power INTEGER NOT NULL,
    lt1_lactate DECIMAL(4,2) NOT NULL,
    lt2_power INTEGER NOT NULL,
    lt2_lactate DECIMAL(4,2) NOT NULL,
    adjusted_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    UNIQUE(session_id, customer_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_sessions_customer_id ON sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_lactate_data_session_id ON lactate_data(session_id);
CREATE INDEX IF NOT EXISTS idx_lactate_data_customer_id ON lactate_data(customer_id);
CREATE INDEX IF NOT EXISTS idx_lactate_data_timestamp ON lactate_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_threshold_results_session_id ON threshold_results(session_id);
CREATE INDEX IF NOT EXISTS idx_training_zones_session_id ON training_zones(session_id);
CREATE INDEX IF NOT EXISTS idx_adjusted_thresholds_session_id ON adjusted_thresholds(session_id);
CREATE INDEX IF NOT EXISTS idx_adjusted_thresholds_customer_id ON adjusted_thresholds(customer_id);

-- Insert sample data (optional)
-- INSERT INTO sessions (session_id, athlete_name, test_type) 
-- VALUES ('sample-session-1', 'Max Mustermann', 'Stufentest');

-- Add comments to tables
COMMENT ON TABLE customers IS 'Stores customer/athlete information';
COMMENT ON TABLE sessions IS 'Stores lactate test sessions';
COMMENT ON TABLE lactate_data IS 'Stores individual lactate measurement points';
COMMENT ON TABLE threshold_results IS 'Stores calculated lactate thresholds for different methods';
COMMENT ON TABLE training_zones IS 'Stores calculated training zones based on threshold methods';
COMMENT ON TABLE adjusted_thresholds IS 'Stores manually adjusted threshold values by users';