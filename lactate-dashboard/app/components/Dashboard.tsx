'use client'

import { useState } from 'react'
import LactateInput from './LactateInput'
import LactateGraph from './LactateGraph'

type TabType = 'input' | 'graph'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('input')

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-zinc-900 dark:text-zinc-100">
          Lactate Dashboard
        </h1>
        
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-white dark:bg-zinc-900 rounded-lg p-1 shadow-md">
            <button
              onClick={() => setActiveTab('input')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                activeTab === 'input'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Lactate Input
            </button>
            <button
              onClick={() => setActiveTab('graph')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                activeTab === 'graph'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Lactate Graph
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-4xl mx-auto">
          {activeTab === 'input' && <LactateInput />}
          {activeTab === 'graph' && <LactateGraph />}
        </div>
      </div>
    </div>
  )
}