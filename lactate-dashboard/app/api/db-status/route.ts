import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  try {
    const client = await pool.connect()
    
    try {
      // Test connection
      const timeResult = await client.query('SELECT NOW() as current_time')
      
      // Check if tables exist
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('sessions', 'lactate_data', 'threshold_results', 'training_zones')
        ORDER BY table_name
      `)
      
      // Get database info
      const versionResult = await client.query('SELECT version()')
      
      return NextResponse.json({
        status: 'connected',
        serverTime: timeResult.rows[0].current_time,
        version: versionResult.rows[0].version,
        tables: tablesResult.rows.map(r => r.table_name),
        tablesCount: tablesResult.rows.length,
        database: 'laktat',
        host: process.env.DB_HOST || '192.168.5.220'
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      fallbackMode: 'memory_only'
    }, { status: 500 })
  }
}