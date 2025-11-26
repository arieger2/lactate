'use client'

import { useState, useEffect } from 'react'

type SettingsTab = 'database' | 'general' | 'appearance' | 'integrations'

interface DatabaseConfig {
  host: string
  port: string
  database: string
  user: string
  password: string
  ssl: boolean
}

interface MigrationScript {
  name: string
  description: string
  executed: boolean
  executedAt?: string
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('database')
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    host: '',
    port: '5432',
    database: '',
    user: '',
    password: '',
    ssl: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [migrations, setMigrations] = useState<MigrationScript[]>([])
  const [isRunningMigration, setIsRunningMigration] = useState<string | null>(null)
  const [migrationResults, setMigrationResults] = useState<Record<string, { success: boolean; message: string }>>({})
  const [passwordPlaceholder, setPasswordPlaceholder] = useState('')

  // Load current database config
  useEffect(() => {
    loadDatabaseConfig()
    loadMigrations()
  }, [])

  const loadDatabaseConfig = async () => {
    setIsLoadingConfig(true)
    try {
      const response = await fetch('/api/settings/database')
      if (response.ok) {
        const data = await response.json()
        setDbConfig({
          host: data.host || '',
          port: data.port || '5432',
          database: data.database || '',
          user: data.user || '',
          password: '', // Keep empty, user must re-enter to change
          ssl: data.ssl || false
        })
        // Show placeholder if password exists in env
        setPasswordPlaceholder('••••••••••••')
      }
    } catch (error) {
      console.error('Failed to load database config:', error)
    } finally {
      setIsLoadingConfig(false)
    }
  }

  const loadMigrations = async () => {
    try {
      const response = await fetch('/api/settings/migrations')
      if (response.ok) {
        const data = await response.json()
        setMigrations(data.migrations || [])
      }
    } catch (error) {
      console.error('Failed to load migrations:', error)
      // Set default available migrations
      setMigrations([
        { name: 'add-device-metadata', description: 'Add device metadata columns (sample_id, glucose, ph, temperature, etc.)', executed: false },
        { name: 'create-training-zones-table', description: 'Create training zones table for storing custom zone adjustments', executed: false }
      ])
    }
  }

