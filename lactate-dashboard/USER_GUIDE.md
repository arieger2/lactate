# Lactate Dashboard - User Guide

## Getting Started

### 1. Start the Application
```bash
npm run build  # Build production version
npm start      # Start production server
```

Visit: `http://localhost:3000`

## Database Setup

### Creating Your Database (First Time Setup)

The application automatically manages your database - no manual SQL scripts needed!

1. **Open the Settings Tab** (⚙️ icon in top navigation)
2. **Navigate to "Database" section**
3. **Configure connection**:
   - Host: `localhost` (or your PostgreSQL server)
   - Port: `5432` (default PostgreSQL port)
   - Database Name: `laktat` (recommended)
   - Username: Your PostgreSQL username (e.g., `postgres`)
   - Password: Your PostgreSQL password
4. **Click "Test Connection"** to verify settings
5. **Click "Create Database"** 

The application will automatically:
- Create the database if it doesn't exist
- Create all required tables (`patient_profiles`, `test_infos`, `stages`, etc.)
- Set up indexes for optimal performance
- Configure proper foreign key relationships

✅ **Success!** Your database is ready to use.

### Managing Databases

**To Delete a Database:**
1. Open Settings → Database
2. Click "Refresh List" to see all databases
3. Select the database you want to delete
4. Type the database name to confirm
5. Click "Confirm Delete"

⚠️ **Warning:** This permanently deletes all data. Cannot be undone!

## Working with Customers

### Creating a New Customer

1. **Navigate to the "Lactate Input" tab** (first tab)
2. **Click the search field** under "Customer / Patient"
3. **Enter customer name** to search existing customers, OR
4. **Scroll down** to "New Customer Information"
5. **Fill in customer details**:
   - **First Name*** (required)
   - **Last Name*** (required)
   - **Profile ID** (auto-generated if empty)
   - **Birth Date** (optional)
   - **Height (cm)** (optional)
   - **Weight (kg)** (optional)
   - **Email** (optional)
   - **Phone** (optional)
6. **Add Test Protocol** (optional but recommended):
   - Date: Test date
   - Time: Test time
   - Device: `bike`, `treadmill`, or `other`
   - Unit: `Watt (W)` or `km/h`
   - Start Load: Initial intensity (e.g., 50)
   - Increment: Load increase per stage (e.g., 50)
   - Duration: Minutes per stage (e.g., 3)
7. **Click "Create Customer"**

✅ **Customer created!** You can now add lactate measurements.

### Searching Existing Customers

1. Type customer name in the search field
2. Click on a customer from the dropdown to select them
3. The customer's information appears in the blue info box

## Adding Lactate Data

### Manual Data Entry

Once a customer is selected:

1. **Enter Stage Information**:
   - **Load** (required): Power in watts or speed in km/h
   - **Lactate** (required): Lactate value in mmol/L
   - **Duration**: Stage duration in minutes
   - **Heart Rate**: Optional heart rate in bpm
   - **Blood Pressure**: Optional systolic/diastolic values
   - **Notes**: Any additional observations

2. **Add More Stages**:
   - Click "+ Add Stage" to add the next measurement stage
   - Repeat for each stage of your lactate test
   - Typical test: 5-8 stages with increasing load

3. **Review Entered Stages**:
   - All stages appear in the list below the input form
   - You can remove stages using the "Remove" button

4. **Save the Test**:
   - Click "💾 Save Test Data" to store all stages
   - Data is immediately available for analysis

### Understanding Test Protocols

A typical lactate test follows this pattern:

| Stage | Load (W) | Duration (min) | Lactate (mmol/L) |
|-------|----------|----------------|------------------|
| 1     | 50       | 3              | 1.2              |
| 2     | 100      | 3              | 1.5              |
| 3     | 150      | 3              | 2.1              |
| 4     | 200      | 3              | 3.2              |
| 5     | 250      | 3              | 4.8              |
| 6     | 300      | 3              | 7.2              |

## Viewing Performance Analysis

### Accessing the Dashboard

1. **Navigate to "Performance Curve" tab** (third tab)
2. **Select a customer** from the dropdown
3. **View automatic analysis**:
   - **Performance Curve**: Load vs. Lactate graph
   - **Threshold Markers**: LT1 and LT2 automatically calculated
   - **Training Zones**: Color-coded intensity zones
   - **Multiple Methods**: Switch between 8 calculation methods

### Understanding the Charts

**Main Performance Curve:**
- X-axis: Load (Watts or km/h)
- Y-axis: Lactate concentration (mmol/L)
- Blue line: Your lactate curve
- Red markers: Calculated thresholds (LT1 and LT2)
- Colored zones: Training intensity zones

