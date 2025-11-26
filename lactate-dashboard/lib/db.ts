import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

interface AppConfig {
  database: {
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
  application?: Record<string, unknown>
  features?: Record<string, unknown>
}

// Helper to read app.config.json
const readConfigFile = (): AppConfig => {
  try {
    const configPath = path.join(process.cwd(), 'config', 'app.config.json')
    const content = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Error reading config file:', error)
    // Return default config
    return {
      database: {
        host: 'localhost',
        port: 5432,
        database: 'laktat',
        user: 'postgres',
        password: '',
        ssl: false
      }
    }
  }
}

// Read database configuration from app.config.json
const config = readConfigFile()
const dbConfig = config.database

const pool = new Pool({
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  password: dbConfig.password,
  ssl: dbConfig.ssl ? { 
    rejectUnauthorized: false,
    requestCert: false
  } : false,
  max: dbConfig.pool?.max || 10,
  min: dbConfig.pool?.min || 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 30000,
})

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database')
})

pool.on('error', (err) => {
  console.error('Database connection error:', err)
})

export default pool