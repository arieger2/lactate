-- ========================================
-- PostgreSQL Backup & Restore Methods
-- ========================================
-- This file contains SQL functions and procedures for backing up and restoring
-- the Lactate Dashboard database to/from the filesystem
-- ========================================

\c laktat;

-- ========================================
-- 1. BACKUP FUNCTIONS
-- ========================================

-- Function to get current timestamp for backup filenames
CREATE OR REPLACE FUNCTION get_backup_timestamp()
RETURNS TEXT AS $$
BEGIN
    RETURN to_char(CURRENT_TIMESTAMP, 'YYYYMMDD_HH24MISS');
END;
$$ LANGUAGE plpgsql;

-- Function to create a full database backup
-- Usage: SELECT create_full_backup();
CREATE OR REPLACE FUNCTION create_full_backup()
RETURNS TEXT AS $$
DECLARE
    backup_file TEXT;
    backup_path TEXT := '/tmp/lactate_backups/';
    timestamp TEXT;
BEGIN
    timestamp := get_backup_timestamp();
    backup_file := backup_path || 'laktat_full_' || timestamp || '.sql';
    
    -- Create backup directory if it doesn't exist
    EXECUTE format('COPY (SELECT 1) TO PROGRAM ''mkdir -p %s''', backup_path);
    
    -- Create full backup using pg_dump
    EXECUTE format('COPY (SELECT 1) TO PROGRAM ''pg_dump -h localhost -U postgres -d laktat -F p -f %s''', backup_file);
    
    RETURN 'Backup created: ' || backup_file;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Backup failed: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to create a compressed backup
-- Usage: SELECT create_compressed_backup();
CREATE OR REPLACE FUNCTION create_compressed_backup()
RETURNS TEXT AS $$
DECLARE
    backup_file TEXT;
    backup_path TEXT := '/tmp/lactate_backups/';
    timestamp TEXT;
BEGIN
    timestamp := get_backup_timestamp();
    backup_file := backup_path || 'laktat_compressed_' || timestamp || '.sql.gz';
    
    -- Create backup directory if it doesn't exist
    EXECUTE format('COPY (SELECT 1) TO PROGRAM ''mkdir -p %s''', backup_path);
    
    -- Create compressed backup
    EXECUTE format('COPY (SELECT 1) TO PROGRAM ''pg_dump -h localhost -U postgres -d laktat -F p | gzip > %s''', backup_file);
    
    RETURN 'Compressed backup created: ' || backup_file;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Compressed backup failed: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to backup only data (no schema)
-- Usage: SELECT create_data_only_backup();
CREATE OR REPLACE FUNCTION create_data_only_backup()
RETURNS TEXT AS $$
DECLARE
    backup_file TEXT;
    backup_path TEXT := '/tmp/lactate_backups/';
    timestamp TEXT;
BEGIN
    timestamp := get_backup_timestamp();
    backup_file := backup_path || 'laktat_data_only_' || timestamp || '.sql';
    
    -- Create backup directory
    EXECUTE format('COPY (SELECT 1) TO PROGRAM ''mkdir -p %s''', backup_path);
    
    -- Backup data only
    EXECUTE format('COPY (SELECT 1) TO PROGRAM ''pg_dump -h localhost -U postgres -d laktat -a -F p -f %s''', backup_file);
    
    RETURN 'Data-only backup created: ' || backup_file;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Data-only backup failed: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to backup specific table
-- Usage: SELECT backup_table('sessions');
CREATE OR REPLACE FUNCTION backup_table(table_name TEXT)
RETURNS TEXT AS $$
DECLARE
    backup_file TEXT;
    backup_path TEXT := '/tmp/lactate_backups/';
    timestamp TEXT;
BEGIN
    timestamp := get_backup_timestamp();
    backup_file := backup_path || 'laktat_' || table_name || '_' || timestamp || '.sql';
    
    -- Create backup directory
    EXECUTE format('COPY (SELECT 1) TO PROGRAM ''mkdir -p %s''', backup_path);
    
    -- Backup specific table
    EXECUTE format('COPY (SELECT 1) TO PROGRAM ''pg_dump -h localhost -U postgres -d laktat -t %I -F p -f %s''', 
                   table_name, backup_file);
    
    RETURN 'Table backup created: ' || backup_file;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Table backup failed: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to export table to CSV
-- Usage: SELECT export_table_to_csv('sessions');
CREATE OR REPLACE FUNCTION export_table_to_csv(table_name TEXT)
RETURNS TEXT AS $$
DECLARE
    csv_file TEXT;
    backup_path TEXT := '/tmp/lactate_backups/';
    timestamp TEXT;
BEGIN
    timestamp := get_backup_timestamp();
    csv_file := backup_path || 'laktat_' || table_name || '_' || timestamp || '.csv';
    
    -- Create backup directory
    EXECUTE format('COPY (SELECT 1) TO PROGRAM ''mkdir -p %s''', backup_path);
    
    -- Export to CSV
    EXECUTE format('COPY (SELECT * FROM %I) TO %L WITH CSV HEADER', table_name, csv_file);
    
    RETURN 'CSV export created: ' || csv_file;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'CSV export failed: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 2. RESTORE FUNCTIONS
-- ========================================

