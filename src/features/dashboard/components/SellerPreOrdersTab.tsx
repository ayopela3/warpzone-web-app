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
  ArrowLeft, CheckCheck, X as XIcon,
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

  /** Detail panel state */
  const [selected, setSelected]           = useState<PreOrder | null>(null)
  const [reservations, setReservations]   = useState<PreOrderReservationDetail[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
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

  const openDetail = async (po: PreOrder) => {
    setSelected(po)
    setDetailLoading(true)
    try {
      const data = await preOrdersApi.getDetail(po.id)
      if (data.success) setReservations(data.reservations)
    } catch {
      toast.error("Failed to load reservations")
    } finally {
      setDetailLoading(false)
    }
  }

  const togglePaid = async (r: PreOrderReservationDetail) => {
    if (!selected) return
    setTogglingId(r.id)
    try {
      const result = await preOrdersApi.markPaid(selected.id, r.id, r.paid === 0)
      if (!result.success) throw new Error(result.error)
      setReservations((prev) =>
        prev.map((x) => x.id === r.id ? { ...x, paid: r.paid === 0 ? 1 : 0 } : x)
      )
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

  // ── Detail panel ──────────────────────────────────────────────────────────
  if (selected) {
    const totalQty  = reservations.reduce((s, r) => s + r.quantity, 0)
    const paidCount = reservations.filter((r) => r.paid === 1).length
    const totalRevenue = reservations
      .filter((r) => r.paid === 1)
      .reduce((s, r) => s + r.quantity * selected.price, 0)

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="gap-1.5 -ml-1">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-xl font-bold text-foreground truncate">{selected.title}</h2>
            <p className="text-xs text-muted-foreground">
              {fiatSymbol}{selected.price.toLocaleString()} · {new Date(selected.release_date).toLocaleDateString()}
            </p>
          </div>
          <Badge variant="outline" className={`text-xs capitalize shrink-0 ${approvalColor(selected.approval_status)}`}>
            {selected.approval_status}
          </Badge>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Reserved", value: totalQty },
            { label: "Paid", value: `${paidCount} / ${reservations.length}` },
            { label: "Revenue Collected", value: `${fiatSymbol}${totalRevenue.toLocaleString()}` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-2xl border border-border p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
              <p className="font-display font-extrabold text-xl text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Reservation list */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-foreground">Reservations</h3>
            <span className="text-xs text-muted-foreground">{reservations.length} total</span>
          </div>

          {detailLoading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : reservations.length === 0 ? (
            <div className="py-10 text-center">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No reservations yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {reservations.map((r) => {
                const displayName = r.buyer_name ?? r.buyer_email ?? r.user_email ?? "Anonymous"
                const displayEmail = r.buyer_email ?? r.user_email ?? ""
                return (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3.5 gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                      {displayEmail && displayEmail !== displayName && (
                        <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Qty: <span className="font-medium text-foreground">{r.quantity}</span>
                        {" · "}
                        {new Date(r.reserved_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        r.paid === 1
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
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
                        onClick={() => togglePaid(r)}
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
      </div>
    )
  }

  // ── List view ──────────────────────────────────────────────────────────────
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
          {preOrders.map((po) => (
            <button
              key={po.id}
              onClick={() => openDetail(po)}
              className="w-full text-left bg-white rounded-2xl border border-border hover:border-primary/40 hover:shadow-sm transition-all p-4 flex items-center gap-4 group"
            >
              <div className="relative h-12 w-12 shrink-0 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
                {po.image_url
                  ? <Image src={po.image_url} alt={po.title} fill className="object-contain" />
                  : <Package className="h-6 w-6 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{po.title}</p>
                  <Badge variant="outline" className="text-xs">{po.game}</Badge>
                  <Badge variant="outline" className={`text-xs capitalize ${approvalColor(po.approval_status)}`}>
                    {po.approval_status}
                  </Badge>
                  {po.status === "closed" && (
                    <Badge variant="secondary" className="text-xs">Closed</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
                  <span className="font-medium text-foreground">{fiatSymbol}{po.price.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(po.release_date).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{po.reservation_count ?? 0} reserved{po.max_slots ? ` / ${po.max_slots}` : ""}</span>
                </div>
                {po.approval_status === "pending" && (
                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />Awaiting admin approval
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0 group-hover:text-primary transition-colors">View →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
