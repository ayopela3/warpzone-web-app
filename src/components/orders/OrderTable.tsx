"use client"

import { Button } from "@/components/ui/button"
import { OrderStatusBadge } from "@/features/checkout/components/OrderStatusBadge"
import { Eye } from "lucide-react"
import type { Order } from "@/types"

export type OrderTableColumn = 
  | "order"
  | "customer" 
  | "seller"
  | "buyer"
  | "date"
  | "status"
  | "total"
  | "paymentProof"
  | "actions"

export interface ExtendedOrder extends Order {
  // Additional fields that may be joined from different APIs
  user_name?: string  // For admin view - may come from profiles
  user_email?: string // For admin view - may come from profiles
  payment_method?: string // For admin payments
  payment_approved_at?: string // For admin payments
  payment_approved_by?: string // For admin payments
  payment_rejected_at?: string // For admin payments
  payment_rejected_by?: string // For admin payments
  admin_notes?: string // For admin payments
  rejection_reason?: string // For admin payments
  user_phone?: string // For admin payments
  item_count?: number // For admin payments
}

export interface OrderTableConfig {
  columns: OrderTableColumn[]
  showExpanded?: boolean
  expandedId?: string | null
  onToggleExpand?: (id: string) => void
  renderActions?: (order: ExtendedOrder) => React.ReactNode
  renderExpanded?: (order: ExtendedOrder) => React.ReactNode
}

interface Props {
  orders: ExtendedOrder[]
  fiatSymbol: string
  config: OrderTableConfig
  loading?: boolean
}

export function OrderTable({ orders, fiatSymbol, config, loading = false }: Props) {
  const { columns, showExpanded, expandedId, onToggleExpand, renderActions, renderExpanded } = config

  const getColumnWidth = () => {
    const columnCount = columns.length
    if (columnCount === 5) return "grid-cols-[0.8fr_1.5fr_1fr_1fr_auto]" // Buyer: order, date, status, total, actions (5 columns)
    if (columnCount === 6) return "grid-cols-[0.8fr_1.5fr_1fr_1fr_1fr_auto]" // Seller: order, buyer, date, status, total, actions (6 columns)
    if (columnCount === 8) return "grid-cols-[0.6fr_1fr_1fr_0.8fr_1fr_1fr_1fr_auto]" // Admin: order, customer, seller, total, status, paymentProof, date, actions (8 columns)
    return "grid-cols-[1fr_1.5fr_1.5fr_1.2fr_auto]" // Default fallback
  }

  const renderCell = (order: ExtendedOrder, column: OrderTableColumn) => {
    const itemCount = order.items?.length ?? 0

    switch (column) {
      case "order":
        return (
          <span className="text-sm font-bold text-primary font-mono">
            #{order.id ? order.id.slice(0, 6).toUpperCase() : 'N/A'}
          </span>
        )

      case "customer":
        return (
          <div>
            <div className="font-medium">
              {order.buyer_name || order.user_name || 'Unknown Customer'}
            </div>
            <div className="text-sm text-gray-500">
              {order.user_email || order.buyer_email || 'No email'}
            </div>
          </div>
        )

      case "seller":
        return (
          <div>
            <div className="font-medium">
              {order.seller_business || order.seller_name || 'Unknown Seller'}
            </div>
            <div className="text-sm text-gray-500">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </div>
          </div>
        )

      case "buyer":
        return (
          <div className="min-w-0">
            <p className="text-sm text-gray-800 truncate">
              {order.buyer_name || order.user_name || 'Unknown Buyer'}
            </p>
            {(order.buyer_email || order.user_email) && (
              <p className="text-xs text-gray-400 truncate">
                {order.buyer_email || order.user_email}
              </p>
            )}
          </div>
        )

      case "date":
        return (
          <span className="text-sm text-gray-700">
            {order.created_at 
              ? new Date(order.created_at).toLocaleDateString("en-PH", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : 'N/A'
            }
          </span>
        )

      case "status":
        return <OrderStatusBadge status={order.status || "pending_payment"} size="sm" />

      case "total":
        return (
          <span className="text-sm font-semibold text-gray-900">
            {fiatSymbol}{(order.total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            {itemCount > 0 && (
              <span className="text-xs font-normal text-gray-500 ml-1">
                for {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            )}
          </span>
        )

      case "paymentProof":
        return order.payment_proof_url ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.open(order.payment_proof_url!, '_blank')
              }
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )

      case "actions":
        return renderActions ? renderActions(order) : null

      default:
        return null
    }
  }

  const getColumnHeader = (column: OrderTableColumn) => {
    switch (column) {
      case "order": return "Order"
      case "customer": return "Customer"
      case "seller": return "Seller"
      case "buyer": return "Buyer"
      case "date": return "Date"
      case "status": return "Status"
      case "total": return "Total"
      case "paymentProof": return "Payment Proof"
      case "actions": return "Actions"
      default: return ""
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
        <div className="p-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary mx-auto" />
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
        <div className="p-12 text-center">
          <div className="text-gray-500">No orders found</div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
      {/* Table header */}
      <div className={`grid ${getColumnWidth()} gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200`}>
        {columns.map((column) => (
          <span key={column} className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {getColumnHeader(column)}
          </span>
        ))}
      </div>

      {/* Table rows */}
      <div className="divide-y divide-gray-100">
        {orders.map((order) => {
          const isExpanded = expandedId === order.id
          
          return (
            <div key={order.id}>
              {/* Main row */}
              <div
                className={`grid ${getColumnWidth()} gap-4 px-5 py-4 items-center hover:bg-gray-50 transition-colors ${
                  isExpanded && showExpanded ? "bg-gray-50" : ""
                }`}
                onClick={() => showExpanded && onToggleExpand && onToggleExpand(order.id)}
              >
                {columns.map((column) => (
                  <div key={column}>
                    {renderCell(order, column)}
                  </div>
                ))}
              </div>

              {/* Expanded content */}
              {showExpanded && isExpanded && renderExpanded && (
                <div className="bg-gray-50 border-t border-gray-200">
                  {renderExpanded(order)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
