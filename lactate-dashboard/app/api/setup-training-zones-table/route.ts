import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const client = await pool.connect();
    
    // Drop and recreate the training_zones table with correct structure
    await client.query(`
      DROP TABLE IF EXISTS training_zones CASCADE;
    `);
    
    await client.query(`
      CREATE TABLE training_zones (
        id SERIAL PRIMARY KEY,
        customer_id VARCHAR(255) NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        zone_boundaries JSONB NOT NULL,
        method VARCHAR(50) NOT NULL,
        modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(customer_id, session_id)
      );
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_training_zones_customer_session 
      ON training_zones(customer_id, session_id);
    `);
    
    client.release();
    
    return NextResponse.json({ 
      success: true, 
      message: 'training_zones table recreated successfully with correct structure' 
    });
  } catch (error) {
    console.error('Error creating training_zones table:', error);
    return NextResponse.json(
      { error: 'Failed to create training_zones table', details: String(error) },
      { status: 500 }
    );
  }
}
