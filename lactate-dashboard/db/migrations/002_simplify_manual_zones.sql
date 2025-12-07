-- Migration: Simplify manual_zones table and remove zones_manually_edited flag
-- Date: 2025-12-07
-- Purpose: Remove redundant static data from manual_zones and misplaced flag from adjusted_thresholds

-- Step 1: Remove zones_manually_edited column from adjusted_thresholds
ALTER TABLE adjusted_thresholds 
DROP COLUMN IF EXISTS zones_manually_edited;

-- Step 2: Simplify manual_zones table - remove static columns
ALTER TABLE manual_zones 
DROP COLUMN IF EXISTS zone_name,
DROP COLUMN IF EXISTS zone_color,
DROP COLUMN IF EXISTS zone_border_color,
DROP COLUMN IF EXISTS zone_description;

-- The table now only contains:
-- - id (primary key)
-- - test_id (foreign key)
-- - profile_id (foreign key)
-- - zone_id (1-5)
-- - range_start (user-adjusted boundary)
-- - range_end (user-adjusted boundary)
-- - created_at
-- - updated_at
