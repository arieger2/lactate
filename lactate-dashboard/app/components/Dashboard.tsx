'use client'

import { useState } from 'react'
import Image from 'next/image'
import LactateInput from './LactateInput'
import LactateGraph from './LactateGraph'
import LactatePerformanceCurve from './LactatePerformanceCurve'
import Documentation from './Documentation'
import Settings from './Settings'

type TabType = 'input' | 'graph' | 'performance' | 'docs' | 'settings'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('input')

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header with Logo */}
      <header className="bg-white dark:bg-zinc-900 shadow-sm border-b border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/sport-kardiologie-logo.svg"
              alt="Sport Kardiologie Logo"
              width={180}
              height={54}
              className="h-12 w-auto"
              priority
            />
          </div>
          <h1 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
            Lactate Dashboard
          </h1>
          <div className="w-[180px]">
            {/* Spacer for centering */}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        
        {/* Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-white dark:bg-zinc-900 rounded-lg p-1 shadow-md overflow-x-auto">
            <button
              onClick={() => setActiveTab('input')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'input'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              ✏️ Lactate Input
            </button>
            <button
              onClick={() => setActiveTab('graph')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'graph'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              📊 Lactate Graph
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'performance'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              📈 Performance Kurve
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'docs'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              📚 Dokumentation
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              ⚙️ Settings
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-6xl mx-auto">
          {activeTab === 'input' && <LactateInput />}
          {activeTab === 'graph' && <LactateGraph />}
          {activeTab === 'performance' && <LactatePerformanceCurve />}
          {activeTab === 'docs' && <Documentation />}
          {activeTab === 'settings' && <Settings />}
        </div>
      </div>
    </div>
  )
}