-- Function to restore from full backup
-- Usage: SELECT restore_from_backup('/tmp/lactate_backups/laktat_full_20251202_120000.sql');
CREATE OR REPLACE FUNCTION restore_from_backup(backup_file TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Drop existing connections
    PERFORM pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE datname = 'laktat' AND pid <> pg_backend_pid();
    
    -- Restore from backup
    EXECUTE format('COPY (SELECT 1) TO PROGRAM ''psql -h localhost -U postgres -d laktat -f %s''', backup_file);
    
    RETURN 'Database restored from: ' || backup_file;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Restore failed: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to restore from compressed backup
-- Usage: SELECT restore_from_compressed_backup('/tmp/lactate_backups/laktat_compressed_20251202_120000.sql.gz');
CREATE OR REPLACE FUNCTION restore_from_compressed_backup(backup_file TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Drop existing connections
    PERFORM pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE datname = 'laktat' AND pid <> pg_backend_pid();
    
    -- Restore from compressed backup
    EXECUTE format('COPY (SELECT 1) TO PROGRAM ''gunzip -c %s | psql -h localhost -U postgres -d laktat''', backup_file);
    
    RETURN 'Database restored from compressed: ' || backup_file;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Restore from compressed failed: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to import CSV into table
-- Usage: SELECT import_csv_to_table('sessions', '/tmp/lactate_backups/laktat_sessions_20251202_120000.csv');
CREATE OR REPLACE FUNCTION import_csv_to_table(table_name TEXT, csv_file TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Import from CSV
    EXECUTE format('COPY %I FROM %L WITH CSV HEADER', table_name, csv_file);
    
    RETURN 'CSV imported to table: ' || table_name;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'CSV import failed: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. BACKUP MANAGEMENT FUNCTIONS
-- ========================================

-- Function to list available backups
CREATE OR REPLACE FUNCTION list_backups()
RETURNS TABLE(filename TEXT, size TEXT, modified TIMESTAMP) AS $$
BEGIN
    RETURN QUERY
    EXECUTE 'COPY (SELECT 1) TO PROGRAM ''ls -lh /tmp/lactate_backups/ | tail -n +2''';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'List backups failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to delete old backups (older than N days)
-- Usage: SELECT cleanup_old_backups(30); -- Delete backups older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_backups(days_old INTEGER DEFAULT 30)
RETURNS TEXT AS $$
BEGIN
    EXECUTE format('COPY (SELECT 1) TO PROGRAM ''find /tmp/lactate_backups/ -name "laktat_*" -mtime +%s -delete''', days_old);
    
    RETURN 'Deleted backups older than ' || days_old || ' days';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Cleanup failed: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to get backup statistics
CREATE OR REPLACE FUNCTION get_backup_stats()
RETURNS TABLE(
    total_backups BIGINT,
    total_size TEXT,
    oldest_backup TIMESTAMP,
    newest_backup TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_backups,
        pg_size_pretty(SUM(pg_stat_file('/tmp/lactate_backups/' || filename).size)) as total_size,
        MIN((pg_stat_file('/tmp/lactate_backups/' || filename)).modification)::TIMESTAMP as oldest_backup,
        MAX((pg_stat_file('/tmp/lactate_backups/' || filename)).modification)::TIMESTAMP as newest_backup
    FROM pg_ls_dir('/tmp/lactate_backups') AS filename
    WHERE filename LIKE 'laktat_%';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Get backup stats failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. AUTOMATED BACKUP SCHEDULING
-- ========================================

-- Function to create automatic daily backup
-- This requires pg_cron extension to be installed
-- Installation: CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE OR REPLACE FUNCTION setup_daily_backup()
RETURNS TEXT AS $$
BEGIN
    -- Schedule daily backup at 2 AM
    PERFORM cron.schedule(
        'daily-lactate-backup',
        '0 2 * * *',  -- Every day at 2 AM
        'SELECT create_compressed_backup();'
    );
    
    RETURN 'Daily backup scheduled at 2:00 AM';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Scheduling failed (pg_cron extension required): ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- USAGE EXAMPLES
-- ========================================

-- Create a full backup:
-- SELECT create_full_backup();

-- Create a compressed backup (recommended):
-- SELECT create_compressed_backup();

-- Backup only data (no schema):
-- SELECT create_data_only_backup();

-- Backup specific table:
-- SELECT backup_table('sessions');

-- Export table to CSV:
-- SELECT export_table_to_csv('lactate_data');

-- Restore from backup:
-- SELECT restore_from_backup('/tmp/lactate_backups/laktat_full_20251202_120000.sql');

-- Restore from compressed backup:
-- SELECT restore_from_compressed_backup('/tmp/lactate_backups/laktat_compressed_20251202_120000.sql.gz');

-- Import CSV:
-- SELECT import_csv_to_table('sessions', '/tmp/lactate_backups/laktat_sessions_20251202_120000.csv');

-- List all backups:
-- SELECT * FROM list_backups();

-- Get backup statistics:
-- SELECT * FROM get_backup_stats();

-- Cleanup old backups:
-- SELECT cleanup_old_backups(30);

-- Setup automated daily backups:
-- SELECT setup_daily_backup();

\echo '✅ Backup & Restore functions created successfully!';
\echo '';
\echo '📦 Available backup functions:';
\echo '   - create_full_backup()';
\echo '   - create_compressed_backup()';
\echo '   - create_data_only_backup()';
\echo '   - backup_table(table_name)';
\echo '   - export_table_to_csv(table_name)';
\echo '';
\echo '🔄 Available restore functions:';
\echo '   - restore_from_backup(backup_file)';
\echo '   - restore_from_compressed_backup(backup_file)';
\echo '   - import_csv_to_table(table_name, csv_file)';
\echo '';
\echo '📊 Management functions:';
\echo '   - list_backups()';
\echo '   - get_backup_stats()';
\echo '   - cleanup_old_backups(days_old)';
\echo '   - setup_daily_backup()';
