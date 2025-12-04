# Lactate Dashboard - Architecture Overview

## System Architecture

### Database Configuration (Single Source of Truth)
The application uses a **dependency injection pattern** with centralized configuration management:

```
config/app.config.json (Single Source)
         ↓
   ConfigManager (File Watching)
         ↓
   DatabasePoolManager (Auto-Reconnect)
         ↓
    Connection Pool (Dynamic)
         ↓
  API Routes & Components
```

#### Key Components
- **ConfigManager** (`lib/configManager.ts`): Manages configuration with file watching and change notifications
- **DatabasePoolManager** (`lib/dbPoolManager.ts`): Handles database connection pool lifecycle with automatic recreation
- **Single Configuration Source**: All database config in `config/app.config.json` only

#### Benefits
- **Zero-restart configuration updates**: Change database settings without server restart
- **No configuration redundancy**: Single source of truth eliminates conflicts
- **Automatic pool recreation**: Database connections update dynamically

### Customer Management System
Enhanced customer tracking with comprehensive measurement management:

#### Database Schema
```sql
-- Core tables
patient_profiles (id, customer_id, name, email, phone, date_of_birth, notes)
test_infos (id, test_id, customer_id, test_date, test_protocol, notes)
stages (id, test_id, customer_id, stage_number, power, lactate, heart_rate, created_at)
adjusted_thresholds (id, customer_id, test_id, method, lt1_power, lt1_lactate, lt2_power, lt2_lactate)
```

#### API Endpoints
- **Customer Management**: `/api/customers` (CRUD operations with search)
- **Device Interface**: `/api/device-interface` (automatic measurement processing)
- **Data Management**: `/api/lactate-webhook` (real-time data streaming)

### Component Architecture
- **LactateInput.tsx** (803 lines): Customer selection, manual measurement entry, device integration
- **PerformanceCurveOrchestrator.tsx** (~256 lines): Orchestrates performance curve UI and logic with custom hooks
- **Settings.tsx** (611 lines): Database configuration management with dynamic updates

### Data Flow
1. **Customer Selection**: Search/create customers in LactateInput tab
2. **Measurement Entry**: Manual form entry or automatic device integration
3. **Real-time Analysis**: Performance Curve tab provides scientific analysis
4. **Database Storage**: PostgreSQL with proper foreign key relationships

## Technical Stack
- **Framework**: Next.js 16.0.1 with Turbopack
- **Database**: PostgreSQL with connection pooling
- **Styling**: Tailwind CSS with dark mode support
- **Charts**: ECharts for scientific visualization
- **TypeScript**: Full type safety throughout

## Development Patterns
- **Dependency Injection**: ConfigManager → DatabasePoolManager → APIs
- **File Watching**: Automatic configuration reload without restart
- **Memory Fallback**: Graceful degradation if database unavailable
- **Single Responsibility**: Each component has clear, focused purpose

## Security Considerations
- Database credentials stored in single config file
- Input validation on all API endpoints
- SQL injection prevention with parameterized queries
- Error messages filtered for production security

## Performance Features
- Connection pooling with configurable min/max connections
- Indexed database queries for fast customer search
- Real-time data updates without polling
- Efficient component re-rendering with React hooks