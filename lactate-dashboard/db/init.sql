-- Initialize Database Script for Lactate Dashboard
-- Run this script to set up the PostgreSQL database

-- Connect to your PostgreSQL server and create the database
-- CREATE DATABASE laktat;

-- Switch to the laktat database
\c laktat;

-- Create the schema
\i schema.sql

-- Verify tables were created
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Show table structures
\d sessions
\d lactate_data  
\d threshold_results
\d training_zones

-- Insert sample data for testing (optional)
INSERT INTO sessions (session_id, athlete_name, test_type, notes) 
VALUES 
  ('test-session-1', 'Max Mustermann', 'Stufentest', 'Baseline test'),
  ('test-session-2', 'Anna Schmidt', 'Stufentest', 'Follow-up test');

-- Sample lactate data points
INSERT INTO lactate_data (session_id, power, lactate, heart_rate, fat_oxidation) 
VALUES 
  ('test-session-1', 150, 1.5, 140, 0.8),
  ('test-session-1', 200, 2.1, 155, 1.2),
  ('test-session-1', 250, 2.8, 170, 1.0),
  ('test-session-1', 300, 4.2, 185, 0.6),
  ('test-session-1', 350, 6.8, 195, 0.3);

-- Sample threshold results
INSERT INTO threshold_results (session_id, method, lt1_power, lt1_lactate, lt2_power, lt2_lactate)
VALUES 
  ('test-session-1', 'DMAX', 220, 2.2, 280, 4.0),
  ('test-session-1', 'LT2/IANS', 210, 2.0, 270, 3.8);

-- Verify data was inserted
SELECT 'Sessions' as table_name, count(*) as record_count FROM sessions
UNION ALL
SELECT 'Lactate Data', count(*) FROM lactate_data  
UNION ALL
SELECT 'Threshold Results', count(*) FROM threshold_results
UNION ALL
SELECT 'Training Zones', count(*) FROM training_zones;

-- Show sample data
SELECT s.session_id, s.athlete_name, count(ld.id) as data_points
FROM sessions s
LEFT JOIN lactate_data ld ON s.session_id = ld.session_id
GROUP BY s.session_id, s.athlete_name;

ECHO 'Database setup completed successfully!';