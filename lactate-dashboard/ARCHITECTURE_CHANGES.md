# Database Configuration Architecture Refactor

## Overview
This document describes the complete refactoring of the database configuration system from a redundant multi-source approach to a **single source of truth** architecture with automatic dynamic reloading.

## Problem Statement

### Original Architecture (BROKEN ❌)
- Database config stored in **two places**: `.env.local` and `config/app.config.json`
- Runtime connection pool created at app startup, cached in Node.js `require.cache`
- Changing config required server restart (because pool was cached)
- Redundant information in multiple files
- Unclear which file was the "source of truth"

### Issues
1. **Configuration Redundancy**: Same database config in `.env.local` and `config/app.config.json`
2. **Node.js Module Caching**: Pool created at startup and never recreated
3. **No Dynamic Updates**: Configuration changes required full server restart
4. **State Confusion**: UI and actual connection could become out of sync

## Solution: Single Source of Truth with Dependency Injection

### New Architecture (FIXED ✅)

```
config/app.config.json (Single Source of Truth)
         ↓
   ConfigManager (Dependency Injection Pattern)
         ↓
   DatabasePoolManager (Listens for changes)
         ↓
    Connection Pool (Recreated on config change)
         ↓
  API Routes & Components
```

### Key Components

#### 1. ConfigManager (`lib/configManager.ts`)
- **Responsibility**: Manage configuration from single source
- **Single Source**: `config/app.config.json` only
- **Features**:
  - File watching: Detects external config changes
  - Change listeners: Reactive pattern for config updates
  - Automatic mtime checking: Prevents unnecessary reads
  - Change notifications: Async event listeners
- **Usage**:
  ```typescript
  import configManager from '@/lib/configManager'
  
  const dbConfig = configManager.getDatabase()
  await configManager.updateDatabaseConfig({ ... })
  configManager.onChange(() => {
    console.log('Config changed!')
  })
  ```

#### 2. DatabasePoolManager (`lib/dbPoolManager.ts`)
- **Responsibility**: Manage database connection pool lifecycle
- **Features**:
  - Subscribes to ConfigManager changes
  - Automatically recreates pool when config changes
  - Singleton pattern for consistency
  - Proper resource cleanup
- **Usage**:
  ```typescript
  import dbPoolManager, { pool } from '@/lib/dbPoolManager'
  
  const result = await dbPoolManager.query('SELECT * FROM users')
  ```

#### 3. Updated `lib/db.ts`
- **Now**: Re-exports pool from DatabasePoolManager
- **Before**: Created pool directly from process.env (cached)
- **Backward Compatible**: Existing code using `import pool from 'lib/db'` still works

#### 4. Updated Settings API (`app/api/settings/database/route.ts`)
- **Before**: Read from `.env.local`, wrote to both `.env.local` and `config/app.config.json`
- **Now**: All operations go through ConfigManager (single source only)
- **Benefit**: No redundant file access

#### 5. Updated Create Database API (`app/api/settings/database/create/route.ts`)
- **Before**: Saved config to both `.env.local` and `config/app.config.json`
- **Now**: Saves via ConfigManager only

#### 6. Updated Settings Component (`app/components/Settings.tsx`)
- **UI Feedback**: Now shows "Pool recreation triggered automatically"
- **No Restart Message**: No longer says "restart required"
- **Same API**: No component changes needed

## Configuration Flow

### Changing Database Configuration (No Restart Needed!)

```
User Updates Settings in UI
    ↓
POST /api/settings/database
    ↓
configManager.updateDatabaseConfig()
    ↓
Save to config/app.config.json (Single Source)
    ↓
File watching detects change
    ↓
ConfigManager notifies listeners
    ↓
DatabasePoolManager receives notification
    ↓
Old pool closed ✓
New pool created with new config ✓
```

### Reading Configuration

```
API Endpoint or Component
    ↓
configManager.getDatabase()
    ↓
Check file mtime (lightweight)
    ↓
If changed: reload from disk
If unchanged: return cached value
    ↓
Return current config
```

## File Changes Summary

### Created Files
- `lib/configManager.ts` - Configuration management with file watching
- `lib/dbPoolManager.ts` - Dynamic pool management with config listeners

### Modified Files
- `lib/db.ts` - Now re-exports from dbPoolManager
- `app/api/settings/database/route.ts` - Uses ConfigManager only
- `app/api/settings/database/create/route.ts` - Uses ConfigManager only
- `app/components/Settings.tsx` - Updated feedback message

### Unchanged
- `.env.local` - Keep only for non-database app config (NODE_ENV, NEXTAUTH_*, etc.)
- `config/app.config.json` - Now the single source for database config
- All other components - Work as-is

## Migration Checklist

- ✅ ConfigManager implementation complete
- ✅ DatabasePoolManager implementation complete
- ✅ Updated lib/db.ts
- ✅ Updated API routes
- ✅ Updated Settings component
- ✅ All TypeScript errors resolved
- ⏳ Testing (manual verification needed)

## Testing Plan

### 1. Verify Configuration Loading
```bash
# Start app, check ConfigManager loads from config/app.config.json
# Verify connection pool created successfully
```

### 2. Test Dynamic Pool Recreation
```bash
# Change config/app.config.json database name manually
# File watching should detect change
# Pool should recreate automatically
# No UI refresh needed, connection should work
```

### 3. Test Settings UI
```bash
# Open settings
# Change database name
# Click "Save Configuration"
# Verify success message mentions "pool recreation"
# Create a test query - should use new database
# Verify NO server restart needed
```

### 4. Test Database Creation
```bash
# Use "Create Database" button in settings
# New database should be created
# config/app.config.json should be updated
# Pool should recreate with new database
```

## Benefits of This Architecture

| Aspect | Before | After |
|--------|--------|-------|
| **Source of Truth** | Two places (confusing) | One place (config/app.config.json) |
| **Config Changes** | Require restart | Automatic (no restart) |
| **File Consistency** | Risk of mismatch | Always in sync |
| **Performance** | Pool cached forever | Smart mtime checking |
| **Maintainability** | Duplicate code in APIs | Centralized in ConfigManager |
| **Testability** | Hard to mock | Easy with dependency injection |

## Technical Implementation Details

### ConfigManager File Watching
- Uses `fs.watch()` with 100ms debounce
- Handles rapid file changes gracefully
- Only in development mode (can be extended)
- Automatic cleanup on module destruction

### DatabasePoolManager Lifecycle
1. **Construction**: Initialize pool with current config
2. **Subscription**: Subscribe to ConfigManager changes
3. **Change Detection**: Recreate pool when config changes
4. **Cleanup**: Destroy pool and listeners on app shutdown

### Error Handling
- Graceful fallback if config file missing
- Pool creation errors logged with context
- Change listener errors caught and logged
- No cascading failures

## Future Enhancements

1. **Encrypted Passwords**: Store database password securely (not in plaintext)
2. **Config Validation**: Schema validation for config changes
3. **Audit Logging**: Track all configuration changes
4. **Environment Overrides**: Allow ENV variables to override config
5. **Configuration History**: Keep version history of configs
6. **Monitoring**: Alert on pool recreation frequency

## Rollback Plan

If issues occur:

1. Revert to old `lib/db.ts` that reads from process.env
2. Keep using ConfigManager for new config updates
3. Manual server restart if needed
4. No data loss - all changes saved to config/app.config.json

---

**Status**: ✅ Implementation Complete
**Date**: 2024
**Architecture Pattern**: Dependency Injection + File Watching
**Single Source of Truth**: `config/app.config.json`
