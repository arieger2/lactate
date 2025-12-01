'use client'

import { useState, useEffect } from 'react'

interface DatabaseConfig {
  host: string
  port: string
  database: string
  user: string
  password: string
  ssl: boolean
}

interface DatabaseInfo {
  name: string
  owner: string
  size: string
  sizeBytes: number
}

export default function DatabaseSettings() {
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    host: 'localhost',
    port: '5432',
    database: 'laktat',
    user: 'postgres',
    password: '',
    ssl: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [passwordPlaceholder, setPasswordPlaceholder] = useState('')
  
  // Delete database state
  const [databases, setDatabases] = useState<DatabaseInfo[]>([])
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false)
  const [selectedDatabase, setSelectedDatabase] = useState<string>('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => {
    loadDatabaseConfig()
    loadDatabases()
  }, [])

  const loadDatabaseConfig = async () => {
    setIsLoadingConfig(true)
    try {
      const response = await fetch('/api/settings/database')
      if (response.ok) {
        const data = await response.json()
        setDbConfig(prevConfig => {
          const isInitialLoad = prevConfig.host === 'localhost' && prevConfig.database === 'laktat'
          if (isInitialLoad) {
            return {
              host: data.host || 'localhost',
              port: String(data.port || 5432),
              database: data.database || 'laktat',
              user: data.user || 'postgres',
              password: '',
              ssl: data.ssl || false
            }
          }
          return prevConfig
        })
        if (data.hasPassword) {
          setPasswordPlaceholder('••••••••••••')
        }
      }
    } catch (error) {
      console.error('Failed to load database config:', error)
    } finally {
      setIsLoadingConfig(false)
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
        const data = await response.json()
        setTestResult({ success: true, message: data.message || 'Database configuration saved successfully!' })
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
      
      if (result.success) {
        loadDatabases()
        setTimeout(() => loadDatabaseConfig(), 500)
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to create database' })
    } finally {
      setIsLoading(false)
    }
  }

  const loadDatabases = async () => {
    setIsLoadingDatabases(true)
    try {
      const params = new URLSearchParams()
      if (dbConfig.host) params.append('host', dbConfig.host)
      if (dbConfig.port) params.append('port', dbConfig.port)
      if (dbConfig.user) params.append('user', dbConfig.user)
      if (dbConfig.password) params.append('password', dbConfig.password)
      if (dbConfig.ssl) params.append('ssl', 'true')
      
      const response = await fetch(`/api/settings/database/list?${params}`)
      if (response.ok) {
        const data = await response.json()
        setDatabases(data.databases || [])
      }
    } catch (error) {
      console.error('Failed to load databases:', error)
    } finally {
      setIsLoadingDatabases(false)
    }
  }

  const handleDeleteDatabase = async () => {
    if (!selectedDatabase || deleteConfirmText !== selectedDatabase) return
    
    setIsDeleting(true)
    setDeleteResult(null)
    
    try {
      const response = await fetch('/api/settings/database/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dbConfig,
          databaseToDelete: selectedDatabase
        })
      })
      
      const result = await response.json()
      setDeleteResult({
        success: result.success,
        message: result.message
      })
      
      if (result.success) {
        setSelectedDatabase('')
        setDeleteConfirmText('')
        setShowDeleteConfirm(false)
        loadDatabases()
      }
    } catch (error) {
      setDeleteResult({ success: false, message: 'Failed to delete database' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
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

          <div className="col-span-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Password <span className="text-xs text-zinc-500">(leave empty to keep current)</span>
            </label>
            <input
              type="password"
              value={dbConfig.password}
              onChange={(e) => setDbConfig(prev => ({ ...prev, password: e.target.value }))}
              placeholder={passwordPlaceholder || "Enter password"}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="col-span-2 flex items-center">
            <input
              type="checkbox"
              id="ssl"
              checked={dbConfig.ssl}
              onChange={(e) => setDbConfig(prev => ({ ...prev, ssl: e.target.checked }))}
              className="w-4 h-4 text-blue-500 border-zinc-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="ssl" className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
              Use SSL
            </label>
          </div>
        </div>
        )}

        {testResult && (
          <div className={`mt-4 p-3 rounded-md ${
            testResult.success 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
            {testResult.success ? '✅' : '❌'} {testResult.message}
          </div>
        )}

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

      {/* Delete Database Section */}
      <div>
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
          🗑️ Delete Database
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Select a database to permanently delete. This action cannot be undone!
        </p>

        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={loadDatabases}
            disabled={isLoadingDatabases}
            className="px-3 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-md text-sm flex items-center gap-2"
          >
            {isLoadingDatabases ? (
              <>
                <span className="animate-spin">⏳</span> Loading...
              </>
            ) : (
              <>🔄 Refresh List</>
            )}
          </button>
        </div>

        {databases.length > 0 ? (
          <div className="space-y-3">
            <div className="grid gap-2">
              {databases.map(db => (
                <label
                  key={db.name}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedDatabase === db.name
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="database"
                      value={db.name}
                      checked={selectedDatabase === db.name}
                      onChange={(e) => {
                        setSelectedDatabase(e.target.value)
                        setShowDeleteConfirm(false)
                        setDeleteConfirmText('')
                        setDeleteResult(null)
                      }}
                      className="w-4 h-4 text-red-500 border-zinc-300 focus:ring-red-500"
                    />
                    <div>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        🗄️ {db.name}
                      </span>
                      {db.name === dbConfig.database && (
                        <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    {db.size} • Owner: {db.owner}
                  </div>
                </label>
              ))}
            </div>

            {selectedDatabase && !showDeleteConfirm && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium flex items-center gap-2"
              >
                🗑️ Delete "{selectedDatabase}"
              </button>
            )}

            {showDeleteConfirm && selectedDatabase && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-700 dark:text-red-400 font-medium mb-3">
                  ⚠️ Are you sure you want to delete "{selectedDatabase}"?
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                  This will permanently delete all data in this database. Type the database name to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={`Type "${selectedDatabase}" to confirm`}
                  className="w-full px-3 py-2 border border-red-300 dark:border-red-700 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-zinc-800 dark:text-zinc-100 mb-3"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteDatabase}
                    disabled={isDeleting || deleteConfirmText !== selectedDatabase}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-md font-medium flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <span className="animate-spin">⏳</span> Deleting...
                      </>
                    ) : (
                      <>🗑️ Confirm Delete</>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText('')
                    }}
                    className="px-4 py-2 bg-zinc-300 hover:bg-zinc-400 dark:bg-zinc-600 dark:hover:bg-zinc-500 text-zinc-700 dark:text-zinc-200 rounded-md font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {deleteResult && (
              <div className={`mt-4 p-3 rounded-md ${
                deleteResult.success 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
              }`}>
                {deleteResult.success ? '✅' : '❌'} {deleteResult.message}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-zinc-500 dark:text-zinc-400">
            {isLoadingDatabases ? (
              <span>Loading databases...</span>
            ) : (
              <span>No user databases found. Click "Refresh List" to load.</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
