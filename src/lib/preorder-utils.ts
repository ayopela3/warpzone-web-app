import type { PreOrderCustomerInfo } from "@/types"

/**
 * Parse the packed reservation string from the API into structured customer data
 * Format: "name|email|reservation_id|quantity|is_paid|total_paid|reserved_at;;..."
 */
export function parsePreOrderReservations(reservationsString: string | null | undefined): PreOrderCustomerInfo[] {
  if (!reservationsString) return []
  
  return reservationsString
    .split(';;')
    .filter(Boolean)
    .map(reservation => {
      const [customerName, customerEmail, reservationId, quantity, isPaid, totalPaid, reservedAt] = reservation.split('|')
      
      return {
        reservationId: reservationId || '',
        customerName: customerName || 'Unknown',
        customerEmail: customerEmail || '',
        quantity: parseInt(quantity) || 1,
        isPaid: isPaid === '1',
        totalPaid: parseFloat(totalPaid) || 0,
        reservedAt: reservedAt || ''
      }
    })
}
