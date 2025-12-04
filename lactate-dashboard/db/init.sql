-- Initialize Database Script for Lactate Dashboard
-- Run this script to set up the PostgreSQL database

-- Connect to your PostgreSQL server and create the database
-- CREATE DATABASE laktat;

-- Switch to the laktat database
\c laktat;

-- Create the schema
\i schema.sql

-- Import backup and restore functions
\i backup_restore.sql

-- Verify tables were created
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Show table structures
\d sessions
\d lactate_data

-- Use application interface to create sessions and customers

-- Sample data insertion removed - use application UI for data entry

-- Verify data was inserted
SELECT 'Sessions' as table_name, count(*) as record_count FROM sessions
UNION ALL
SELECT 'Lactate Data', count(*) FROM lactate_data;

-- Show sample data
SELECT s.session_id, s.athlete_name, count(ld.id) as data_points
FROM sessions s
LEFT JOIN lactate_data ld ON s.session_id = ld.session_id
GROUP BY s.session_id, s.athlete_name;

ECHO 'Database setup completed successfully!';