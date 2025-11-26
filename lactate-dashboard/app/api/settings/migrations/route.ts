import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'

interface Migration {
  name: string
  description: string
  executed: boolean
  executedAt?: string
}

// Define available migrations
const availableMigrations: { name: string; description: string }[] = [
  { 
    name: 'add-device-metadata', 
    description: 'Add device metadata columns (sample_id, glucose, ph, temperature, vo2, etc.)' 
  },
  { 
    name: 'create-training-zones-table', 
    description: 'Create training zones table for storing custom zone adjustments' 
  }
]

// GET - List all migrations and their status
export async function GET() {
  let pool: Pool | null = null
  
  try {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'laktat',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    })
    
    // Check if migrations table exists, create if not
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Get executed migrations
    const result = await pool.query('SELECT name, executed_at FROM migrations')
    const executedMigrations = new Map(
      result.rows.map(row => [row.name, row.executed_at])
    )
    
    // Build migration list with status
    const migrations: Migration[] = availableMigrations.map(m => ({
      name: m.name,
      description: m.description,
      executed: executedMigrations.has(m.name),
      executedAt: executedMigrations.get(m.name)?.toISOString()
    }))
    
    return NextResponse.json({ migrations })
  } catch (error) {
    console.error('Failed to get migrations:', error)
    // Return migrations without executed status if database not available
    return NextResponse.json({
      migrations: availableMigrations.map(m => ({
        ...m,
        executed: false
      }))
    })
  } finally {
    if (pool) await pool.end()
  }
}