  const handleSaveConfig = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/settings/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig)
      })
      
      if (response.ok) {
        setTestResult({ success: true, message: 'Database configuration saved successfully!' })
      } else {
        const error = await response.json()
        setTestResult({ success: false, message: error.message || 'Failed to save configuration' })
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to save configuration' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const response = await fetch('/api/settings/database/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig)
      })
      
      const result = await response.json()
      setTestResult({
        success: result.success,
        message: result.success ? 'Connection successful!' : result.message || 'Connection failed'
      })
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to test connection' })
    } finally {
      setIsTesting(false)
    }
  }

  const handleRunMigration = async (migrationName: string) => {
    setIsRunningMigration(migrationName)
    try {
      const response = await fetch('/api/settings/migrations/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ migration: migrationName })
      })
      
      const result = await response.json()
      setMigrationResults(prev => ({
        ...prev,
        [migrationName]: {
          success: result.success,
          message: result.success ? 'Migration executed successfully!' : result.message || 'Migration failed'
        }
      }))
      
      if (result.success) {
        // Reload migrations to update status
        loadMigrations()
      }
    } catch (error) {
      setMigrationResults(prev => ({
        ...prev,
        [migrationName]: { success: false, message: 'Failed to run migration' }
      }))
    } finally {
      setIsRunningMigration(null)
    }
  }

  const handleCreateDatabase = async () => {
    setIsLoading(true)
    setTestResult(null)
    try {
      const response = await fetch('/api/settings/database/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig)
      })
      
      const result = await response.json()
      setTestResult({
        success: result.success,
        message: result.success ? 'Database created successfully!' : result.message || 'Failed to create database'
      })
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to create database' })
    } finally {
      setIsLoading(false)
    }
  }

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
          {/* Database Settings */}
          {activeTab === 'database' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                  Database Connection
                </h3>
                
                {isLoadingConfig ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="animate-spin text-2xl mr-2">⏳</span>
                    <span className="text-zinc-600 dark:text-zinc-400">Loading configuration...</span>
                  </div>
                ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Host
                    </label>
                    <input
                      type="text"
                      value={dbConfig.host}
                      onChange={(e) => setDbConfig(prev => ({ ...prev, host: e.target.value }))}
                      placeholder="localhost"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Port
                    </label>
                    <input
                      type="text"
                      value={dbConfig.port}
                      onChange={(e) => setDbConfig(prev => ({ ...prev, port: e.target.value }))}
                      placeholder="5432"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Database Name
                    </label>
                    <input
                      type="text"
                      value={dbConfig.database}
                      onChange={(e) => setDbConfig(prev => ({ ...prev, database: e.target.value }))}
                      placeholder="laktat"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={dbConfig.user}
                      onChange={(e) => setDbConfig(prev => ({ ...prev, user: e.target.value }))}
                      placeholder="postgres"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Password
                      {passwordPlaceholder && (
                        <span className="text-xs text-zinc-500 ml-2">(leave empty to keep current)</span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={dbConfig.password}
                      onChange={(e) => setDbConfig(prev => ({ ...prev, password: e.target.value }))}
                      placeholder={passwordPlaceholder || "Enter password"}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dbConfig.ssl}
                        onChange={(e) => setDbConfig(prev => ({ ...prev, ssl: e.target.checked }))}
                        className="w-4 h-4 text-blue-500 border-zinc-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Use SSL
                      </span>
                    </label>
                  </div>
                </div>
                )}

                {/* Test Result */}
                {testResult && (
                  <div className={`mt-4 p-3 rounded-md ${
                    testResult.success 
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  }`}>
                    {testResult.success ? '✅' : '❌'} {testResult.message}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-4 py-2 bg-zinc-500 hover:bg-zinc-600 disabled:bg-zinc-400 text-white rounded-md font-medium flex items-center gap-2"
                  >
                    {isTesting ? (
                      <>
                        <span className="animate-spin">⏳</span> Testing...
                      </>
                    ) : (
                      <>🔌 Test Connection</>
                    )}
                  </button>
                  
                  <button
                    onClick={handleSaveConfig}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-md font-medium flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="animate-spin">⏳</span> Saving...
                      </>
                    ) : (
                      <>💾 Save Configuration</>
                    )}
                  </button>
                  
                  <button
                    onClick={handleCreateDatabase}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white rounded-md font-medium flex items-center gap-2"
                  >
                    🗄️ Create Database
                  </button>
                </div>
              </div>

              {/* Divider */}
              <hr className="border-zinc-200 dark:border-zinc-700" />

              {/* Database Migrations */}
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                  Database Migrations
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  Run database update scripts to add new features or modify the schema.
                </p>

                <div className="space-y-3">
                  {migrations.map(migration => (
                    <div 
                      key={migration.name}
                      className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg ${migration.executed ? '✅' : '📋'}`}>
                            {migration.executed ? '✅' : '📋'}
                          </span>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {migration.name}
                          </span>
                          {migration.executed && (
                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                              Executed
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 ml-7">
                          {migration.description}
                        </p>
                        {migration.executedAt && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 ml-7">
                            Executed at: {new Date(migration.executedAt).toLocaleString()}
                          </p>
                        )}
                        {migrationResults[migration.name] && (
                          <div className={`mt-2 ml-7 text-sm ${
                            migrationResults[migration.name].success
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {migrationResults[migration.name].success ? '✅' : '❌'} {migrationResults[migration.name].message}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRunMigration(migration.name)}
                        disabled={isRunningMigration === migration.name || migration.executed}
                        className={`px-4 py-2 rounded-md font-medium flex items-center gap-2 ${
                          migration.executed
                            ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
                            : 'bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white'
                        }`}
                      >
                        {isRunningMigration === migration.name ? (
                          <>
                            <span className="animate-spin">⏳</span> Running...
                          </>
                        ) : migration.executed ? (
                          <>✓ Done</>
                        ) : (
                          <>▶️ Run</>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* General Settings - Placeholder */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                General Settings
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                General settings will be available here in future updates.
              </p>
              <div className="p-8 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-center text-zinc-500 dark:text-zinc-500">
                🚧 Coming Soon
              </div>
            </div>
          )}

          {/* Appearance Settings - Placeholder */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                Appearance Settings
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Customize the look and feel of your dashboard.
              </p>
              <div className="p-8 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-center text-zinc-500 dark:text-zinc-500">
                🚧 Coming Soon
              </div>
            </div>
          )}

          {/* Integrations Settings - Placeholder */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                Integrations
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Connect external devices and services.
              </p>
              <div className="p-8 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-center text-zinc-500 dark:text-zinc-500">
                🚧 Coming Soon
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
