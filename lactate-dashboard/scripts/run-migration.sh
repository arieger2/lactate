#!/bin/bash
# Script to apply the device metadata migration to the database

# Database connection settings (adjust as needed)
DB_NAME="laktat"
DB_HOST="localhost"
DB_USER="postgres"

echo "Applying device metadata migration to database: $DB_NAME"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "psql command not found. Please install PostgreSQL client or run the SQL manually."
    echo ""
    echo "Manual SQL to run:"
    cat scripts/add-device-metadata.sql
    exit 1
fi

# Run the migration
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/add-device-metadata.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi
