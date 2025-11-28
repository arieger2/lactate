import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Get database configuration safely without causing import issues
 */
function getDatabaseConfig() {
  try {
    const configPath = path.join(process.cwd(), 'config', 'app.config.json')
    
    if (!fs.existsSync(configPath)) {
      console.warn('⚠️ Config file not found, using defaults')
      return getDefaultConfig()
    }
    
    const configContent = fs.readFileSync(configPath, 'utf8')
    const config = JSON.parse(configContent)
    
    const dbConfig = config.database || {}

    
    return {
      host: String(dbConfig.host || 'localhost'),
      port: Number(dbConfig.port || 5432),
      database: String(dbConfig.database || 'laktat'),
      user: String(dbConfig.user || 'postgres'),
      password: String(dbConfig.password || ''), // CRITICAL: Always string
      ssl: Boolean(dbConfig.ssl || false),
      pool: {
        max: Number(dbConfig.pool?.max || 10),
        min: Number(dbConfig.pool?.min || 2)
      }
    }
  } catch (error) {
    console.error('❌ Failed to read database config:', error)
    return getDefaultConfig()
  }
}

function getDefaultConfig() {
  return {
    host: 'localhost',
    port: 5432,
    database: 'laktat',
    user: 'postgres',
    password: '',
    ssl: false,
    pool: { max: 10, min: 2 }
  }
}

/**
 * Create a database pool with dynamic configuration
 * The pool is recreated whenever the configuration changes
 */
class DatabasePoolManager {
  private pool: Pool | null = null
  private isInitialized = false

  constructor() {
    // Don't initialize pool immediately to prevent startup crashes

    
    // Subscribe to configuration changes for automatic pool recreation
    this.subscribeToConfigChanges()
  }

  /**
   * Initialize the database pool with current configuration
   */
  private initializePool() {
    try {
      // Close existing pool if any
      if (this.pool) {
        this.pool.end().catch(err => console.error('Error closing pool:', err))
      }

      const dbConfig = getDatabaseConfig()

      console.log(`📦 Creating database pool: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`)
      
      // CRITICAL FIX: Ensure password is always a string for PostgreSQL driver
      const password = String(dbConfig.password || '')

      console.log('🔧 Pool config before creation:', {
        host: typeof dbConfig.host,
        port: typeof dbConfig.port,
        database: typeof dbConfig.database,
        user: typeof dbConfig.user,
        password: typeof dbConfig.password,
        passwordValue: password ? '***HIDDEN***' : 'EMPTY',
        passwordLength: password.length,
        passwordIsString: typeof password === 'string'
      })

      // CRITICAL: All Pool config values must be the correct type for PostgreSQL
      const poolConfig = {
        host: String(dbConfig.host || 'localhost'),
        port: Number(dbConfig.port || 5432),
        database: String(dbConfig.database || 'laktat'),
        user: String(dbConfig.user || 'postgres'),
        password: password, // Already converted to string above
        ssl: dbConfig.ssl === true
          ? {
              rejectUnauthorized: false,
              requestCert: false
            }
          : false,
        max: Number(dbConfig.pool?.max ?? 10),
        min: Number(dbConfig.pool?.min ?? 2),
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 30000
      }


      this.pool = new Pool(poolConfig)
      this.isInitialized = true

      // Setup event listeners
      this.pool.on('connect', () => {

      })

      this.pool.on('error', (err) => {
        console.error('❌ Database connection error:', err)
      })


    } catch (error) {
      console.error('❌ Failed to initialize database pool:', error)
      console.error('❌ Error details:', error)
      this.pool = null
      this.isInitialized = false
      // Don't throw - just log and continue
    }
  }

  /**
   * Listen for configuration changes and reinitialize pool
   */
  private subscribeToConfigChanges() {
    // File watching based config reload for production
    const configPath = path.join(process.cwd(), 'config', 'app.config.json')
    
    try {
      if (fs.existsSync(configPath)) {
        // Watch config file for changes
        fs.watchFile(configPath, { persistent: false }, () => {

          setTimeout(() => {
            this.forceReinitialize()
          }, 100) // Small delay to ensure file write is complete
        })
      } else {
      }
    } catch (error) {
      console.error('❌ Failed to setup config file watching:', error)

    }
  }

  /**
   * Get the current database pool
   * @returns Pool instance or null if initialization failed
   */
  public getPool(): Pool | null {
    try {
      // Force reinitialization to apply fixes
      if (!this.isInitialized || !this.pool) {

        this.initializePool()
      }
      
      if (!this.pool) {
        console.warn('⚠️ Database pool could not be initialized. Check database configuration and connection.')
        return null
      }
      
      return this.pool
    } catch (error) {
      console.error('❌ Error in getPool():', error)
      return null
    }
  }

  /**
   * Check if pool is ready for use
   */
  public isPoolReady(): boolean {
    return this.isInitialized && this.pool !== null
  }

  /**
   * Execute a query using the pool
   */
  public async query<T = any>(
    text: string,
    values?: Array<any>
  ): Promise<{ rows: T[]; rowCount: number }> {
    const pool = this.getPool()
    
    if (!pool) {
      throw new Error('Database pool is not available. Check database configuration.')
    }

    const client = await pool.connect()
    try {
      const result = await client.query(text, values)
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount ?? 0
      }
    } finally {
      client.release()
    }
  }

  /**
   * Force reinitialize the pool (for debugging)
   */
  public forceReinitialize() {

    this.isInitialized = false
    this.initializePool()
  }

  /**
   * Cleanup resources
   */
  public async destroy() {
    if (this.pool) {
      try {
        await this.pool.end()

      } catch (error) {
        console.error('Error closing pool:', error)
      }
    }
  }
}

// Lazy singleton to prevent startup crashes
let dbPoolManager: DatabasePoolManager | null = null

const getManager = () => {
  if (!dbPoolManager) {

    dbPoolManager = new DatabasePoolManager()
  }
  return dbPoolManager
}

// Export lazy-loaded pool with null safety
export const pool = {
  connect: async () => {
    const poolInstance = getManager().getPool()
    if (!poolInstance) {
      throw new Error('Database pool is not available. Check database configuration.')
    }
    return poolInstance.connect()
  },
  query: async (text: string, values?: any[]) => getManager().query(text, values),
  end: async () => {
    const poolInstance = getManager().getPool()
    if (!poolInstance) {
      console.warn('⚠️ Cannot end pool - pool is not initialized')
      return
    }
    return poolInstance.end()
  },
  on: (event: 'connect' | 'acquire' | 'remove' | 'release' | 'error', listener: any) => {
    const poolInstance = getManager().getPool()
    if (!poolInstance) {
      console.warn('⚠️ Cannot add event listener - pool is not initialized')
      return
    }
    return poolInstance.on(event as any, listener)
  }
}

// Export the manager for advanced usage
export default getManager
