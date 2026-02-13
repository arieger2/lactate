# Lactate Dashboard - Setup Guide

## Prerequisites

### Required Software
- **Node.js** (v18 or later): https://nodejs.org/
- **Git**: https://git-scm.com/
- **PostgreSQL Client** (optional, for database setup)

### Check Node.js Installation
```bash
node --version  # Should show v18.x.x or later
npm --version   # Should show npm version
```

## Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/arieger2/lactate.git
cd lactate/lactate-dashboard
```

### 2. Install Dependencies
```bash
# Install all required packages
npm install

# This will install:
# - Next.js 16.0.1
# - React & TypeScript
# - Tailwind CSS v4
# - ECharts for visualization
# - PostgreSQL client (pg)
# - All other dependencies
```

### 3. Environment Configuration
Create the `.env.local` file with database settings:
```bash
# Copy the example or create manually
cp .env.local.example .env.local

# Or create .env.local with these contents:
cat > .env.local << EOF
# Database Configuration
DB_HOST=192.168.5.220
DB_PORT=5432
DB_NAME=laktat
DB_USER=arieger
DB_PASSWORD=YOUR_DB_PASSWORD
DB_SSL=true
DB_READY=false

# Application Configuration
NODE_ENV=development
PORT=3000

# Database Pool Settings
DB_POOL_MIN=2
DB_POOL_MAX=10
EOF
```

### 4. Database Setup (Optional)
If PostgreSQL tables don't exist yet:
```bash
# Test database connection
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: '192.168.5.220',
  port: 5432,
  database: 'laktat',
  user: 'arieger',
  password: 'YOUR_DB_PASSWORD',
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(client => {
    console.log('✅ Database connection successful');
    client.release();
    pool.end();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });
"
```

### 5. Start the Application
```bash
# Development mode
npm run dev

# The dashboard will be available at:
# - Local: http://localhost:3000
# - Network: http://[your-ip]:3000
```

## Troubleshooting Common Issues

### Error: "next: not found"
**Problem**: Dependencies not installed
```bash
# Solution: Install dependencies first
npm install
```

### Error: "Could not read package.json"
**Problem**: Wrong directory
```bash
# Solution: Navigate to correct directory
cd lactate-dashboard
ls -la  # Should show package.json
```

### Error: Database connection fails
**Problem**: Network/SSL issues
```bash
# Solution: Check network connectivity
ping 192.168.5.220

# Or run in memory-only mode (no database)
# The app will automatically fall back to memory storage
```

### Error: Permission denied
**Problem**: Port 3000 already in use
```bash
# Solution: Use different port
PORT=3001 npm run dev

# Or kill existing process
lsof -ti:3000 | xargs kill -9
```

## Production Deployment

### Build for Production
```bash
# Create optimized build
npm run build

# Start production server
npm run start

# Note: If you get TypeScript SSL configuration errors during build,
# the SSL configuration in lib/db.ts has been fixed to remove
# the invalid 'agent' property that's not compatible with TypeScript
```

### Using PM2 (Process Manager)
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start npm --name "lactate-dashboard" -- start
pm2 save
pm2 startup
```

### Docker Deployment (Optional)
```dockerfile
# Create Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Features Available

### 🎯 Core Features
- **3 Tabs**: Dashboard, Lactate Input, Performance Curve
- **8 Scientific Methods**: DMAX, LT2/IANS, Mader, Stegmann, FES, Coggan, Seiler, INSCYD
- **5-Zone Training Model**: Seamless power zones with lactate ranges
- **Real-time Data**: Webhook API with live polling
- **PostgreSQL Integration**: Persistent data storage with memory fallback

### 🆕 Enhanced Lactate Input Features (V0.2)
- **Customer Management**: Search, create, and manage customer profiles
- **Manual Measurement Entry**: Structured input with editable measurement table
- **Device Interface**: API endpoint for automatic measurement device integration
- **Real-time Table**: Live display of entered measurements with edit/delete capabilities
- **Batch Operations**: Send multiple measurements to dashboard at once

### 🔧 API Endpoints
- `POST /api/lactate-webhook` - Send measurement data
- `GET /api/lactate-webhook?sessionId=X` - Retrieve session data
- `DELETE /api/lactate-webhook?sessionId=X` - Clear session data
- `GET /api/db-status` - Check database connection

### 🆕 Customer & Device API Endpoints (V0.2)
- `GET /api/customers?search=query` - Search customers
- `POST /api/customers` - Create new customer
- `GET /api/customers/[id]` - Get specific customer
- `POST /api/device-interface` - Receive automatic device measurements
- `GET /api/device-interface` - Get device integration documentation

### 📊 Usage
1. **Input Data**: Use "Lactate Input" tab for manual data entry
2. **Simulate**: Use "Simulieren" button for test data
3. **Analyze**: Switch to "Performance Curve" for scientific analysis
4. **Export**: Data is automatically saved to PostgreSQL

## Support

### Check Application Status
```bash
# Check if app is running
curl http://localhost:3000/api/db-status

# Check database connection
curl http://localhost:3000/api/lactate-webhook
```

### Logs and Debugging
```bash
# View application logs
npm run dev 2>&1 | tee app.log

# Check database logs
tail -f /var/log/postgresql/postgresql-*.log
```

For issues, check the console output and ensure all prerequisites are installed.