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
    `
    let params: any[] = []
    
    if (search && search.trim()) {
      query += ` WHERE 
        first_name ILIKE $1 OR 
        last_name ILIKE $1 OR
        CONCAT(first_name, ' ', last_name) ILIKE $1 OR
        profile_id ILIKE $1 OR 
        email ILIKE $1
      `
      params = [`%${search.trim()}%`]
    }
    
    query += ` ORDER BY last_name, first_name ASC LIMIT 50`
    
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
    
    // Check if this is the new CustomerProfile format
    let finalFirstName, finalLastName, finalProfileId, finalBirthDate, finalNotes, height_cm, weight_kg, email, phone
    
    if (body.profileId && body.patient) {
      // New CustomerProfile format
      finalProfileId = body.profileId
      finalFirstName = body.patient.firstName
      finalLastName = body.patient.lastName
      finalBirthDate = body.patient.birthDate
      finalNotes = body.patient.additionalNotes
      height_cm = body.patient.height_cm
      weight_kg = body.patient.weight_kg
      email = body.patient.email
      phone = body.patient.phone
    } else {
      // Legacy format or direct fields
      const { 
        name, customerId,  // legacy format
        firstName, lastName, profileId,  // new format
        dateOfBirth, birthDate,  // legacy vs new
        notes, additionalNotes  // legacy vs new
      } = body
      
      const isNewFormat = firstName || lastName || profileId
      finalFirstName = isNewFormat ? firstName : name?.split(' ')[0] || ''
      finalLastName = isNewFormat ? lastName : name?.split(' ').slice(1).join(' ') || ''
      finalProfileId = isNewFormat ? profileId : customerId
      finalBirthDate = birthDate || dateOfBirth
      finalNotes = additionalNotes || notes
      height_cm = body.height_cm
      weight_kg = body.weight_kg
      email = body.email
      phone = body.phone
    }
    
    // Validation
    if (!finalFirstName || !finalProfileId) {
      const missingFields = []
      if (!finalFirstName) missingFields.push('First Name')
      if (!finalProfileId) missingFields.push('Profile ID')
      
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 })
    }
    
    // Additional validation
    if (finalFirstName.trim().length < 2) {
      return NextResponse.json({
        success: false,
        error: 'First name must be at least 2 characters long'
      }, { status: 400 })
    }
    
    if (finalProfileId.trim().length < 1) {
      return NextResponse.json({
        success: false,
        error: 'Profile ID cannot be empty'
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

    
    // Check if profile already exists
    const existingProfile = await client.query(
      'SELECT profile_id, first_name, last_name FROM patient_profiles WHERE profile_id = $1',
      [finalProfileId.trim()]
    )
    
    if (existingProfile.rows.length > 0) {
      const existing = existingProfile.rows[0]
      return NextResponse.json({
        success: false,
        error: `Profile ID "${finalProfileId}" already exists (assigned to "${existing.first_name} ${existing.last_name}")`
      }, { status: 409 })
    }
    
    // Check for duplicate name (warning, but allow)
    const duplicateName = await client.query(
      'SELECT profile_id FROM patient_profiles WHERE LOWER(first_name) = LOWER($1) AND LOWER(last_name) = LOWER($2)',
      [finalFirstName.trim(), finalLastName?.trim() || '']
    )
    

    
    const result = await client.query(`
      INSERT INTO patient_profiles (profile_id, first_name, last_name, email, phone, birth_date, height_cm, weight_kg, additional_notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING profile_id as customer_id, first_name, last_name, 
                CONCAT(first_name, ' ', last_name) as name,
                email, phone, birth_date as date_of_birth, 
                height_cm, weight_kg, additional_notes as notes, created_at
    `, [
      finalProfileId.trim(), 
      finalFirstName.trim(), 
      finalLastName?.trim() || null,
      email?.trim() || null, 
      phone?.trim() || null, 
      finalBirthDate || null,
      height_cm || null,
      weight_kg || null,
      finalNotes?.trim() || null
    ])
    

    
    if (duplicateName.rows.length > 0) {

    }
    
    return NextResponse.json({
      success: true,
      customer: result.rows[0],
      warnings: duplicateName.rows.length > 0 ? [`A customer with similar name already exists (ID: ${duplicateName.rows[0].profile_id})`] : []
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
      details: error instanceof Error ? error.message : String(error), // Always show details for debugging
      isDevelopment: process.env.NODE_ENV === 'development'
    }, { status: 500 })
  } finally {
    if (client) {
      client.release()

    }
  }
}