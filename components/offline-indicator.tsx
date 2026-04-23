'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineIndicator() {
  const [offline, setOffline] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    const handleOffline = () => {
      setOffline(true)
      setWasOffline(true)
      setShowReconnected(false)
    }
    const handleOnline = () => {
      setOffline(false)
      if (wasOffline) {
        setShowReconnected(true)
        setTimeout(() => setShowReconnected(false), 3000)
      }
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    // Initial check
    if (!navigator.onLine) setOffline(true)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [wasOffline])

  if (!offline && !showReconnected) return null

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium transition-all ${
        offline
          ? 'bg-red-500/90 text-white border border-red-400/40'
          : 'bg-emerald-500/90 text-white border border-emerald-400/40'
      }`}
    >
      {offline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>You are offline — changes may not save</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span>Reconnected</span>
        </>
      )}
    </div>
  )
}
