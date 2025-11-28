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
        profile_id as customer_id,
        first_name,
        last_name,
        CONCAT(first_name, ' ', last_name) as name,
        email,
        phone,
        birth_date as date_of_birth,
        height_cm,
        weight_kg,
        additional_notes as notes,
        created_at,
        updated_at
      FROM patient_profiles
      WHERE profile_id = $1
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
    const { firstName, lastName, email, phone, birthDate, height_cm, weight_kg, additionalNotes } = body
    
    if (!firstName) {
      return NextResponse.json({
        success: false,
        error: 'First name is required'
      }, { status: 400 })
    }
    
    client = await pool.connect()
    
    const result = await client.query(`
      UPDATE patient_profiles 
      SET 
        first_name = $1,
        last_name = $2,
        email = $3,
        phone = $4,
        birth_date = $5,
        height_cm = $6,
        weight_kg = $7,
        additional_notes = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE profile_id = $9
      RETURNING 
        profile_id as customer_id,
        first_name,
        last_name,
        CONCAT(first_name, ' ', last_name) as name,
        email,
        phone,
        birth_date as date_of_birth,
        height_cm,
        weight_kg,
        additional_notes as notes,
        updated_at
    `, [
      firstName.trim(), 
      lastName?.trim() || null, 
      email?.trim() || null, 
      phone?.trim() || null, 
      birthDate || null,
      height_cm || null,
      weight_kg || null,
      additionalNotes?.trim() || null,
      id
    ])
    
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