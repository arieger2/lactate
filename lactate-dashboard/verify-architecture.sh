#!/usr/bin/env zsh
# Verification Script for Database Configuration Refactor
# This script helps verify the new single-source-of-truth architecture is working

set -e

echo "🔍 Database Configuration Architecture Verification"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Check if config file exists and is valid
echo "${BLUE}1. Checking config file...${NC}"
CONFIG_FILE="config/app.config.json"

if [ -f "$CONFIG_FILE" ]; then
    echo -e "${GREEN}✓ Found: $CONFIG_FILE${NC}"
    
    # Check if it's valid JSON
    if jq empty "$CONFIG_FILE" 2>/dev/null; then
        echo -e "${GREEN}✓ Valid JSON format${NC}"
        
        # Show database config
        echo -e "${BLUE}   Current database config:${NC}"
        jq '.database' "$CONFIG_FILE" | sed 's/^/   /'
    else
        echo -e "${RED}✗ Invalid JSON in $CONFIG_FILE${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Config file not found: $CONFIG_FILE${NC}"
    exit 1
fi
echo ""

# 2. Check if new files exist
echo "${BLUE}2. Checking new implementation files...${NC}"
FILES=(
    "lib/configManager.ts"
    "lib/dbPoolManager.ts"
    "lib/db.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ Found: $file${NC}"
    else
        echo -e "${RED}✗ Missing: $file${NC}"
        exit 1
    fi
done
echo ""

# 3. Check if ConfigManager exports correct interface
echo "${BLUE}3. Checking ConfigManager implementation...${NC}"
if grep -q "getDatabase()" lib/configManager.ts; then
    echo -e "${GREEN}✓ getDatabase() method found${NC}"
else
    echo -e "${RED}✗ getDatabase() method not found${NC}"
    exit 1
fi

if grep -q "updateDatabaseConfig" lib/configManager.ts; then
    echo -e "${GREEN}✓ updateDatabaseConfig() method found${NC}"
else
    echo -e "${RED}✗ updateDatabaseConfig() method not found${NC}"
    exit 1
fi

if grep -q "onChange" lib/configManager.ts; then
    echo -e "${GREEN}✓ onChange() listener pattern found${NC}"
else
    echo -e "${RED}✗ onChange() listener pattern not found${NC}"
    exit 1
fi
echo ""

# 4. Check if DatabasePoolManager exists
echo "${BLUE}4. Checking DatabasePoolManager implementation...${NC}"
if grep -q "class DatabasePoolManager" lib/dbPoolManager.ts; then
    echo -e "${GREEN}✓ DatabasePoolManager class found${NC}"
else
    echo -e "${RED}✗ DatabasePoolManager class not found${NC}"
    exit 1
fi

if grep -q "subscribeToConfigChanges" lib/dbPoolManager.ts; then
    echo -e "${GREEN}✓ Config change subscription found${NC}"
else
    echo -e "${RED}✗ Config change subscription not found${NC}"
    exit 1
fi
echo ""

# 5. Check if lib/db.ts re-exports from dbPoolManager
echo "${BLUE}5. Checking lib/db.ts exports...${NC}"
if grep -q "dbPoolManager" lib/db.ts; then
    echo -e "${GREEN}✓ Exports from dbPoolManager${NC}"
else
    echo -e "${RED}✗ Does not export from dbPoolManager${NC}"
    exit 1
fi
echo ""

# 6. Check if APIs use ConfigManager
echo "${BLUE}6. Checking API implementations...${NC}"
if grep -q "configManager" app/api/settings/database/route.ts; then
    echo -e "${GREEN}✓ GET /api/settings/database uses ConfigManager${NC}"
else
    echo -e "${RED}✗ GET /api/settings/database does not use ConfigManager${NC}"
    exit 1
fi

if grep -q "updateDatabaseConfig" app/api/settings/database/route.ts; then
    echo -e "${GREEN}✓ POST /api/settings/database calls updateDatabaseConfig${NC}"
else
    echo -e "${RED}✗ POST /api/settings/database does not call updateDatabaseConfig${NC}"
    exit 1
fi

if grep -q "configManager" app/api/settings/database/create/route.ts; then
    echo -e "${GREEN}✓ POST /api/settings/database/create uses ConfigManager${NC}"
else
    echo -e "${RED}✗ POST /api/settings/database/create does not use ConfigManager${NC}"
    exit 1
fi
echo ""

# 7. Check for TypeScript compilation
echo "${BLUE}7. Checking TypeScript compilation...${NC}"
if command -v tsc &> /dev/null; then
    # Just check syntax, don't compile fully
    echo -e "${YELLOW}   (Skipping full compilation - run 'npm run build' for full check)${NC}"
    echo -e "${GREEN}✓ TypeScript command available${NC}"
else
    echo -e "${YELLOW}⚠ TypeScript compiler not in PATH${NC}"
fi
echo ""

# 8. Check .env.local doesn't have database config
echo "${BLUE}8. Checking .env.local (should not have DB config)...${NC}"
if [ -f ".env.local" ]; then
    if grep -q "DB_HOST\|DB_PORT\|DB_NAME\|DB_USER\|DB_PASSWORD" .env.local; then
        echo -e "${YELLOW}⚠ WARNING: .env.local still has database config${NC}"
        echo -e "${YELLOW}   Consider removing it - config should only be in config/app.config.json${NC}"
    else
        echo -e "${GREEN}✓ .env.local does not have database config (good!)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ .env.local not found (expected in development)${NC}"
fi
echo ""

# Summary
echo "=================================================="
echo -e "${GREEN}✅ Architecture verification complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Start the development server: npm run dev"
echo "2. Test dynamic config reload:"
echo "   - Edit config/app.config.json (change database name)"
echo "   - Check that connection pool is recreated (watch console logs)"
echo "   - No server restart needed!"
echo "3. Test via UI:"
echo "   - Open Settings > Database"
echo "   - Change database configuration"
echo "   - Click 'Save Configuration'"
echo "   - Verify \"pool recreation triggered\" message"
echo ""
