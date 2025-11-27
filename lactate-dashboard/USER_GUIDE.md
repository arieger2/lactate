# Lactate Dashboard - Setup Guide

## Prerequisites
- **Node.js** 18+ 
- **PostgreSQL** 12+
- **Docker** (optional, for PostgreSQL)

## Quick Start

### 1. Install Dependencies
```bash
git clone <repository>
cd lactate-dashboard
npm install
```

### 2. Database Setup

#### Option A: Docker (Recommended)
```bash
# Start PostgreSQL with TimescaleDB
docker run -d --name timescaledb -p 5432:5432 \
  -e POSTGRES_DB=laktat \
  -e POSTGRES_USER=arieger \
  -e POSTGRES_PASSWORD=LisgumuM20251! \
  timescale/timescaledb:latest-pg16

# Initialize database schema
psql -h localhost -U arieger -d laktat -f db/schema.sql
```

#### Option B: Local PostgreSQL
```bash
# Create database and user
createdb laktat
psql laktat -f db/schema.sql
```

### 3. Configuration
Create `config/app.config.json`:
```json
{
  "database": {
    "host": "localhost",
    "port": 5432,
    "database": "laktat", 
    "user": "arieger",
    "password": "LisgumuM20251!",
    "ssl": false,
    "pool": {
      "min": 2,
      "max": 10
    }
  },
  "application": {
    "name": "Lactate Dashboard",
    "version": "0.6",
    "environment": "development"
  }
}
```

### 4. Environment Variables
Create `.env.local`:
```bash
NODE_ENV=development
PORT=3000
```

### 5. Start Development Server
```bash
npm run dev
```

Visit: `http://localhost:3000`

## Usage Guide

### Customer Management
1. **Navigate to "Lactate Input" tab**
2. **Search or create customers**:
   - Search by name, ID, or email
   - Click "Create New Customer" for new entries
   - Required: Name and Customer ID
   - Optional: Email, phone, date of birth, notes

### Measurement Entry
1. **Select a customer first**
2. **Add measurements**:
   - Power (W) and Lactate (mmol/L) are required
   - Heart Rate and VO₂ are optional
   - Add notes for context
3. **Send data**: Individual or batch submission

### Scientific Analysis  
1. **Switch to "Performance Curve" tab**
2. **View real-time analysis**:
   - 8 threshold calculation methods available
   - Interactive charts with training zones
   - Scientific methodology explanations

### Device Integration
External devices can automatically send data:
```bash
curl -X POST http://localhost:3000/api/device-interface \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "lactate-analyzer-01",
    "customerId": "CUSTOMER001", 
    "measurementData": [
      {"lactate": 2.5, "power": 200, "heartRate": 150}
    ]
  }'
```

## Configuration Management

### Dynamic Database Updates (No Restart Required!)
1. **Open Settings tab in application**
2. **Update database configuration**
3. **Click "Save Configuration"**
4. **Connection pool recreates automatically**

### Manual Configuration Update
Edit `config/app.config.json` and save. The application detects changes and updates connections automatically.

## Production Deployment

### 1. Build Application
```bash
npm run build
npm run start
```

### 2. Production Database
```bash
# Production database setup
psql -h production-host -U username -d laktat -f db/schema.sql
```

### 3. Production Configuration
Update `config/app.config.json` with production database credentials:
```json
{
  "database": {
    "host": "production-db-host",
    "port": 5432,
    "database": "laktat_production",
    "user": "production_user", 
    "password": "secure_password",
    "ssl": true
  }
}
```

## Troubleshooting

### Database Connection Issues
1. **Check PostgreSQL is running**: `docker ps` or `pg_isready`
2. **Verify credentials in config/app.config.json**
3. **Check console logs for connection errors**

### Application Not Starting
1. **Install dependencies**: `npm install`
2. **Check Node.js version**: `node --version` (requires 18+)
3. **Verify config file exists**: `config/app.config.json`

### Data Not Appearing
1. **Check customer is selected** in Lactate Input tab
2. **Verify database connection** in Settings tab  
3. **Check console for API errors**

### Performance Issues
1. **Database indexes**: Ensure `db/schema.sql` indexes are created
2. **Connection pool**: Adjust min/max in config if needed
3. **Browser performance**: Use Chrome/Firefox for best chart rendering

## Features Overview

### Scientific Methods
- **DMAX**: Maximum deviation from baseline-peak line
- **LT2/IANS**: Individual anaerobic threshold  
- **Mader**: Fixed 4.0 mmol/L threshold
- **Modified Dmax**: Refined DMAX calculation
- **FES**: Fatigue equivalent state
- **Coggan**: Power-based threshold zones
- **Seiler**: 3-zone polarized model
- **INSCYD**: Lactate steady state analysis

### Data Export
- Measurements automatically saved to PostgreSQL
- Real-time synchronization between tabs
- Session-based data organization
- Customer relationship tracking

### Device Compatibility  
- REST API for external lactate analyzers
- Flexible JSON format support
- Automatic customer linking
- Real-time data processing

## Support

### Console Logging
Enable verbose logging by editing `lib/configManager.ts`:
```typescript
const DEBUG = true; // Set to true for detailed logs
```

### Database Inspection
```bash
# Connect to database
psql -h localhost -U arieger -d laktat

# Check tables
\dt

# View customers
SELECT * FROM customers LIMIT 5;

# View recent measurements  
SELECT * FROM lactate_data ORDER BY created_at DESC LIMIT 10;
```

### API Testing
Test endpoints manually:
```bash
# Check database status
curl http://localhost:3000/api/db-status

# Search customers
curl "http://localhost:3000/api/customers?search=test"

# Create customer
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "customerId": "TEST001"}'
```