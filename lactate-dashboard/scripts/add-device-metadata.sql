-- Migration: Add device metadata fields to lactate_data table
-- These fields capture additional data from lactate measurement devices
-- All new fields are optional (nullable) to maintain backward compatibility

-- Add new columns for device metadata
ALTER TABLE lactate_data 
  ADD COLUMN IF NOT EXISTS sample_id VARCHAR(50),           -- Position/number from device
  ADD COLUMN IF NOT EXISTS glucose DECIMAL(5,2),            -- mmol/L (if configured)
  ADD COLUMN IF NOT EXISTS ph DECIMAL(4,3),                 -- pH value (if configured)
  ADD COLUMN IF NOT EXISTS temperature DECIMAL(4,1),        -- Temperature of measurement unit
  ADD COLUMN IF NOT EXISTS measurement_date DATE,           -- YYYY-MM-DD from device
  ADD COLUMN IF NOT EXISTS measurement_time TIME,           -- HH:MM:SS from device
  ADD COLUMN IF NOT EXISTS error_code VARCHAR(20),          -- Error code if measurement failed
  ADD COLUMN IF NOT EXISTS device_id VARCHAR(100),          -- Device identifier
  ADD COLUMN IF NOT EXISTS raw_data JSONB,                  -- Store any additional raw data from device
  ADD COLUMN IF NOT EXISTS vo2 DECIMAL(5,2);                -- VO2 in mL/kg/min

-- Create index for device_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_lactate_data_device_id ON lactate_data(device_id);

-- Create index for sample_id
CREATE INDEX IF NOT EXISTS idx_lactate_data_sample_id ON lactate_data(sample_id);

-- Comment on new columns for documentation
COMMENT ON COLUMN lactate_data.sample_id IS 'Sample position/number from lactate device';
COMMENT ON COLUMN lactate_data.glucose IS 'Blood glucose in mmol/L (if device is configured to measure)';
COMMENT ON COLUMN lactate_data.ph IS 'Blood pH value (if device is configured to measure)';
COMMENT ON COLUMN lactate_data.temperature IS 'Temperature of measurement unit in degrees';
COMMENT ON COLUMN lactate_data.measurement_date IS 'Date of measurement as reported by device (YYYY-MM-DD)';
COMMENT ON COLUMN lactate_data.measurement_time IS 'Time of measurement as reported by device (HH:MM:SS)';
COMMENT ON COLUMN lactate_data.error_code IS 'Error code if measurement failed (null if successful)';
COMMENT ON COLUMN lactate_data.device_id IS 'Identifier of the lactate measurement device';
COMMENT ON COLUMN lactate_data.raw_data IS 'JSON blob containing any additional raw data from device';
COMMENT ON COLUMN lactate_data.vo2 IS 'VO2 oxygen consumption in mL/kg/min';
