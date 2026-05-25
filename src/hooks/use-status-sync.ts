"use client"

import { useEffect, useCallback } from "react"
import { getStatusUpdate, clearStatusUpdate } from "@/lib/status-sync"

export function useStatusSync(orderId: string, onStatusUpdate: (oldStatus: string, newStatus: string) => void) {
  const checkStatusUpdate = useCallback(() => {
    const update = getStatusUpdate(orderId)
    if (update) {
      onStatusUpdate(update.oldStatus, update.newStatus)
      clearStatusUpdate(orderId)
    }
  }, [orderId, onStatusUpdate])

  useEffect(() => {
    // Check for status updates every 2 seconds
    const interval = setInterval(checkStatusUpdate, 2000)
    
    // Also check immediately on mount
    checkStatusUpdate()

    return () => clearInterval(interval)
  }, [checkStatusUpdate])
}
