'use client'

import { ThresholdMethod, getMethodDisplayName } from '@/lib/lactateCalculations'

interface ThresholdMethodSelectorProps {
  selectedMethod: ThresholdMethod
  isAdjusted: boolean
  onMethodChange: (method: ThresholdMethod) => void
  onManualLoad: () => Promise<void>
}

export default function ThresholdMethodSelector({
  selectedMethod,
  isAdjusted,
  onMethodChange,
  onManualLoad
}: ThresholdMethodSelectorProps) {
  
  const renderMethodButton = (
    method: ThresholdMethod,
    label: string,
    subtitle: string
  ) => (
    /* eslint-disable-next-line react/forbid-dom-props */
    <button
      onClick={() => onMethodChange(method)}
      className={`p-3 text-xs rounded-lg border transition-all duration-200 ${
        selectedMethod === method 
          ? 'text-gray-800 font-semibold' 
          : 'text-gray-600 hover:text-gray-800'
      }`}
      style={{
        backgroundColor: selectedMethod === method 
          ? 'rgba(107, 114, 128, 0.25)' 
          : 'rgba(107, 114, 128, 0.1)',
        borderColor: selectedMethod === method 
          ? 'rgba(107, 114, 128, 0.4)' 
          : 'rgba(107, 114, 128, 0.2)'
      }}
      onMouseEnter={(e) => {
        if (selectedMethod !== method) {
          e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (selectedMethod !== method) {
          e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
        }
      }}
    >
      <div className="font-semibold">{label}</div>
      <div className="text-xs opacity-80">{subtitle}</div>
    </button>
  )

  return (
    <div className="col-span-2">
      <label className="block text-sm font-medium mb-4 text-zinc-700 dark:text-zinc-300">
        Wissenschaftliche Schwellenmethoden (nur Originaldefinitionen)
      </label>
      
      <div className="grid grid-cols-4 gap-4 mb-5">
        {/* Nur wissenschaftlich validierte Methoden mit klaren Originalpaper-Definitionen */}
        {renderMethodButton('dickhuth', 'Dickhuth IAT', 'Dickhuth et al. (1999)')}
        {renderMethodButton('dmax', 'DMAX', 'Cheng et al. (1992)')}
        {renderMethodButton('mader', '4 mmol OBLA', 'Heck et al. (1985)')}
        {renderMethodButton('moddmax', 'ModDMAX', 'Bishop et al. (1998)')}
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        {/* Manual adjustment */}
        
        {/* Only show Manual button when there are actual manual adjustments */}
        {isAdjusted && (
          /* eslint-disable-next-line react/forbid-dom-props */
          <button
            onClick={onManualLoad}
            className={`p-3 text-xs rounded-lg border relative transition-all duration-200 ${
              selectedMethod === 'adjusted' 
                ? 'text-gray-800 font-semibold' 
                : 'text-gray-700 animate-pulse'
            }`}
            style={{
              backgroundColor: selectedMethod === 'adjusted' 
                ? 'rgba(107, 114, 128, 0.25)' 
                : 'rgba(107, 114, 128, 0.18)',
              borderColor: selectedMethod === 'adjusted' 
                ? 'rgba(107, 114, 128, 0.4)' 
                : 'rgba(107, 114, 128, 0.3)'
            }}
          >
            <div className="font-semibold">
              Manual {selectedMethod !== 'adjusted' ? '●' : ''}
            </div>
            <div className="text-xs opacity-80">
              Verfügbar
            </div>
            {selectedMethod !== 'adjusted' && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
