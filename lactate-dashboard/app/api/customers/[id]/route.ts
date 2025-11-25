import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET - Get specific customer by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  
  let client
  try {
    client = await pool.connect()
    
    const result = await client.query(`
      SELECT 
        customer_id,
        name,
        email,
        phone,
        date_of_birth,
        notes,
        created_at,
        updated_at
      FROM customers
      WHERE customer_id = $1
    `, [id])
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      customer: result.rows[0]
    })
    
  } catch (error) {
    console.error('❌ Error fetching customer:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch customer'
    }, { status: 500 })
  } finally {
    if (client) client.release()
  }
}

// PUT - Update customer
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  
  let client
  try {
    const body = await request.json()
    const { name, email, phone, dateOfBirth, notes } = body
    
    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Name is required'
      }, { status: 400 })
    }
    
    client = await pool.connect()
    
    const result = await client.query(`
      UPDATE customers 
      SET 
        name = $1,
        email = $2,
        phone = $3,
        date_of_birth = $4,
        notes = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = $6
      RETURNING customer_id, name, email, phone, date_of_birth, notes, updated_at
    `, [name, email || null, phone || null, dateOfBirth || null, notes || null, id])
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      customer: result.rows[0]
    })
    
  } catch (error) {
    console.error('❌ Error updating customer:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update customer'
    }, { status: 500 })
  } finally {
    if (client) client.release()
  }
}