import { useState, useEffect } from 'react'
import { LactateDataPoint } from '@/lib/types'

interface UseSessionDataProps {
  selectedCustomer: any
  selectedSessionId: string | null
  setSelectedSessionId: (id: string) => void
  dataVersion: number
}

interface UseSessionDataReturn {
  availableSessions: any[]
  webhookData: LactateDataPoint[]
  loading: boolean
  currentUnit: 'watt' | 'kmh' | 'other'
  testInfo: { device?: string; unit?: string } | null
}

export function useSessionData({
  selectedCustomer,
  selectedSessionId,
  setSelectedSessionId,
  dataVersion
}: UseSessionDataProps): UseSessionDataReturn {
  const [availableSessions, setAvailableSessions] = useState<any[]>([])
  const [webhookData, setWebhookData] = useState<LactateDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUnit, setCurrentUnit] = useState<'watt' | 'kmh' | 'other'>('watt')
  const [testInfo, setTestInfo] = useState<{ device?: string; unit?: string } | null>(null)

  // Load sessions when customer changes
  useEffect(() => {
    if (!selectedCustomer) {
      setAvailableSessions([])
      return
    }

    const loadSessions = async () => {
      try {
        const response = await fetch(`/api/customer-sessions?customerId=${selectedCustomer.customer_id}`)
        if (response.ok) {
          const data = await response.json()
          const sessionData = data.success ? data.sessions : data
          setAvailableSessions(sessionData || [])
          if (sessionData?.length > 0 && !selectedSessionId) {
            setSelectedSessionId(sessionData[0].id)
          }
        }
      } catch (error) {
        console.error('Error loading sessions:', error)
      }
    }

    loadSessions()
  }, [selectedCustomer, dataVersion, setSelectedSessionId])

  // Load lactate data when session changes
  useEffect(() => {
    if (!selectedSessionId) {
      setWebhookData([])
      return
    }

    const loadData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/lactate-webhook?sessionId=${selectedSessionId}`)
        if (response.ok) {
          const result = await response.json()
          const data = Array.isArray(result) ? result : (result.data || [])
          
          if (data.length === 0) {
            const testData = [
              { power: 100, lactate: 1.2, heartRate: 130, timestamp: new Date().toISOString() },
              { power: 150, lactate: 1.8, heartRate: 145, timestamp: new Date().toISOString() },
              { power: 200, lactate: 2.5, heartRate: 160, timestamp: new Date().toISOString() },
              { power: 250, lactate: 3.2, heartRate: 175, timestamp: new Date().toISOString() },
              { power: 300, lactate: 4.8, heartRate: 185, timestamp: new Date().toISOString() },
              { power: 350, lactate: 7.2, heartRate: 195, timestamp: new Date().toISOString() }
            ]
            setWebhookData(testData)
            setCurrentUnit('watt')
          } else {
            // Map load/power fields for backward compatibility
            const mappedData = data.map((point: any) => ({
              power: point.theoreticalLoad || point.power || point.load,
              lactate: point.lactate,
              heartRate: point.heartRate,
              vo2: point.vo2,
              timestamp: point.timestamp,
              theoreticalLoad: point.theoreticalLoad,
              measuredLoad: point.power || point.load,  // Keep original measured value
              isInterpolated: point.isFinalApproximation === true || !!point.theoreticalLoad
            }))
            setWebhookData(mappedData)
            const unit = data[0]?.unit || 'watt'
            setCurrentUnit(unit)
          }
        } else {
          console.error('❌ API response not ok:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('❌ Error fetching lactate data:', error)
        setWebhookData([])
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [selectedSessionId, dataVersion])

  // Load test info when session changes
  useEffect(() => {
    if (!selectedSessionId) {
      setTestInfo(null)
      return
    }

    const loadTestInfo = async () => {
      try {
        const response = await fetch(`/api/session-info?sessionId=${selectedSessionId}`)
        if (response.ok) {
          const data = await response.json()
          setTestInfo(data || null)
        } else {
          console.error('❌ API response not ok:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('❌ Error fetching test info:', error)
        setTestInfo(null)
      }
    }

    loadTestInfo()
  }, [selectedSessionId, dataVersion])

  return {
    availableSessions,
    webhookData,
    loading,
    currentUnit,
    testInfo
  }
}
