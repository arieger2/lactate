-- Migration: Add general_settings table
-- Date: 2025-12-09
-- Description: Adds general_settings table for application-wide settings

-- Create general_settings table
CREATE TABLE IF NOT EXISTS general_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO general_settings (setting_key, setting_value) 
VALUES ('measurement_input_style', 'measurement_by_measurement')
ON CONFLICT (setting_key) DO NOTHING;

-- Add comment
COMMENT ON TABLE general_settings IS 'Stores application-wide general settings';
COMMENT ON COLUMN general_settings.setting_key IS 'Unique identifier for the setting';
COMMENT ON COLUMN general_settings.setting_value IS 'Value of the setting (stored as text, parse as needed)';
