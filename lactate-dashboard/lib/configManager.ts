import fs from 'fs'
import path from 'path'

interface DatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl: boolean
  pool?: {
    min: number
    max: number
    acquire: number
    idle: number
  }
}

interface AppConfig {
  database: DatabaseConfig
  application?: Record<string, unknown>
  features?: Record<string, unknown>
}

type ConfigListener = (config: AppConfig) => void

class ConfigManager {
  private config: AppConfig = {
    database: {
      host: 'localhost',
      port: 5432,
      database: 'laktat',
      user: 'postgres',
      password: '',
      ssl: false
    }
  }

  private configPath: string
  private listeners: Set<ConfigListener> = new Set()
  private watcher: fs.FSWatcher | null = null
  private lastModified: number = 0

  constructor(configPath: string) {
    this.configPath = path.resolve(configPath)
    this.load()
  }

  /**
   * Load configuration from file
   */
  private load() {
    try {
      const stat = fs.statSync(this.configPath)
      
      // Only reload if file has changed
      if (stat.mtimeMs > this.lastModified) {
        const content = fs.readFileSync(this.configPath, 'utf-8')
        this.config = JSON.parse(content)
        this.lastModified = stat.mtimeMs
        console.log(`✓ Configuration loaded from ${this.configPath}`)
      }
    } catch (error) {
      console.error(`Failed to load config from ${this.configPath}:`, error)
      // Keep existing config on error
    }
  }

  /**
   * Get the full database configuration
   */
  public getDatabase(): DatabaseConfig {
    this.load() // Always check for fresh data
    const config = { ...this.config.database }
    
    // Ensure password is always a string (fix for PostgreSQL driver)
    if (config.password === null || config.password === undefined) {
      config.password = ''
    } else {
      config.password = String(config.password)
    }
    
    return config
  }

  /**
   * Get a specific database config value
   */
  public getDatabaseValue<T extends keyof DatabaseConfig>(
    key: T,
    defaultValue?: DatabaseConfig[T]
  ): DatabaseConfig[T] | undefined {
    this.load()
    return this.config.database[key] ?? defaultValue
  }

  /**
   * Get full application config
   */
  public getConfig(): AppConfig {
    this.load()
    return JSON.parse(JSON.stringify(this.config)) // Deep copy
  }

  /**
   * Update database configuration
   */
  public updateDatabaseConfig(updates: Partial<DatabaseConfig>) {
    this.config.database = {
      ...this.config.database,
      ...updates
    }
    this.saveConfig()
    this.notifyListeners()
  }

  /**
   * Save configuration to file
   */
  private saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
      this.lastModified = fs.statSync(this.configPath).mtimeMs
      console.log(`✓ Configuration saved to ${this.configPath}`)
    } catch (error) {
      console.error(`Failed to save config:`, error)
      throw error
    }
  }

  /**
   * Watch for external file changes and reload
   */
  public startWatching() {
    if (this.watcher) {
      return // Already watching
    }

    this.watcher = fs.watch(this.configPath, { persistent: false }, (eventType) => {
      if (eventType === 'change') {
        // Debounce rapid changes
        setTimeout(() => {
          const previousConfig = JSON.stringify(this.config)
          this.load()
          const newConfig = JSON.stringify(this.config)

          // Only notify if actually changed
          if (previousConfig !== newConfig) {
            console.log('📝 Configuration file changed, notifying listeners...')
            this.notifyListeners()
          }
        }, 100)
      }
    })

    console.log('👁️ Config file watcher started')
  }

  /**
   * Stop watching for changes
   */
  public stopWatching() {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
      console.log('👁️ Config file watcher stopped')
    }
  }

  /**
   * Subscribe to configuration changes
   */
  public onChange(listener: ConfigListener): () => void {
    this.listeners.add(listener)

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Notify all listeners of configuration changes
   */
  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.getConfig())
      } catch (error) {
        console.error('Error in config listener:', error)
      }
    })
  }

  /**
   * Destroy manager and cleanup resources
   */
  public destroy() {
    this.stopWatching()
    this.listeners.clear()
  }
}

// Create singleton instance
const configManager = new ConfigManager(
  path.join(process.cwd(), 'config', 'app.config.json')
)

// Start watching for changes in all environments (critical for production)
configManager.startWatching()
console.log('👁️ Config file watching enabled for environment:', process.env.NODE_ENV || 'development')

export default configManager
