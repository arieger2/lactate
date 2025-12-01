'use client'

import { useState } from 'react'
import DatabaseSettings from './settings/DatabaseSettings'
import GeneralSettings from './settings/GeneralSettings'
import AppearanceSettings from './settings/AppearanceSettings'
import IntegrationsSettings from './settings/IntegrationsSettings'

type SettingsTab = 'database' | 'general' | 'appearance' | 'integrations'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('database')

  const settingsTabs = [
    { id: 'database' as SettingsTab, label: '🗄️ Database', icon: '🗄️' },
    { id: 'general' as SettingsTab, label: '⚙️ General', icon: '⚙️' },
    { id: 'appearance' as SettingsTab, label: '🎨 Appearance', icon: '🎨' },
    { id: 'integrations' as SettingsTab, label: '🔗 Integrations', icon: '🔗' }
  ]

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg overflow-hidden">
      {/* Settings Header */}
      <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 px-6 py-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          ⚙️ Settings
        </h2>
        <p className="text-zinc-300 text-sm mt-1">Configure your lactate dashboard</p>
      </div>

      <div className="flex">
        {/* Settings Sidebar */}
        <div className="w-56 bg-zinc-50 dark:bg-zinc-800/50 border-r border-zinc-200 dark:border-zinc-700 min-h-[500px]">
          <nav className="p-4 space-y-1">
            {settingsTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 p-6">
          {activeTab === 'database' && <DatabaseSettings />}
          {activeTab === 'general' && <GeneralSettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'integrations' && <IntegrationsSettings />}
        </div>
      </div>
    </div>
  )
}
