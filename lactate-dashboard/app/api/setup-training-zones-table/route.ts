import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const client = await pool.connect();
    
    // Create the training_zones table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS training_zones (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        zone_boundaries JSONB NOT NULL,
        method VARCHAR(50) NOT NULL,
        modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(customer_id, session_id)
      );
    `);
    
    client.release();
    
    return NextResponse.json({ 
      success: true, 
      message: 'training_zones table created successfully' 
    });
  } catch (error) {
    console.error('Error creating training_zones table:', error);
    return NextResponse.json(
      { error: 'Failed to create training_zones table', details: String(error) },
      { status: 500 }
    );
  }
}
