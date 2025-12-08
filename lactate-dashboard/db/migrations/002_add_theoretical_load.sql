-- Migration: Add missing columns and tables
-- Date: 2025-12-08
-- Description: Adds theoretical_load column, fixes duration_min type, and adds manual_zones table

-- 1. Add theoretical_load column to stages table
ALTER TABLE stages 
ADD COLUMN IF NOT EXISTS theoretical_load DECIMAL(5,2);

-- 2. Change duration_min from INTEGER to NUMERIC(5,3) for decimal minutes support
ALTER TABLE stages 
ALTER COLUMN duration_min TYPE NUMERIC(5,3);

-- 3. Create manual_zones table if it doesn't exist
CREATE TABLE IF NOT EXISTS manual_zones (
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

-- 4. Create indexes for manual_zones
CREATE INDEX IF NOT EXISTS idx_manual_zones_test_id ON manual_zones(test_id);
CREATE INDEX IF NOT EXISTS idx_manual_zones_profile_id ON manual_zones(profile_id);

-- Add comments
COMMENT ON COLUMN stages.theoretical_load IS 'Theoretical load that could be sustained for full stage duration (for incomplete stages)';
COMMENT ON TABLE manual_zones IS 'Stores manually adjusted training zone ranges';
