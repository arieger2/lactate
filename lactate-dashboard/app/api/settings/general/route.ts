import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET - Fetch all general settings
export async function GET(request: NextRequest) {
  let client
  try {
    client = await pool.connect()
    
    const result = await client.query(`
      SELECT setting_key, setting_value, updated_at
      FROM general_settings
      ORDER BY setting_key
    `)
    
    // Convert array to object for easier access
    const settings: Record<string, string> = {}
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value
    })
    
    return NextResponse.json({
      success: true,
      settings
    })
    
  } catch (error) {
    console.error('❌ Error fetching general settings:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch settings'
    }, { status: 500 })
  } finally {
    if (client) client.release()
  }
}

// POST - Update a general setting
export async function POST(request: NextRequest) {
  let client
  try {
    const body = await request.json()
    const { setting_key, setting_value } = body
    
    if (!setting_key || setting_value === undefined) {
      return NextResponse.json({
        success: false,
        error: 'setting_key and setting_value are required'
      }, { status: 400 })
    }
    
    client = await pool.connect()
    
    const result = await client.query(`
      INSERT INTO general_settings (setting_key, setting_value, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (setting_key) 
      DO UPDATE SET 
        setting_value = $2,
        updated_at = CURRENT_TIMESTAMP
      RETURNING setting_key, setting_value, updated_at
    `, [setting_key, setting_value])
    
    return NextResponse.json({
      success: true,
      setting: result.rows[0]
    })
    
  } catch (error) {
    console.error('❌ Error updating general setting:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update setting'
    }, { status: 500 })
  } finally {
    if (client) client.release()
  }
}
