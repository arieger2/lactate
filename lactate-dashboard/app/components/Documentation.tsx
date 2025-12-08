'use client'

import { useState } from 'react'
import { useCustomer } from '@/lib/CustomerContext'
import { DocSection } from './documentation/types'
import OverviewSection from './documentation/OverviewSection'
import QuickStartSection from './documentation/QuickStartSection'
import ThresholdMethodsSection from './documentation/ThresholdMethodsSection'
import TrainingZonesSection from './documentation/TrainingZonesSection'
import DeviceApiSection from './documentation/DeviceApiSection'
import WebhookApiSection from './documentation/WebhookApiSection'
import SessionsApiSection from './documentation/SessionsApiSection'
import CustomersApiSection from './documentation/CustomersApiSection'
import ErrorCodesSection from './documentation/ErrorCodesSection'

export default function Documentation() {
  const { selectedCustomer } = useCustomer()
  const [activeSection, setActiveSection] = useState<DocSection>('overview')

  const sections: { id: DocSection; title: string; icon: string }[] = [
    { id: 'overview', title: 'Übersicht', icon: '🏠' },
    { id: 'quick-start', title: 'Schnellstart', icon: '🚀' },
    { id: 'threshold-methods', title: 'Schwellenmethoden', icon: '📊' },
    { id: 'training-zones', title: 'Trainingszonen', icon: '🎯' },
    { id: 'api-device', title: 'Device API', icon: '🔗' },
    { id: 'api-webhook', title: 'Webhook API', icon: '🪝' },
    { id: 'api-sessions', title: 'Sessions API', icon: '📋' },
    { id: 'api-customers', title: 'Customers API', icon: '👥' },
    { id: 'errors', title: 'Fehlercodes', icon: '⚠️' },
  ]

  return (
    <div className="flex gap-6">
      {/* Sidebar Navigation */}
      <div className="w-64 flex-shrink-0">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-4 sticky top-4">
          <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            📚 Dokumentation
          </h3>
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-medium'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="mr-2">{section.icon}</span>
                {section.title}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {activeSection === 'overview' && <OverviewSection setActiveSection={setActiveSection} />}
        {activeSection === 'quick-start' && <QuickStartSection />}
        {activeSection === 'threshold-methods' && <ThresholdMethodsSection />}
        {activeSection === 'training-zones' && <TrainingZonesSection />}
        {activeSection === 'api-device' && <DeviceApiSection selectedCustomer={selectedCustomer} />}
        {activeSection === 'api-webhook' && <WebhookApiSection selectedCustomer={selectedCustomer} />}
        {activeSection === 'api-sessions' && <SessionsApiSection selectedCustomer={selectedCustomer} />}
        {activeSection === 'api-customers' && <CustomersApiSection />}
        {activeSection === 'errors' && <ErrorCodesSection />}
      </div>
    </div>
  )
}
