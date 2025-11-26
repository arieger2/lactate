#!/usr/bin/env zsh
# Cleanup Script for .env.local
# This removes database configuration from .env.local
# After this, config/app.config.json becomes the ONLY source of database truth

# IMPORTANT: Only run this AFTER verifying the application works with the new architecture!

set -e

echo "🧹 Cleaning up .env.local - Removing database config"
echo "====================================================="
echo ""
echo "⚠️  WARNING: This will remove the following from .env.local:"
echo "   - DB_HOST"
echo "   - DB_PORT"
echo "   - DB_NAME"
echo "   - DB_USER"
echo "   - DB_PASSWORD"
echo "   - DB_SSL"
echo ""
echo "After cleanup:"
echo "   ✓ All database config comes from config/app.config.json ONLY"
echo "   ✓ No redundant configuration"
echo "   ✓ Single source of truth"
echo ""

read -r "?Continue with cleanup? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
    echo "ℹ️  .env.local not found - nothing to clean."
    exit 0
fi

echo ""
echo "Creating backup: .env.local.backup"
cp "$ENV_FILE" "$ENV_FILE.backup"
echo "✓ Backup created"

# Create a temporary file with database vars removed
temp_file=$(mktemp)
grep -v "^DB_HOST=" "$ENV_FILE" > "$temp_file" 2>/dev/null || true
grep -v "^DB_PORT=" "$temp_file" > "$temp_file.2" 2>/dev/null || true
mv "$temp_file.2" "$temp_file"
grep -v "^DB_NAME=" "$temp_file" > "$temp_file.2" 2>/dev/null || true
mv "$temp_file.2" "$temp_file"
grep -v "^DB_USER=" "$temp_file" > "$temp_file.2" 2>/dev/null || true
mv "$temp_file.2" "$temp_file"
grep -v "^DB_PASSWORD=" "$temp_file" > "$temp_file.2" 2>/dev/null || true
mv "$temp_file.2" "$temp_file"
grep -v "^DB_SSL=" "$temp_file" > "$temp_file.2" 2>/dev/null || true
mv "$temp_file.2" "$temp_file"

# Replace original file
mv "$temp_file" "$ENV_FILE"

echo "✓ Removed database config from .env.local"
echo ""
echo "Current .env.local content:"
echo "---"
cat "$ENV_FILE" 2>/dev/null || echo "(empty file)"
echo "---"
echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Database configuration now comes from:"
echo "   📄 config/app.config.json"
echo ""
echo "To verify everything works:"
echo "   1. Restart your application: npm run dev"
echo "   2. Check console for successful database connection"
echo "   3. Test Settings > Database to verify config loads correctly"
echo ""
echo "If something breaks:"
echo "   1. Restore from backup: cp .env.local.backup .env.local"
echo "   2. Check ARCHITECTURE_CHANGES.md for details"
echo ""
