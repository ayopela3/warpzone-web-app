"use client"

import { useState, useEffect, useCallback } from "react"
import { useDynamicCategories } from "@/hooks/useDynamicCategories"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Package,
  Plus,
  Loader2,
  CheckCircle2,
  Upload,
  Users,
  Clock,
  CheckCheck,
  X as XIcon,
  ChevronDown,
  ChevronUp,
  Flag,
  AlertTriangle,
  Pencil,
} from "lucide-react"
import { toast } from "sonner"
import { preOrdersApi } from "@/lib/api-client"
import type { PreOrder, PreOrderReservationDetail } from "@/types"
import { ReportUserDialog } from "@/features/shared/components/ReportUserDialog"

const INITIAL_FORM = {
  title: "",
  description: "",
  game: "",
  full_price: "",
  downpayment_pct: "",
  cutoff_date: "",
  release_date: "",
  max_slots: "",
  image_url: "",
}

const ALLOCATION_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: "Pending",   color: "bg-amber-50 text-amber-700 border-amber-200" },
  allocated:  { label: "Allocated", color: "bg-green-50 text-green-700 border-green-200" },
  shortlisted:{ label: "Cut",       color: "bg-red-50 text-red-700 border-red-200" },
  refunded:   { label: "Refunded",  color: "bg-gray-50 text-gray-500 border-gray-200" },
}

type Props = { fiatSymbol: string }

