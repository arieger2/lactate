import { useState, useCallback } from 'react'
import { LactateDataPoint, ThresholdPoint, TrainingZone } from '@/lib/types'
import { 
  calculateThresholds, 
  calculateTrainingZones,
  ThresholdMethod
} from '@/lib/lactateCalculations'

interface UseThresholdCalculationReturn {
  lt1: ThresholdPoint | null
  lt2: ThresholdPoint | null
  trainingZones: TrainingZone[]
  selectedMethod: ThresholdMethod
  thresholdMessage: string | null
  showAiAnalysis: boolean
  setLt1: (threshold: ThresholdPoint | null) => void
  setLt2: (threshold: ThresholdPoint | null) => void
  setTrainingZones: (zones: TrainingZone[]) => void
  setSelectedMethod: (method: ThresholdMethod) => void
  setThresholdMessage: (message: string | null) => void
  setShowAiAnalysis: (show: boolean) => void
  calculateThresholdsWrapper: (
    data: LactateDataPoint[], 
    method?: ThresholdMethod, 
    unit?: string,
    onSave?: (lt1: ThresholdPoint, lt2: ThresholdPoint) => Promise<void>
  ) => void
}

export function useThresholdCalculation(
  currentUnit: string
): UseThresholdCalculationReturn {
  const [lt1, setLt1] = useState<ThresholdPoint | null>(null)
  const [lt2, setLt2] = useState<ThresholdPoint | null>(null)
  const [trainingZones, setTrainingZones] = useState<TrainingZone[]>([])
  const [selectedMethod, setSelectedMethod] = useState<ThresholdMethod>('dickhuth')
  const [thresholdMessage, setThresholdMessage] = useState<string | null>(null)
  const [showAiAnalysis, setShowAiAnalysis] = useState(false)

  const calculateThresholdsWrapper = useCallback((
    data: LactateDataPoint[], 
    method: ThresholdMethod = selectedMethod, 
    unit: string = currentUnit,
    onSave?: (lt1: ThresholdPoint, lt2: ThresholdPoint) => Promise<void>
  ) => {
    if (data.length === 0) {
      setLt1(null)
      setLt2(null)
      setTrainingZones([])
      setThresholdMessage(null)
      setShowAiAnalysis(false)
      return
    }

    // For adjusted method, don't recalculate - values are set manually
    if (method === 'adjusted') {
      setThresholdMessage(null)
      setShowAiAnalysis(false)
      return
    }

    // Use imported calculation function - works for both units!
    const result = calculateThresholds(data, method)
    const { lt1: lt1Point, lt2: lt2Point, message, lt1Missing, lt2Missing } = result

    // Log calculation results for debugging
    console.log('🔍 Threshold calculation:', {
      method,
      unit,
      dataPoints: data.length,
      lt1Found: lt1Point ? `${lt1Point.power}/${lt1Point.lactate}` : 'NULL',
      lt2Found: lt2Point ? `${lt2Point.power}/${lt2Point.lactate}` : 'NULL',
      lt1Missing,
      lt2Missing,
      message,
      shouldShowWarning: !!(message && (lt1Missing || lt2Missing))
    })

    // Set thresholds directly - no conversion needed
    setLt1(lt1Point)
    setLt2(lt2Point)

    // Display message and AI analysis button if thresholds are missing
    if (message && (lt1Missing || lt2Missing)) {
      console.log('⚠️ Setting warning message and AI button:', message)
      setThresholdMessage(message)
      setShowAiAnalysis(true)
    } else {
      console.log('✅ No warning needed - thresholds found or no message')
      setThresholdMessage(null)
      setShowAiAnalysis(false)
    }

    // Save calculated values automatically if both thresholds are valid
    const canSave = lt1Point !== null && 
                    lt2Point !== null && 
                    lt1Missing === false && 
                    lt2Missing === false &&
                    typeof lt1Point.power === 'number' && 
                    typeof lt1Point.lactate === 'number' &&
                    typeof lt2Point.power === 'number' && 
                    typeof lt2Point.lactate === 'number' &&
                    !isNaN(lt1Point.power) && 
                    !isNaN(lt1Point.lactate) &&
                    !isNaN(lt2Point.power) && 
                    !isNaN(lt2Point.lactate)

    if (canSave && onSave) {
      console.log('💾 Auto-saving thresholds:', { lt1Point, lt2Point })
      onSave(lt1Point, lt2Point)
    } else {
      console.log('ℹ️ Skipping auto-save:', {
        lt1Point,
        lt2Point,
        lt1Missing,
        lt2Missing,
        canSave
      })
    }

    // Calculate 5-Zone Training System (method-specific)
    const maxPower = Math.max(...data.map(d => d.power))
    const zones = calculateTrainingZones(lt1Point, lt2Point, maxPower, method)
    setTrainingZones(zones)
  }, [selectedMethod, currentUnit])

  return {
    lt1,
    lt2,
    trainingZones,
    selectedMethod,
    thresholdMessage,
    showAiAnalysis,
    setLt1,
    setLt2,
    setTrainingZones,
    setSelectedMethod,
    setThresholdMessage,
    setShowAiAnalysis,
    calculateThresholdsWrapper
  }
}
