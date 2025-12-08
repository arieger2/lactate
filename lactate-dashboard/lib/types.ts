// ===== CORE TYPES =====

export interface PatientProfile {
  firstName: string
  lastName: string
  birthDate: string
  height_cm?: number
  weight_kg?: number
  phone?: string
  email?: string
  additionalNotes?: string
}

export interface TestInfo {
  testId: string
  testDate: string
  testTime: string
  device: 'bike' | 'treadmill' | 'other'
  unit: 'watt' | 'kmh' | 'other'
  startLoad: number
  increment: number
  stageDuration_min: number
}

export interface BloodPressure {
  systolic_mmHg: number
  diastolic_mmHg: number
}

export interface Stage {
  testId: string
  stage: number
  duration_min: number
  load: number
  theoreticalLoad?: number
  heartRate_bpm?: number
  lactate_mmol: number
  rr?: BloodPressure
  isFinalApproximation?: boolean
  notes?: string
}

export interface CustomerProfile {
  profileId: string
  patient: PatientProfile
  testInfos: TestInfo[]
  stages: Stage[]
  created_at?: string
  updated_at?: string
}

// Legacy Customer interface for backward compatibility
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
  timestamp?: string
  stage?: number
  /** Flag indicating this value was interpolated from an incomplete stage */
  isInterpolated?: boolean
  interpolationInfo?: {
    originalPower: number
    originalLactate: number
    originalHeartRate?: number
    method: 'quadratic' | 'linear' | 'none'
    confidence: number
    note: string
  }
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