export function SellerPreOrdersTab({ fiatSymbol }: Props) {
  const { categories: dynamicCategories } = useDynamicCategories()
  const [preOrders, setPreOrders] = useState<PreOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sellerId, setSellerId] = useState<string | null>(null)

  /** Accordion expand state */
  const [expandedId, setExpandedId] = useState<string | null>(null)
  /** Per-pre-order reservation cache: id -> list */
  const [reservationMap, setReservationMap] = useState<
    Record<string, PreOrderReservationDetail[]>
  >({})
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [allocatingId, setAllocatingId] = useState<string | null>(null)
  /** Report dialog state */
  const [reportTarget, setReportTarget] = useState<{
    userId: string
    name: string
    referenceId: string
  } | null>(null)

  /** Inline edit state */
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(INITIAL_FORM)
  const [editSaving, setEditSaving] = useState(false)
  const [editUploading, setEditUploading] = useState(false)

  /** Resolve seller's profile id once */
  useEffect(() => {
    fetch("/api/user/profile", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}`,
      },
    })
      .then((r) => r.json())
      .then((d: { success: boolean; profile?: { id: string } }) => {
        if (d.success && d.profile?.id) setSellerId(d.profile.id)
      })
      .catch(() => {})
  }, [])

  const fetchMyPreOrders = useCallback(async () => {
    if (!sellerId) return
    setLoading(true)
    try {
      const data = await preOrdersApi.listBySeller(sellerId)
      if (data.success) setPreOrders(data.preOrders)
    } catch {
      toast.error("Failed to load pre-orders")
    } finally {
      setLoading(false)
    }
  }, [sellerId])

  useEffect(() => {
    fetchMyPreOrders()
  }, [fetchMyPreOrders])

  const toggleExpand = async (po: PreOrder) => {
    if (expandedId === po.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(po.id)
    /** Only use cache if it has rows — empty arrays may be stale 403 results */
    if (reservationMap[po.id]?.length) return
    setLoadingDetailId(po.id)
    try {
      const data = await preOrdersApi.getDetail(po.id)
      if (data.success) {
        setReservationMap((prev) => ({ ...prev, [po.id]: data.reservations }))
      } else {
        toast.error((data as { error?: string }).error ?? "Failed to load reservations")
      }
    } catch {
      toast.error("Failed to load reservations")
    } finally {
      setLoadingDetailId(null)
    }
  }

  const togglePaid = async (
    preOrderId: string,
    r: PreOrderReservationDetail,
  ) => {
    setTogglingId(r.id)
    try {
      const result = await preOrdersApi.markPaid(preOrderId, r.id, r.paid === 0)
      if (!result.success) throw new Error(result.error)
      setReservationMap((prev) => ({
        ...prev,
        [preOrderId]: (prev[preOrderId] ?? []).map((x) =>
          x.id === r.id ? { ...x, paid: r.paid === 0 ? 1 : 0 } : x,
        ),
      }))
      toast.success(r.paid === 0 ? "Marked as paid" : "Marked as unpaid")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setTogglingId(null)
    }
  }

  /** Start editing a pre-order — populate form with current values */
  const handleStartEdit = (po: PreOrder) => {
    setEditingId(po.id)
    setEditForm({
      title: po.title,
      description: po.description ?? "",
      game: po.game,
      full_price: String(po.full_price ?? po.price ?? ""),
      downpayment_pct: po.downpayment_pct ? String(po.downpayment_pct * 100) : "",
      cutoff_date: po.cutoff_date ? po.cutoff_date.split("T")[0] : "",
      release_date: po.release_date ? po.release_date.split("T")[0] : "",
      max_slots: po.max_slots ? String(po.max_slots) : "",
      image_url: po.image_url ?? "",
    })
  }

  /** Save edits via PUT /api/pre-orders/[id] */
  const handleSaveEdit = async (id: string) => {
    if (!editForm.title.trim() || !editForm.release_date) {
      toast.error("Title and release date are required")
      return
    }
    const fullPrice = parseFloat(editForm.full_price)
    if (!fullPrice || fullPrice <= 0) {
      toast.error("Full price is required and must be greater than 0")
      return
    }
    setEditSaving(true)
    try {
      const result = await preOrdersApi.update(id, {
        title: editForm.title.trim(),
        description: editForm.description || "",
        game: editForm.game,
        image_url: editForm.image_url || undefined,
        full_price: fullPrice,
        release_date: editForm.release_date,
        max_slots: editForm.max_slots ? parseInt(editForm.max_slots, 10) : undefined,
      })
      if (!result.success) throw new Error(result.error ?? "Failed to save")
      toast.success("Pre-order updated")
      setEditingId(null)
      fetchMyPreOrders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update pre-order")
    } finally {
      setEditSaving(false)
    }
  }

  /** Image upload for edit form */
  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setEditUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = (await res.json()) as { success: boolean; url?: string; error?: string }
      if (!data.success || !data.url) throw new Error(data.error ?? "Upload failed")
      setEditForm((f) => ({ ...f, image_url: data.url! }))
      toast.success("Image uploaded")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setEditUploading(false)
      e.target.value = ""
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = (await res.json()) as {
        success: boolean
        url?: string
        error?: string
      }
      if (!data.success || !data.url)
        throw new Error(data.error ?? "Upload failed")
      setForm((f) => ({ ...f, image_url: data.url! }))
      toast.success("Image uploaded")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleSetAllocation = async (
    preOrderId: string,
    r: PreOrderReservationDetail,
    status: 'pending' | 'allocated' | 'shortlisted' | 'refunded'
  ) => {
    if (status === 'shortlisted') {
      const confirmed = window.confirm(
        `Confirm cutting ${r.buyer_name ?? r.buyer_email ?? 'this buyer'} from allocation?\n\nTheir paid amount will be added to their shop credit.`
      )
      if (!confirmed) return
    }
    setAllocatingId(r.id)
    try {
      const result = await preOrdersApi.setAllocation(preOrderId, r.id, status)
      if (!result.success) throw new Error(result.error)
      setReservationMap((prev) => ({
        ...prev,
        [preOrderId]: (prev[preOrderId] ?? []).map((x) =>
          x.id === r.id ? { ...x, allocation_status: status } : x
        ),
      }))
      toast.success(
        status === 'shortlisted'
          ? 'Buyer cut — shop credit issued'
          : `Allocation set to ${ALLOCATION_LABELS[status]?.label ?? status}`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update allocation')
    } finally {
      setAllocatingId(null)
    }
  }

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.release_date) {
      toast.error("Title and release date are required")
      return
    }
    const fullPrice = parseFloat(form.full_price)
    if (!fullPrice || fullPrice <= 0) {
      toast.error("Full price is required and must be greater than 0")
      return
    }
    const downpaymentPct = form.downpayment_pct ? parseFloat(form.downpayment_pct) : null
    if (downpaymentPct !== null && (downpaymentPct <= 0 || downpaymentPct > 100)) {
      toast.error("Downpayment % must be between 1 and 100")
      return
    }
    setSaving(true)
    try {
      const result = await preOrdersApi.create({
        title: form.title.trim(),
        description: form.description || undefined,
        game: form.game,
        image_url: form.image_url || undefined,
        full_price: fullPrice,
        downpayment_pct: downpaymentPct,
        cutoff_date: form.cutoff_date || null,
        release_date: form.release_date,
        max_slots: form.max_slots ? parseInt(form.max_slots, 10) : undefined,
      })
      if (!result.success) throw new Error(result.error ?? "Failed to submit")
      toast.success("Pre-order submitted for admin review")
      setForm(INITIAL_FORM)
      setShowCreate(false)
      fetchMyPreOrders()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit pre-order",
      )
    } finally {
      setSaving(false)
    }
  }

  const approvalColor = (s: string) => {
    if (s === "approved") return "bg-green-50 text-green-700 border-green-200"
    if (s === "rejected") return "bg-red-50 text-red-700 border-red-200"
    return "bg-amber-50 text-amber-700 border-amber-200"
  }

  // ── List view (with inline accordion) ─────────────────────────────────────
  return (
    <>
      {reportTarget && (
        <ReportUserDialog
          open={!!reportTarget}
          reportedUserId={reportTarget.userId}
          reportedName={reportTarget.name}
          referenceType='pre_order'
          referenceId={reportTarget.referenceId}
          onClose={() => setReportTarget(null)}
        />
      )}
      <div className='space-y-5'>
        <div className='flex items-center justify-between'>
          <h2 className='font-display text-xl font-bold text-foreground'>
            My Pre-Orders
          </h2>
          <Button
            onClick={() => setShowCreate(!showCreate)}
            className='bg-primary hover:bg-primary/90 text-primary-foreground'
          >
            <Plus className='mr-2 h-4 w-4' />
            {showCreate ? "Cancel" : "Submit Pre-Order"}
          </Button>
        </div>

        {/* Info notice */}
        <div className='rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700'>
          <strong>How it works:</strong> Submit a pre-order listing and an admin
          will review it. Once approved, customers can reserve their slots.
          Click any listing to see reservations and mark payments.
        </div>

        {/* Create form */}
        {showCreate && (
          <Card className='bg-white shadow-sm border-primary/20'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-lg text-primary'>
                Submit New Pre-Order
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-1.5'>
                  <Label htmlFor='sel-po-title'>Title *</Label>
                  <Input
                    id='sel-po-title'
                    placeholder='e.g. Scarlet & Violet Booster Box'
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='sel-po-game'>Category *</Label>
                  <Select
                    value={form.game}
                    onValueChange={(v) => setForm({ ...form, game: v })}
                  >
                    <SelectTrigger id='sel-po-game'>
                      <SelectValue placeholder='Select category' />
                    </SelectTrigger>
                    <SelectContent>
                      {dynamicCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.label}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='sel-po-price'>Full Price ({fiatSymbol}) *</Label>
                  <Input
                    id='sel-po-price'
                    type='number'
                    min='0'
                    placeholder='0'
                    value={form.full_price}
                    onChange={(e) =>
                      setForm({ ...form, full_price: e.target.value })
                    }
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='sel-po-dp'>Downpayment % <span className='text-muted-foreground font-normal'>(blank = full payment)</span></Label>
                  <Input
                    id='sel-po-dp'
                    type='number'
                    min='1'
                    max='100'
                    placeholder='e.g. 30'
                    value={form.downpayment_pct}
                    onChange={(e) =>
                      setForm({ ...form, downpayment_pct: e.target.value })
                    }
                  />
                  {form.downpayment_pct && parseFloat(form.downpayment_pct) > 0 && form.full_price && (
                    <p className='text-xs text-muted-foreground'>
                      Buyer pays {fiatSymbol}{(parseFloat(form.full_price) * parseFloat(form.downpayment_pct) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} upfront
                    </p>
                  )}
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='sel-po-cutoff'>Reservation Cutoff Date <span className='text-muted-foreground font-normal'>(optional)</span></Label>
                  <Input
                    id='sel-po-cutoff'
                    type='date'
                    value={form.cutoff_date}
                    onChange={(e) =>
                      setForm({ ...form, cutoff_date: e.target.value })
                    }
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='sel-po-date'>Release Date *</Label>
                  <Input
                    id='sel-po-date'
                    type='date'
                    value={form.release_date}
                    onChange={(e) =>
                      setForm({ ...form, release_date: e.target.value })
                    }
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='sel-po-slots'>
                    Max Slots (blank = unlimited)
                  </Label>
                  <Input
                    id='sel-po-slots'
                    type='number'
                    min='1'
                    placeholder='Unlimited'
                    value={form.max_slots}
                    onChange={(e) =>
                      setForm({ ...form, max_slots: e.target.value })
                    }
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label>Product Image</Label>
                  <div className='flex items-center gap-2'>
                    <Label
                      htmlFor='sel-po-img'
                      className='flex items-center gap-2 cursor-pointer px-3 py-2 border rounded-md text-sm text-gray-600 hover:border-primary hover:text-primary transition'
                    >
                      {uploading ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <Upload className='h-4 w-4' />
                      )}
                      {uploading ? "Uploading…" : "Upload"}
                    </Label>
                    <input
                      id='sel-po-img'
                      type='file'
                      accept='image/*'
                      className='hidden'
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    {form.image_url && (
                      <span className='text-xs text-green-600 flex items-center gap-1'>
                        <CheckCircle2 className='h-3 w-3' />
                        Uploaded
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='sel-po-desc'>Description</Label>
                <Textarea
                  id='sel-po-desc'
                  placeholder='Optional description...'
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className='resize-none'
                />
              </div>
              <div className='flex justify-end'>
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  className='bg-primary hover:bg-primary/90 text-primary-foreground'
                >
                  {saving ? (
                    <>
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      Submitting…
                    </>
                  ) : (
                    "Submit for Review"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pre-order table */}
        {loading ? (
          <div className='py-10 flex justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        ) : preOrders.length === 0 ? (
          <div className='bg-white rounded-lg border border-border py-10 text-center'>
            <Package className='h-10 w-10 text-muted-foreground mx-auto mb-3' />
            <p className='text-sm text-muted-foreground'>No pre-orders submitted yet.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pre-Order</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Release</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Reservations</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</span>
            </div>

            <div className="divide-y divide-gray-100">
            {preOrders.map((po) => {
              const isOpen = expandedId === po.id
              const isLoadingRow = loadingDetailId === po.id
              const rows = reservationMap[po.id] ?? []
              const totalQty = rows.reduce((s, r) => s + r.quantity, 0)
              const paidCount = rows.filter((r) => r.paid === 1).length

              return (
                <div key={po.id} className="bg-white">
                  {/* Table row */}
                  <div className={`grid grid-cols-[3fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center hover:bg-gray-50 transition-colors ${isOpen ? "bg-gray-50" : ""}`}>
                    {/* Title + approval */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-10 w-10 shrink-0 rounded-md bg-gray-100 overflow-hidden flex items-center justify-center">
                        {po.image_url
                          ? <Image src={po.image_url} alt={po.title} fill className="object-contain" />
                          : <Package className="h-5 w-5 text-gray-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{po.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <Badge variant="outline" className={`text-[10px] capitalize ${approvalColor(po.approval_status)}`}>
                            {po.approval_status}
                          </Badge>
                          {po.status === "closed" && (
                            <Badge variant="secondary" className="text-[10px]">Closed</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Category */}
                    <span className="text-sm text-gray-600 truncate">{po.game}</span>

                    {/* Price */}
                    <span className="text-sm font-semibold text-gray-900">
                      {fiatSymbol}{po.price.toLocaleString()}
                    </span>

                    {/* Release date */}
                    <span className="text-sm text-gray-600">
                      {new Date(po.release_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>

                    {/* Reservations */}
                    <span className="text-sm text-gray-700 flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      {po.reservation_count ?? 0}
                      {po.max_slots ? <span className="text-gray-400">/{po.max_slots}</span> : ""}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => editingId === po.id ? setEditingId(null) : handleStartEdit(po)}
                        className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors"
                        aria-label="Edit pre-order"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {editingId === po.id ? "Cancel" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleExpand(po)}
                        className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors"
                        aria-label="Toggle reservations"
                      >
                        Details {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* ── Inline edit form ── */}
                  {editingId === po.id && (
                    <div className="border-t border-border bg-amber-50/50 px-5 py-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor={`edit-title-${po.id}`}>Title *</Label>
                          <Input
                            id={`edit-title-${po.id}`}
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`edit-game-${po.id}`}>Game / Category *</Label>
                          <Select value={editForm.game} onValueChange={(v) => setEditForm({ ...editForm, game: v })}>
                            <SelectTrigger id={`edit-game-${po.id}`}><SelectValue placeholder="Select game" /></SelectTrigger>
                            <SelectContent>
                              {dynamicCategories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.label}>{cat.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`edit-price-${po.id}`}>Full Price ({fiatSymbol}) *</Label>
                          <Input
                            id={`edit-price-${po.id}`}
                            type="number"
                            min="0"
                            value={editForm.full_price}
                            onChange={(e) => setEditForm({ ...editForm, full_price: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`edit-date-${po.id}`}>Release Date *</Label>
                          <Input
                            id={`edit-date-${po.id}`}
                            type="date"
                            value={editForm.release_date}
                            onChange={(e) => setEditForm({ ...editForm, release_date: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`edit-slots-${po.id}`}>Max Slots (blank = unlimited)</Label>
                          <Input
                            id={`edit-slots-${po.id}`}
                            type="number"
                            min="1"
                            placeholder="Unlimited"
                            value={editForm.max_slots}
                            onChange={(e) => setEditForm({ ...editForm, max_slots: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Product Image</Label>
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`edit-img-${po.id}`}
                              className="flex items-center gap-2 cursor-pointer px-3 py-2 border rounded-md text-sm text-gray-600 hover:border-primary hover:text-primary transition"
                            >
                              {editUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                              {editUploading ? "Uploading…" : "Upload"}
                            </Label>
                            <input
                              id={`edit-img-${po.id}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleEditImageUpload}
                              disabled={editUploading}
                            />
                            {editForm.image_url && (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />Uploaded
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`edit-desc-${po.id}`}>Description</Label>
                        <Textarea
                          id={`edit-desc-${po.id}`}
                          placeholder="Optional description..."
                          rows={3}
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="resize-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(po.id)}
                          disabled={editSaving}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          {editSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save Changes"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── Inline accordion: reservations ── */}
                  {isOpen && (
                    <div className='border-t border-border rounded-b-2xl overflow-hidden'>
                      {/* Coloured stat cards */}
                      <div className='grid grid-cols-3 gap-3 p-4 bg-muted/30'>
                        <div className='bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3'>
                          <div className='p-2 bg-primary/20 rounded-lg shrink-0'>
                            <Users className='h-4 w-4 text-primary' />
                          </div>
                          <div>
                            <p className='text-[10px] font-semibold text-primary/70 uppercase tracking-wide'>
                              Total Qty
                            </p>
                            <p className='text-xl font-black text-primary leading-none mt-0.5'>
                              {totalQty}
                            </p>
                          </div>
                        </div>
                        <div className='bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3'>
                          <div className='p-2 bg-blue-100 rounded-lg shrink-0'>
                            <CheckCheck className='h-4 w-4 text-blue-600' />
                          </div>
                          <div>
                            <p className='text-[10px] font-semibold text-blue-500 uppercase tracking-wide'>
                              Paid
                            </p>
                            <p className='text-xl font-black text-blue-700 leading-none mt-0.5'>
                              {paidCount}
                              <span className='text-sm font-medium text-blue-400'>
                                {" "}
                                / {rows.length}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className='bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3'>
                          <div className='p-2 bg-green-100 rounded-lg shrink-0'>
                            <Clock className='h-4 w-4 text-green-600' />
                          </div>
                          <div>
                            <p className='text-[10px] font-semibold text-green-600 uppercase tracking-wide'>
                              Collected
                            </p>
                            <p className='text-lg font-black text-green-700 leading-none mt-0.5 truncate'>
                              {fiatSymbol}
                              {rows
                                .filter((r) => r.paid === 1)
                                .reduce((s, r) => s + r.quantity * (r.unit_price || po.price), 0)
                                .toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Reservation list header */}
                      <div className='px-5 py-3 bg-white border-t border-border flex items-center justify-between'>
                        <p className='text-xs font-bold text-foreground uppercase tracking-wider'>
                          Reservations
                        </p>
                        <span className='text-xs text-muted-foreground'>
                          {rows.length} total
                        </span>
                      </div>

                      {/* Reservation rows */}
                      {isLoadingRow ? (
                        <div className='py-10 flex justify-center bg-white'>
                          <Loader2 className='h-5 w-5 animate-spin text-primary' />
                        </div>
                      ) : rows.length === 0 ? (
                        <div className='py-10 text-center bg-white'>
                          <div className='h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3'>
                            <Users className='h-6 w-6 text-muted-foreground' />
                          </div>
                          <p className='text-sm font-medium text-muted-foreground'>
                            No reservations yet
                          </p>
                          <p className='text-xs text-muted-foreground/60 mt-1'>
                            Customers who reserve this pre-order will appear
                            here
                          </p>
                        </div>
                      ) : (
                        <div className='divide-y divide-border bg-white'>
                          {rows.map((r, idx) => {
                            const displayName =
                              r.buyer_name ??
                              r.buyer_email ??
                              r.user_email ??
                              "Anonymous"
                            const displayEmail =
                              r.buyer_email ?? r.user_email ?? ""
                            const initials = displayName
                              .split(" ")
                              .map((w: string) => w[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()
                            return (
                              <div
                                key={r.id}
                                className='flex items-center gap-4 px-5 py-3.5'
                              >
                                {/* Avatar */}
                                <div className='h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0'>
                                  <span className='text-xs font-bold text-primary'>
                                    {initials}
                                  </span>
                                </div>
                                {/* Buyer info */}
                                <div className='flex-1 min-w-0'>
                                  <div className='flex items-center gap-2'>
                                    <p className='text-sm font-semibold text-foreground truncate'>
                                      {displayName}
                                    </p>
                                    <span className='text-xs text-muted-foreground shrink-0'>
                                      #{idx + 1}
                                    </span>
                                  </div>
                                  {displayEmail &&
                                    displayEmail !== displayName && (
                                      <p className='text-xs text-muted-foreground truncate'>
                                        {displayEmail}
                                      </p>
                                    )}
                                  <p className='text-xs text-muted-foreground mt-0.5'>
                                    <span className='font-semibold text-foreground'>
                                      {r.quantity}×
                                    </span>{" "}
                                    <span className='text-primary font-medium'>
                                      {fiatSymbol}
                                      {(r.quantity * (r.unit_price || po.price)).toLocaleString()}
                                    </span>
                                    {" · "}
                                    {new Date(
                                      r.reserved_at,
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                                {/* Status + action */}
                                <div className='flex items-center gap-2 shrink-0 flex-wrap justify-end'>
                                  {/* Payment badge */}
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border ${
                                      r.paid === 1
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                    }`}
                                  >
                                    {r.paid === 1 ? (
                                      <CheckCheck className='h-3 w-3' />
                                    ) : (
                                      <Clock className='h-3 w-3' />
                                    )}
                                    {r.paid === 1 ? "Paid" : "Pending"}
                                  </span>
                                  {/* Allocation dropdown */}
                                  <Select
                                    value={r.allocation_status ?? 'pending'}
                                    onValueChange={(v) =>
                                      handleSetAllocation(po.id, r, v as 'pending' | 'allocated' | 'shortlisted' | 'refunded')
                                    }
                                    disabled={allocatingId === r.id}
                                  >
                                    <SelectTrigger
                                      className={`h-7 text-xs w-32 rounded-lg border font-semibold ${
                                        ALLOCATION_LABELS[r.allocation_status ?? 'pending']?.color ?? ''
                                      }`}
                                    >
                                      {allocatingId === r.id
                                        ? <Loader2 className='h-3 w-3 animate-spin' />
                                        : <SelectValue />}
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value='pending'>Pending</SelectItem>
                                      <SelectItem value='allocated'>Allocated</SelectItem>
                                      <SelectItem value='shortlisted'>
                                        <span className='flex items-center gap-1 text-red-600'>
                                          <AlertTriangle className='h-3 w-3' />Cut
                                        </span>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size='sm'
                                    variant={
                                      r.paid === 1 ? "outline" : "default"
                                    }
                                    className={`h-7 text-xs rounded-lg px-3 font-semibold ${
                                      r.paid === 1
                                        ? "border-border text-muted-foreground"
                                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                                    }`}
                                    disabled={togglingId === r.id}
                                    onClick={() => togglePaid(po.id, r)}
                                  >
                                    {togglingId === r.id ? (
                                      <Loader2 className='h-3 w-3 animate-spin' />
                                    ) : r.paid === 1 ? (
                                      <XIcon className='h-3 w-3' />
                                    ) : (
                                      "Mark Paid"
                                    )}
                                  </Button>
                                  {/* Report buyer button */}
                                  {r.user_id && (
                                    <Button
                                      size='sm'
                                      variant='ghost'
                                      className='h-7 w-7 p-0 text-muted-foreground hover:text-orange-500 hover:bg-orange-50'
                                      title='Report this buyer'
                                      onClick={() =>
                                        setReportTarget({
                                          userId: r.user_id!,
                                          name: displayName,
                                          referenceId: po.id,
                                        })
                                      }
                                    >
                                      <Flag className='h-3.5 w-3.5' />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
