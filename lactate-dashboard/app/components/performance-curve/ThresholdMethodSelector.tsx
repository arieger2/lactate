'use client'

import { ThresholdMethod } from '@/lib/lactateCalculations'

interface ThresholdMethodSelectorProps {
  selectedMethod: ThresholdMethod
  onMethodChange: (method: ThresholdMethod) => void
  onManualLoad: () => Promise<void>
  onAIAdjust: () => Promise<void>
  isAILoading?: boolean
}

export default function ThresholdMethodSelector({
  selectedMethod,
  onMethodChange,
  onManualLoad,
  onAIAdjust,
  isAILoading = false
}: ThresholdMethodSelectorProps) {

  const renderMethodButton = (
    method: ThresholdMethod,
    label: string,
    subtitle: string
  ) => (
    /* eslint-disable-next-line react/forbid-dom-props */
    <button
      type="button"
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
          e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.15)'
        }
      }}
      onMouseLeave={(e) => {
        if (selectedMethod !== method) {
          e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)'
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
        {renderMethodButton('dickhuth', 'Dickhuth IAT', 'Dickhuth et al. (1999)')}
        {renderMethodButton('dmax', 'DMAX', 'Cheng et al. (1992)')}
        {renderMethodButton('mader', '4 mmol OBLA', 'Heck et al. (1985)')}
        {renderMethodButton('moddmax', 'ModDMAX', 'Bishop et al. (1998)')}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Manual load button */}
        {/* eslint-disable-next-line react/forbid-dom-props */}
        <button
          type="button"
          onClick={onManualLoad}
          className={`p-3 text-xs rounded-lg border relative transition-all duration-200 ${
            selectedMethod === 'adjusted'
              ? 'text-gray-800 font-semibold'
              : 'text-gray-700'
          }`}
          style={{
            backgroundColor: selectedMethod === 'adjusted'
              ? 'rgba(107, 114, 128, 0.25)'
              : 'rgba(107, 114, 128, 0.1)',
            borderColor: selectedMethod === 'adjusted'
              ? 'rgba(107, 114, 128, 0.4)'
              : 'rgba(107, 114, 128, 0.2)'
          }}
        >
          <div className="font-semibold">Manuell</div>
          <div className="text-xs opacity-80">
            {selectedMethod === 'adjusted' ? 'Aktiv' : 'Laden'}
          </div>
        </button>

        {/* AI adjustment button */}
        {/* eslint-disable-next-line react/forbid-dom-props */}
        <button
          type="button"
          onClick={onAIAdjust}
          disabled={isAILoading}
          className={`p-3 text-xs rounded-lg border relative transition-all duration-200 ${
            isAILoading
              ? 'text-violet-400 cursor-wait'
              : 'text-violet-700 hover:text-violet-900'
          }`}
          style={{
            backgroundColor: isAILoading
              ? 'rgba(139, 92, 246, 0.05)'
              : 'rgba(139, 92, 246, 0.08)',
            borderColor: 'rgba(139, 92, 246, 0.3)'
          }}
          onMouseEnter={(e) => {
            if (!isAILoading) e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.15)'
          }}
          onMouseLeave={(e) => {
            if (!isAILoading) e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.08)'
          }}
        >
          <div className="font-semibold">
            {isAILoading ? 'Analysiere…' : 'AI Anpassung'}
          </div>
          <div className="text-xs opacity-80">
            {isAILoading ? 'Bitte warten' : 'Automatisch'}
          </div>
        </button>
      </div>
    </div>
  )
}
