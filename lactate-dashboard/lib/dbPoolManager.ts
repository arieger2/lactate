import { Pool } from 'pg'
import configManager from './configManager'

/**
 * Create a database pool with dynamic configuration
 * The pool is recreated whenever the configuration changes
 */
class DatabasePoolManager {
  private pool: Pool | null = null
  private unsubscribeConfigListener: (() => void) | null = null

  constructor() {
    this.initializePool()
    this.subscribeToConfigChanges()
  }

  /**
   * Initialize the database pool with current configuration
   */
  private initializePool() {
    // Close existing pool if any
    if (this.pool) {
      this.pool.end().catch(err => console.error('Error closing pool:', err))
    }

    const dbConfig = configManager.getDatabase()

    console.log(`📦 Creating database pool: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`)

    this.pool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      ssl: dbConfig.ssl
        ? {
            rejectUnauthorized: false,
            requestCert: false
          }
        : false,
      max: dbConfig.pool?.max ?? 10,
      min: dbConfig.pool?.min ?? 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 30000
    })

    // Setup event listeners
    this.pool.on('connect', () => {
      console.log('✅ Connected to PostgreSQL database')
    })

    this.pool.on('error', (err) => {
      console.error('❌ Database connection error:', err)
    })
  }

  /**
   * Listen for configuration changes and reinitialize pool
   */
  private subscribeToConfigChanges() {
    this.unsubscribeConfigListener = configManager.onChange(() => {
      console.log('🔄 Database configuration changed, reinitializing pool...')
      this.initializePool()
    })
  }

  /**
   * Get the current database pool
   */
  public getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database pool is not initialized')
    }
    return this.pool
  }

  /**
   * Execute a query using the pool
   */
  public async query<T = any>(
    text: string,
    values?: Array<any>
  ): Promise<{ rows: T[]; rowCount: number }> {
    const client = await this.getPool().connect()
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
   * Cleanup resources
   */
  public async destroy() {
    if (this.unsubscribeConfigListener) {
      this.unsubscribeConfigListener()
    }

    if (this.pool) {
      try {
        await this.pool.end()
        console.log('✓ Database pool closed')
      } catch (error) {
        console.error('Error closing pool:', error)
      }
    }
  }
}

// Create singleton instance
const dbPoolManager = new DatabasePoolManager()

// Export the pool directly for backward compatibility
export const pool = dbPoolManager.getPool()

// Export the manager for advanced usage
export default dbPoolManager
