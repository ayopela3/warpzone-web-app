"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Package, Plus, Loader2, CheckCircle2, Upload, Calendar, Users, Clock,
  CheckCheck, X as XIcon, ChevronDown, ChevronUp,
} from "lucide-react"
import { toast } from "sonner"
import { preOrdersApi } from "@/lib/api-client"
import type { PreOrder, PreOrderReservationDetail } from "@/types"

const GAME_OPTIONS = ["Pokemon", "MTG", "Yu-Gi-Oh!", "Plushies", "Accessories", "Other"]

const INITIAL_FORM = {
  title:        "",
  description:  "",
  game:         "Pokemon",
  price:        "",
  release_date: "",
  max_slots:    "",
  image_url:    "",
}

type Props = { fiatSymbol: string }

export function SellerPreOrdersTab({ fiatSymbol }: Props) {
  const [preOrders, setPreOrders]         = useState<PreOrder[]>([])
  const [loading, setLoading]             = useState(true)
  const [showCreate, setShowCreate]       = useState(false)
  const [form, setForm]                   = useState(INITIAL_FORM)
  const [saving, setSaving]               = useState(false)
  const [uploading, setUploading]         = useState(false)
  const [sellerId, setSellerId]           = useState<string | null>(null)

  /** Accordion expand state */
  const [expandedId, setExpandedId]       = useState<string | null>(null)
  /** Per-pre-order reservation cache: id -> list */
  const [reservationMap, setReservationMap] = useState<Record<string, PreOrderReservationDetail[]>>({})
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null)
  const [togglingId, setTogglingId]       = useState<string | null>(null)

  /** Resolve seller's profile id once */
  useEffect(() => {
    fetch("/api/user/profile", {
      headers: { Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}` },
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

  useEffect(() => { fetchMyPreOrders() }, [fetchMyPreOrders])

  const toggleExpand = async (po: PreOrder) => {
    if (expandedId === po.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(po.id)
    /** Only fetch if not already cached */
    if (reservationMap[po.id]) return
    setLoadingDetailId(po.id)
    try {
      const data = await preOrdersApi.getDetail(po.id)
      if (data.success) {
        setReservationMap((prev) => ({ ...prev, [po.id]: data.reservations }))
      }
    } catch {
      toast.error("Failed to load reservations")
    } finally {
      setLoadingDetailId(null)
    }
  }

  const togglePaid = async (preOrderId: string, r: PreOrderReservationDetail) => {
    setTogglingId(r.id)
    try {
      const result = await preOrdersApi.markPaid(preOrderId, r.id, r.paid === 0)
      if (!result.success) throw new Error(result.error)
      setReservationMap((prev) => ({
        ...prev,
        [preOrderId]: (prev[preOrderId] ?? []).map((x) =>
          x.id === r.id ? { ...x, paid: r.paid === 0 ? 1 : 0 } : x
        ),
      }))
      toast.success(r.paid === 0 ? "Marked as paid" : "Marked as unpaid")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setTogglingId(null)
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
      const data = await res.json() as { success: boolean; url?: string; error?: string }
      if (!data.success || !data.url) throw new Error(data.error ?? "Upload failed")
      setForm((f) => ({ ...f, image_url: data.url! }))
      toast.success("Image uploaded")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.release_date) {
      toast.error("Title and release date are required")
      return
    }
    setSaving(true)
    try {
      const result = await preOrdersApi.create({
        title:        form.title.trim(),
        description:  form.description || undefined,
        game:         form.game,
        image_url:    form.image_url || undefined,
        price:        parseFloat(form.price) || 0,
        release_date: form.release_date,
        max_slots:    form.max_slots ? parseInt(form.max_slots, 10) : undefined,
      })
      if (!result.success) throw new Error(result.error ?? "Failed to submit")
      toast.success("Pre-order submitted for admin review")
      setForm(INITIAL_FORM)
      setShowCreate(false)
      fetchMyPreOrders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit pre-order")
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-foreground">My Pre-Orders</h2>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="mr-2 h-4 w-4" />
          {showCreate ? "Cancel" : "Submit Pre-Order"}
        </Button>
      </div>

      {/* Info notice */}
      <div className="rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
        <strong>How it works:</strong> Submit a pre-order listing and an admin will review it.
        Once approved, customers can reserve their slots. Click any listing to see reservations and mark payments.
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="bg-white shadow-sm border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-primary">Submit New Pre-Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sel-po-title">Title *</Label>
                <Input id="sel-po-title" placeholder="e.g. Scarlet & Violet Booster Box" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sel-po-game">Game *</Label>
                <Select value={form.game} onValueChange={(v) => setForm({ ...form, game: v })}>
                  <SelectTrigger id="sel-po-game"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GAME_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sel-po-price">Price ({fiatSymbol}) *</Label>
                <Input id="sel-po-price" type="number" min="0" placeholder="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sel-po-date">Release Date *</Label>
                <Input id="sel-po-date" type="date" value={form.release_date} onChange={(e) => setForm({ ...form, release_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sel-po-slots">Max Slots (blank = unlimited)</Label>
                <Input id="sel-po-slots" type="number" min="1" placeholder="Unlimited" value={form.max_slots} onChange={(e) => setForm({ ...form, max_slots: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Product Image</Label>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="sel-po-img"
                    className="flex items-center gap-2 cursor-pointer px-3 py-2 border rounded-md text-sm text-gray-600 hover:border-primary hover:text-primary transition"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? "Uploading…" : "Upload"}
                  </Label>
                  <input id="sel-po-img" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  {form.image_url && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Uploaded</span>}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sel-po-desc">Description</Label>
              <Textarea id="sel-po-desc" placeholder="Optional description..." rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="resize-none" />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : "Submit for Review"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pre-order list */}
      {loading ? (
        <div className="py-10 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : preOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border py-10 text-center">
          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No pre-orders submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {preOrders.map((po) => {
            const isOpen       = expandedId === po.id
            const isLoadingRow = loadingDetailId === po.id
            const rows         = reservationMap[po.id] ?? []
            const totalQty     = rows.reduce((s, r) => s + r.quantity, 0)
            const paidCount    = rows.filter((r) => r.paid === 1).length

            return (
              <div key={po.id} className={`bg-white rounded-2xl border transition-all ${
                isOpen ? "border-primary/40 shadow-md" : "border-border shadow-sm"
              }`}>
                {/* ── Row header — click to expand ── */}
                <div className="p-5 flex items-center gap-4">
                  {/* Thumbnail */}
                  <div className="relative h-16 w-16 shrink-0 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
                    {po.image_url
                      ? <Image src={po.image_url} alt={po.title} fill className="object-contain" />
                      : <Package className="h-7 w-7 text-muted-foreground" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base text-foreground truncate">{po.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {fiatSymbol}{po.price.toLocaleString()}
                      {" · "}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(po.release_date).toLocaleDateString()}
                      </span>
                      {" · "}
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {po.reservation_count ?? 0} reserved{po.max_slots ? ` / ${po.max_slots}` : ""}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge variant="outline" className="text-xs">{po.game}</Badge>
                      <Badge variant="outline" className={`text-xs capitalize ${approvalColor(po.approval_status)}`}>
                        {po.approval_status}
                      </Badge>
                      {po.status === "closed" && (
                        <Badge variant="secondary" className="text-xs">Closed</Badge>
                      )}
                    </div>
                  </div>

                  {/* Expand chevron button */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(po)}
                    className="shrink-0 h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    aria-label="Toggle reservations"
                  >
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {/* ── Inline accordion: reservations ── */}
                {isOpen && (
                  <div className="border-t border-border">
                    {/* Mini stats bar */}
                    {rows.length > 0 && (
                      <div className="grid grid-cols-3 gap-px bg-border">
                        {[
                          { label: "Total Qty",    value: totalQty },
                          { label: "Paid",         value: `${paidCount} / ${rows.length}` },
                          { label: "Collected",    value: `${fiatSymbol}${(rows.filter((r) => r.paid === 1).reduce((s, r) => s + r.quantity * po.price, 0)).toLocaleString()}` },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-muted/40 px-4 py-2.5 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                            <p className="text-sm font-extrabold text-foreground mt-0.5">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reservation rows */}
                    {isLoadingRow ? (
                      <div className="py-8 flex justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : rows.length === 0 ? (
                      <div className="py-8 text-center">
                        <Users className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No reservations yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {rows.map((r) => {
                          const displayName  = r.buyer_name ?? r.buyer_email ?? r.user_email ?? "Anonymous"
                          const displayEmail = r.buyer_email ?? r.user_email ?? ""
                          return (
                            <div key={r.id} className="flex items-center justify-between px-5 py-3 gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                                {displayEmail && displayEmail !== displayName && (
                                  <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  <span className="font-medium text-foreground">{r.quantity}x</span>
                                  {" · "}
                                  {fiatSymbol}{(r.quantity * po.price).toLocaleString()}
                                  {" · "}
                                  {new Date(r.reserved_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                                  r.paid === 1
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}>
                                  {r.paid === 1 ? <CheckCheck className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                  {r.paid === 1 ? "Paid" : "Pending"}
                                </span>
                                <Button
                                  size="sm"
                                  variant={r.paid === 1 ? "outline" : "default"}
                                  className={`h-7 text-xs rounded-lg px-2.5 ${
                                    r.paid === 1
                                      ? "border-border"
                                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                                  }`}
                                  disabled={togglingId === r.id}
                                  onClick={() => togglePaid(po.id, r)}
                                >
                                  {togglingId === r.id
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : r.paid === 1 ? <XIcon className="h-3 w-3" /> : "Mark Paid"}
                                </Button>
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
      )}
    </div>
  )
}
