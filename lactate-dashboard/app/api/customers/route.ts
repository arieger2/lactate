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
    
    console.log('🔍 Customer creation request:', { name, customerId, email, phone, dateOfBirth })
    
    // Validation
    if (!name || !customerId) {
      const missingFields = []
      if (!name) missingFields.push('Name')
      if (!customerId) missingFields.push('Customer ID')
      
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 })
    }
    
    // Additional validation
    if (name.trim().length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Name must be at least 2 characters long'
      }, { status: 400 })
    }
    
    if (customerId.trim().length < 1) {
      return NextResponse.json({
        success: false,
        error: 'Customer ID cannot be empty'
      }, { status: 400 })
    }
    
    // Email validation (if provided)
    if (email && email.trim() && !email.includes('@')) {
      return NextResponse.json({
        success: false,
        error: 'Please enter a valid email address'
      }, { status: 400 })
    }
    
    client = await pool.connect()
    console.log('🔗 Database connection established for customer creation')
    
    // Check if customer already exists
    const existingCustomer = await client.query(
      'SELECT customer_id, name FROM customers WHERE customer_id = $1',
      [customerId.trim()]
    )
    
    if (existingCustomer.rows.length > 0) {
      const existing = existingCustomer.rows[0]
      return NextResponse.json({
        success: false,
        error: `Customer ID "${customerId}" already exists (assigned to "${existing.name}")`
      }, { status: 409 })
    }
    
    // Check for duplicate name (warning, but allow)
    const duplicateName = await client.query(
      'SELECT customer_id FROM customers WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    )
    
    console.log('✅ Validation passed, creating customer:', { name: name.trim(), customerId: customerId.trim() })
    
    const result = await client.query(`
      INSERT INTO customers (customer_id, name, email, phone, date_of_birth, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING customer_id, name, email, phone, date_of_birth, notes, created_at
    `, [
      customerId.trim(), 
      name.trim(), 
      email?.trim() || null, 
      phone?.trim() || null, 
      dateOfBirth || null, 
      notes?.trim() || null
    ])
    
    console.log('✅ Customer created successfully:', result.rows[0])
    
    if (duplicateName.rows.length > 0) {
      console.log('⚠️ Warning: Similar name exists for customer:', duplicateName.rows[0].customer_id)
    }
    
    return NextResponse.json({
      success: true,
      customer: result.rows[0],
      warnings: duplicateName.rows.length > 0 ? [`A customer with similar name already exists (ID: ${duplicateName.rows[0].customer_id})`] : []
    })
    
  } catch (error) {
    console.error('❌ Error creating customer:', error)
    
    // Provide specific error messages based on the error type
    let errorMessage = 'Failed to create customer'
    
    if (error instanceof Error) {
      // Database constraint violations
      if (error.message.includes('duplicate key value')) {
        errorMessage = 'Customer ID already exists in database'
      } else if (error.message.includes('violates check constraint')) {
        errorMessage = 'Invalid data format provided'
      } else if (error.message.includes('connection')) {
        errorMessage = 'Database connection error - please try again'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Database timeout - please try again'
      } else if (error.message.includes('syntax error')) {
        errorMessage = 'Database query error - contact support'
      } else {
        // Include the actual error message for debugging (in development)
        const isDevelopment = process.env.NODE_ENV === 'development'
        errorMessage = isDevelopment ? 
          `Database error: ${error.message}` : 
          'Database error occurred - please contact support'
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  } finally {
    if (client) {
      client.release()
      console.log('🔓 Database connection released')
    }
  }
}