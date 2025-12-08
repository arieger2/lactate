export type DocSection = 
  | 'overview' 
  | 'quick-start' 
  | 'threshold-methods' 
  | 'training-zones' 
  | 'api-device' 
  | 'api-webhook' 
  | 'api-sessions' 
  | 'api-customers' 
  | 'errors'

export interface Customer {
  profile_id: number
  first_name: string
  last_name: string
  birth_date?: string
  height_cm?: number
  weight_kg?: number
  email?: string
  phone?: string
}
