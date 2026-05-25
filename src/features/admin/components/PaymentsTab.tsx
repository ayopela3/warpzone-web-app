"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Loader2, Filter, Search,
  DollarSign, MoreHorizontal, RefreshCw, Package,
} from "lucide-react"
import { toast } from "sonner"
import { OrderTable } from "@/components/orders/OrderTable"
import { OrderStatusBadge } from "@/features/checkout/components/OrderStatusBadge"
import type { OrderStatus } from "@/types"
import type { ExtendedOrder } from "@/components/orders/OrderTable"

interface Payment extends ExtendedOrder {
  payment_method: string
  payment_approved_at: string
  payment_approved_by: string
  payment_rejected_at: string
  payment_rejected_by: string
  admin_notes: string
  rejection_reason: string
  user_phone?: string
  item_count: number
}

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending_payment", label: "Pending Payment" },
  { value: "payment_submitted", label: "Payment Submitted" },
  { value: "confirming_payment", label: "Confirming Payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "ready_for_pickup", label: "Ready for Pickup" },
  { value: "cancelled", label: "Cancelled" },
]

export function PaymentsTab() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [statusDialog, setStatusDialog] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 })

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && statusFilter !== "all" && { status: statusFilter }),
      })
      
      const response = await fetch(`/api/admin/payments?${params}`)
      if (!response.ok) throw new Error("Failed to fetch payments")
      
      const data = await response.json()
      setPayments(data.payments || [])
      setPagination(prev => ({ ...prev, total: data.pagination?.total || data.total || 0 }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load payments")
    } finally {
      setLoading(false)
    }
  }, [searchTerm, statusFilter, pagination.page, pagination.limit])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const handleUpdateStatus = async (paymentId: string) => {
    setActionLoading(paymentId)
    try {
      const response = await fetch(`/api/admin/orders/${paymentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (!response.ok) throw new Error("Failed to update status")
      
      toast.success("Status updated successfully")
      setStatusDialog(false)
      setNewStatus("")
      fetchPayments()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status")
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by order ID, customer, or seller..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Management ({pagination.total} payments)
          </CardTitle>
          <Button variant="outline" onClick={fetchPayments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <OrderTable
              orders={payments as ExtendedOrder[]}
              fiatSymbol="₱"
              loading={loading}
              config={{
                columns: ["order", "customer", "seller", "total", "status", "paymentProof", "date", "actions"],
                showExpanded: true,
                expandedId,
                onToggleExpand: (id) => setExpandedId(expandedId === id ? null : id),
                renderActions: (payment) => (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedPayment(payment as Payment)
                        setStatusDialog(true)
                      }}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Change Status
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ),
                renderExpanded: (payment) => (
                  <div className="px-5 pb-5 space-y-4">
                    {/* Payment details */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Payment Details</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Order ID:</span> {payment.id.slice(0, 8)}...
                        </div>
                        <div>
                          <span className="font-medium">Amount:</span> ₱{payment.total.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Payment Method:</span> {(payment as Payment).payment_method || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Current Status:</span> 
                          <OrderStatusBadge status={payment.status as OrderStatus} size="sm" />
                        </div>
                      </div>
                    </div>

                    {/* Items */}
                    {payment.items && payment.items.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</p>
                        <div className="space-y-2">
                          {payment.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                              <div className="relative h-10 w-10 rounded bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                                {item.product_image_url
                                  ? <Image src={item.product_image_url} alt={item.product_name ?? ""} fill className="object-contain" />
                                  : <Package className="h-5 w-5 text-gray-400" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{item.product_name ?? "Product"}</p>
                                <p className="text-xs text-gray-500">x{item.quantity} @ ₱{item.price.toLocaleString()}</p>
                              </div>
                              <p className="text-sm font-bold text-gray-900 shrink-0">
                                ₱{(item.price * item.quantity).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Order ID:</span> {selectedPayment.id.slice(0, 8)}...
                  </div>
                  <div>
                    <span className="font-medium">Current Status:</span>
                    <OrderStatusBadge status={selectedPayment.status as OrderStatus} size="sm" />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="new_status">New Status *</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setStatusDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(selectedPayment.id)}
                  disabled={actionLoading === selectedPayment.id || !newStatus}
                >
                  {actionLoading === selectedPayment.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Update Status
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
