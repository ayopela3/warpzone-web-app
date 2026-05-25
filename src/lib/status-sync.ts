// Status synchronization utilities
export interface StatusUpdateEvent {
  orderId: string
  oldStatus: string
  newStatus: string
  userId: string
  sellerId: string
  timestamp: string
}

// Simple in-memory status update cache for immediate synchronization
const statusUpdateCache = new Map<string, StatusUpdateEvent>()

export function notifyStatusUpdate(event: StatusUpdateEvent) {
  statusUpdateCache.set(event.orderId, event)
  
  // Clean up old entries (older than 5 minutes)
  const now = Date.now()
  for (const [key, value] of statusUpdateCache.entries()) {
    if (now - new Date(value.timestamp).getTime() > 5 * 60 * 1000) {
      statusUpdateCache.delete(key)
    }
  }
}

export function getStatusUpdate(orderId: string): StatusUpdateEvent | null {
  const event = statusUpdateCache.get(orderId)
  if (event) {
    // Return a copy to prevent mutation
    return { ...event }
  }
  return null
}

export function clearStatusUpdate(orderId: string) {
  statusUpdateCache.delete(orderId)
}