**Threshold Methods Available:**
- **DMAX**: Maximum distance method (recommended)
- **Mader**: Fixed 4.0 mmol/L threshold
- **Modified DMAX**: Enhanced DMAX calculation
- **LT2/IANS**: Individual anaerobic threshold
- **Coggan**: Power-based training zones
- **Seiler**: 3-zone polarized training model
- **FES**: Fatigue equivalent state
- **INSCYD**: Lactate steady-state analysis

### Training Zones

Each method calculates specific training zones:

- **Zone 1 (Recovery)**: Below LT1 - Active recovery
- **Zone 2 (Aerobic)**: LT1 to LT2 - Base training
- **Zone 3 (Threshold)**: Around LT2 - Lactate threshold training
- **Zone 4 (VO2max)**: Above LT2 - High-intensity intervals
- **Zone 5 (Anaerobic)**: Maximum effort - Sprint training

### Comparing Tests

1. Select the same customer
2. Different test dates show up as separate entries
3. Compare threshold values over time
4. Track training progress and adaptations

## Advanced Features

### Device Integration

External lactate analyzers can send data automatically via webhook:

```bash
curl -X POST http://localhost:3000/api/lactate-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "profile_id": "CUSTOMER001",
    "load": 200,
    "lactate": 3.5,
    "unit": "watt",
    "device": "bike"
  }'
```

### Data Export and Analysis

All data is stored in PostgreSQL and can be:
- Exported via SQL queries
- Analyzed with external tools
- Backed up using PostgreSQL tools
- Integrated with other systems via REST API

### Settings Management

**Application Settings:**
- Database connection (live updates, no restart needed)
- Connection pool configuration
- SSL/TLS settings
- General preferences (coming soon)

**Configuration Updates:**
- Changes take effect immediately
- No need to restart the application
- Automatic connection pool recreation
- Config saved to `config/app.config.json`

## Troubleshooting

### "Database table not found" Error

**Solution:** Create the database through Settings tab:
1. Go to Settings → Database
2. Enter your connection details
3. Click "Create Database"
4. All tables will be created automatically

### "Connection refused" Error

**Solution:** Check PostgreSQL is running:
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL (if using Docker)
docker start timescaledb

# Or start local PostgreSQL
brew services start postgresql@16  # macOS
sudo systemctl start postgresql    # Linux
```

### Customer Creation Fails

**Common causes:**
1. **Database not initialized**: Use Settings → Create Database
2. **Duplicate Profile ID**: Use a different ID or leave empty for auto-generation
3. **Missing required fields**: First Name and Last Name are required

### No Data Showing in Performance Curve

**Checklist:**
1. ✓ Customer has been created
2. ✓ At least 3 stages with lactate data have been saved
3. ✓ Customer is selected in Performance Curve tab
4. ✓ Test data was saved (click "💾 Save Test Data")

### Error Messages

The application provides detailed error messages:
- **What went wrong**: Clear description of the problem
- **Technical details**: Expandable section with full error information
- **How to fix**: Actionable guidance on resolving the issue

## Best Practices

### Data Entry
1. **Complete customer profile** before adding test data
2. **Add test protocol** to document test conditions
3. **Enter stages in order** from lowest to highest load
4. **Include all measurements** even if lactate seems high
5. **Add notes** for unusual circumstances or observations

### Testing Protocol
1. **Standardized conditions**: Same time of day, similar nutrition
2. **Proper warmup**: 10-15 minutes before starting test
3. **Consistent increments**: Use same load increases (e.g., 50W steps)
4. **Stage duration**: 3 minutes minimum per stage
5. **Blood samples**: End of each stage, from earlobe or fingertip

### Analysis
1. **Compare methods**: Check multiple threshold calculation methods
2. **Track trends**: Regular testing every 4-8 weeks
3. **Context matters**: Consider training phase, fatigue, nutrition
4. **Zone assignment**: Use calculated zones as guidelines, adjust based on feel
5. **Professional guidance**: Consult with coach or sports scientist for interpretation

## Support and Documentation

### Additional Resources
- `ARCHITECTURE.md` - Technical architecture and system design
- `SETUP.md` - Detailed setup instructions for developers
- `THRESHOLD_METHODS.md` - Scientific explanation of calculation methods

### Database Schema
All tables and relationships are documented in `db/schema.sql`

### API Endpoints
Test API manually for integration:
```bash
# Check application status
curl http://localhost:3000/api/status

# List all customers
curl http://localhost:3000/api/customers

# Get customer details
curl http://localhost:3000/api/customers/CUSTOMER001
```

### Console Logs
Check browser console (F12) for detailed debugging information during operation.