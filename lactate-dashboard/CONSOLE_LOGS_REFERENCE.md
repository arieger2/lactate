# Expected Console Logs During Testing

## ✅ Successful Startup

When your app starts, you should see logs like this:

```
npm run dev

[... Next.js startup logs ...]

📦 Creating database pool: localhost:5432/laktat
✅ Connected to PostgreSQL database
```

## ✅ Testing Dynamic Config Reload

### Test 1: Change config/app.config.json manually

1. Edit `config/app.config.json`:
   - Change `"database": "laktat"` to `"database": "laktat_test"`
   - Save file

2. Watch console for:
```
🔄 Database configuration changed, reinitializing pool...
✅ Connected to PostgreSQL database (closing old pool)
📦 Creating database pool: localhost:5432/laktat_test
✅ Connected to PostgreSQL database
```

### Test 2: Change via Settings UI

1. Open app → Settings → Database
2. Change database name from "laktat" to "laktat_new"
3. Click "Save Configuration"

Expected console output:
```
📝 Updating database config: {
  host: 'localhost',
  port: 5432,
  database: 'laktat_new',
  user: 'postgres',
  ssl: false
}
✅ Database configuration updated (pool recreation triggered automatically)
```

Plus in next logs:
```
🔄 Database configuration changed, reinitializing pool...
📦 Creating database pool: localhost:5432/laktat_new
✅ Connected to PostgreSQL database
```

### Test 3: Create New Database

1. Open Settings → Database
2. Change database name to "test_database"
3. Click "Create Database"

Expected console output:
```
🗄️ Create Database Request: {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  database: 'test_database',
  ssl: false,
  hasPassword: true
}
📡 Connecting to postgres database...
✅ Connected to postgres database
🔍 Database "test_database" exists: false
📦 Creating database "test_database"...
✅ Database "test_database" created
📡 Connecting to new database "test_database"...
✅ Connected to "test_database"
📋 Creating tables...
✅ Tables created successfully

🔄 Database configuration changed, reinitializing pool...
📦 Creating database pool: localhost:5432/test_database
✅ Connected to PostgreSQL database
```

## ⚠️ Common Issues & What to Look For

### Issue: No logs about pool recreation

**What to look for**: File watching might not be working

```
// BAD - File watching not triggered
🔄 Database configuration changed, reinitializing pool...
// NOT in console

// GOOD - File watching triggered
🔄 Database configuration changed, reinitializing pool...
📦 Creating database pool: ...
```

**Solution**: Check `lib/configManager.ts` - ensure `isDevelopment` is `true` for development

### Issue: Connection refused errors

```
❌ Database connection error: Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**: Check that PostgreSQL is running:
```bash
docker ps | grep timescaledb
```

### Issue: Database doesn't exist

```
🔍 Database "laktat" exists: false
// ... then trying to connect fails
❌ Database connection error: database "laktat" does not exist
```

**Solution**: Create the database first via Settings UI using "Create Database" button

### Issue: Authentication failed

```
❌ Database connection error: Error: password authentication failed for user "postgres"
```

**Solution**: Check `config/app.config.json` - password might be incorrect

## 🎯 What Indicates Success

After changes, you should see:

1. ✅ Old connection logs disappear
2. ✅ File watch notification appears: `🔄 Database configuration changed...`
3. ✅ New pool creation logs appear: `📦 Creating database pool: ...`
4. ✅ Connection success: `✅ Connected to PostgreSQL database`
5. ✅ No errors in browser console
6. ✅ Settings page shows success message with pool recreation mention
7. ✅ Database queries work immediately without page refresh

## 📊 Console Log Analysis

### Filter logs to only see database-related messages:

```bash
# In terminal where you run 'npm run dev', watch for these patterns:
# - 📦 (pool creation)
# - 🔄 (config changes)
# - ✅ (success)
# - ❌ (errors)
# - 📡 (database connection attempts)
# - 🗄️ (database creation)
```

## 🧪 Performance Indicators

Good signs:
- Pool recreation takes < 1 second
- New queries execute immediately after pool recreation
- File watching detects changes within 100ms

Bad signs:
- Pool recreation takes > 5 seconds
- Errors about "pool still initializing"
- File changes don't trigger recreation

## 📝 How to Enable Verbose Logging

To see even more details, edit `lib/configManager.ts`:

```typescript
// Add more console.log statements
console.log('📖 ConfigManager: Reading from', CONFIG_FILE)
console.log('📖 ConfigManager: File mtime check...', mtime)
```

And in `lib/dbPoolManager.ts`:

```typescript
// Add pool initialization details
console.log('📖 Pool config:', { host, port, database, user })
console.log('📖 Pool size:', { min, max })
```

---

**Pro Tip**: Open browser DevTools Console and app terminal side-by-side during testing to see both client and server logs in real-time!
