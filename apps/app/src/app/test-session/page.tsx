'use client'

import { useState } from 'react'

interface SessionData {
  user?: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    [key: string]: unknown
  } | null
  expires?: string
  [key: string]: unknown
}

export default function TestSessionPage() {
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testSession = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/test-session')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch session')
      }
      
      setSession(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Test Session Endpoint</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Test Session API</h2>
          <p className="text-gray-600 mb-4">
            This page tests the /api/test-session endpoint to retrieve the current session data.
          </p>
          
          <button
            onClick={testSession}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors"
          >
            {loading ? 'Loading...' : 'Test Session'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {session && (
          <div className="space-y-4">
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <h3 className="font-semibold mb-2">Session Data:</h3>
              <pre className="bg-white p-4 rounded border overflow-auto text-sm">
                {JSON.stringify(session.session, null, 2)}
              </pre>
            </div>
            
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
              <h3 className="font-semibold mb-2">Debug Information:</h3>
              <pre className="bg-white p-4 rounded border overflow-auto text-sm">
                {JSON.stringify(session.debug, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
