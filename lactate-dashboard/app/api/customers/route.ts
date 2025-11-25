import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// GET - Search/List customers
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  
  let client
  try {
    client = await pool.connect()
    
    let query = `
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
    `
    let params: any[] = []
    
    if (search && search.trim()) {
      query += ` WHERE 
        name ILIKE $1 OR 
        customer_id ILIKE $1 OR 
        email ILIKE $1
      `
      params = [`%${search.trim()}%`]
    }
    
    query += ` ORDER BY name ASC LIMIT 50`
    
    const result = await client.query(query, params)
    
    return NextResponse.json({
      success: true,
      customers: result.rows
    })
    
  } catch (error) {
    console.error('❌ Error fetching customers:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch customers',
      customers: []
    }, { status: 500 })
  } finally {
    if (client) client.release()
  }
}

// POST - Create new customer
export async function POST(request: NextRequest) {
  let client
  try {
    const body = await request.json()
    const { name, customerId, email, phone, dateOfBirth, notes } = body
    
    if (!name || !customerId) {
      return NextResponse.json({
        success: false,
        error: 'Name and Customer ID are required'
      }, { status: 400 })
    }
    
    client = await pool.connect()
    
    // Check if customer already exists
    const existingCustomer = await client.query(
      'SELECT customer_id FROM customers WHERE customer_id = $1',
      [customerId]
    )
    
    if (existingCustomer.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Customer ID already exists'
      }, { status: 409 })
    }
    
    const result = await client.query(`
      INSERT INTO customers (customer_id, name, email, phone, date_of_birth, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING customer_id, name, email, phone, date_of_birth, notes, created_at
    `, [customerId, name, email || null, phone || null, dateOfBirth || null, notes || null])
    
    return NextResponse.json({
      success: true,
      customer: result.rows[0]
    })
    
  } catch (error) {
    console.error('❌ Error creating customer:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create customer'
    }, { status: 500 })
  } finally {
    if (client) client.release()
  }
}