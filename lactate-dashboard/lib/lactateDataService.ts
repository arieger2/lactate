// Global data service for lactate dashboard
class LactateDataService {
  private static instance: LactateDataService
  private isReceiving = false
  private sessionId: string = ''
  private data: any[] = []
  private intervalId: NodeJS.Timeout | null = null
  private listeners: Set<(data: any[]) => void> = new Set()

  private constructor() {
    // Initialize session ID
    this.sessionId = this.generateSessionId()
  }

  static getInstance(): LactateDataService {
    if (!LactateDataService.instance) {
      LactateDataService.instance = new LactateDataService()
    }
    return LactateDataService.instance
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Subscribe to data changes
  subscribe(callback: (data: any[]) => void): () => void {
    this.listeners.add(callback)
    // Send current data immediately
    callback(this.data)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback)
    }
  }

  // Notify all listeners of data changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.data))
  }

  // Start receiving data
  startReceiving(): void {
    if (this.isReceiving) return

    this.isReceiving = true
    console.log('🔄 Starting global data reception for session:', this.sessionId)

    // Poll for new data every 2 seconds
    this.intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/lactate-webhook?sessionId=${this.sessionId}`)
        if (response.ok) {
          const result = await response.json()
          if (result.data && result.data.length !== this.data.length) {
            this.data = result.data
            this.notifyListeners()
            console.log('📊 Updated data:', result.data.length, 'points')
          }
        }
      } catch (error) {
        console.error('❌ Error polling data:', error)
      }
    }, 2000)
  }

  // Stop receiving data
  stopReceiving(): void {
    if (!this.isReceiving) return

    this.isReceiving = false
    console.log('⏹️ Stopping global data reception')

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  // Clear all data
  async clearData(): Promise<void> {
    try {
      await fetch(`/api/lactate-webhook?sessionId=${this.sessionId}`, {
        method: 'DELETE'
      })
      this.data = []
      this.notifyListeners()
      console.log('🗑️ Cleared session data:', this.sessionId)
    } catch (error) {
      console.error('❌ Error clearing data:', error)
    }
  }

  // Simulate test data
  async simulateData(): Promise<void> {
    const simulatedData = [
      { timestamp: new Date().toISOString(), power: 150, lactate: 1.5, heartRate: 140, fatOxidation: 0.8, sessionId: this.sessionId },
      { timestamp: new Date().toISOString(), power: 200, lactate: 2.1, heartRate: 155, fatOxidation: 1.2, sessionId: this.sessionId },
      { timestamp: new Date().toISOString(), power: 250, lactate: 2.8, heartRate: 170, fatOxidation: 1.0, sessionId: this.sessionId },
      { timestamp: new Date().toISOString(), power: 300, lactate: 4.2, heartRate: 185, fatOxidation: 0.6, sessionId: this.sessionId },
      { timestamp: new Date().toISOString(), power: 350, lactate: 6.8, heartRate: 195, fatOxidation: 0.3, sessionId: this.sessionId },
      { timestamp: new Date().toISOString(), power: 400, lactate: 9.5, heartRate: 200, fatOxidation: 0.1, sessionId: this.sessionId }
    ]

    console.log('🎭 Simulating data for session:', this.sessionId)

    for (let i = 0; i < simulatedData.length; i++) {
      try {
        await fetch(`/api/lactate-webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(simulatedData[i])
        })
        
        // Small delay between data points
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error('❌ Error sending simulated data:', error)
      }
    }

    // Force refresh after simulation
    setTimeout(() => {
      this.pollDataOnce()
    }, 1000)
  }

  // Manual data refresh
  private async pollDataOnce(): Promise<void> {
    try {
      const response = await fetch(`/api/lactate-webhook?sessionId=${this.sessionId}`)
      if (response.ok) {
        const result = await response.json()
        this.data = result.data || []
        this.notifyListeners()
      }
    } catch (error) {
      console.error('❌ Error in manual poll:', error)
    }
  }

  // Get current state
  getState() {
    return {
      isReceiving: this.isReceiving,
      sessionId: this.sessionId,
      data: this.data,
      dataCount: this.data.length
    }
  }

  // Reset session (create new session ID)
  resetSession(): void {
    this.stopReceiving()
    this.sessionId = this.generateSessionId()
    this.data = []
    this.notifyListeners()
    console.log('🔄 Reset to new session:', this.sessionId)
  }
}

// Export singleton instance
export const lactateDataService = LactateDataService.getInstance()
export default LactateDataService