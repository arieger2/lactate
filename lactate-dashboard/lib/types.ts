// ===== CORE TYPES =====

export interface Customer {
  customer_id: string
  name: string
  email?: string
  phone?: string
  date_of_birth?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface Session {
  id: string
  session_id: string
  test_date: string
  test_type: string
  point_count: number
  last_updated: string
  updated_at?: string
}

export interface LactateDataPoint {
  power: number
  lactate: number
  heartRate?: number
  vo2?: number
  timestamp: string
}

export interface ThresholdPoint {
  power: number
  lactate: number
}

export interface TrainingZone {
  id: number
  name: string
  range: [number, number]
  color: string
  borderColor: string
  description: string
}

// ===== API RESPONSE TYPES =====

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface CustomersResponse extends ApiResponse<Customer[]> {
  customers: Customer[]
}

export interface SessionsResponse extends ApiResponse<Session[]> {
  sessions: Session[]
}