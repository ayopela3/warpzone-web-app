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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Package, Plus, Loader2, CheckCircle2, XCircle, LockKeyhole,
  Unlock, ChevronDown, ChevronUp, Upload, Users, Calendar,
} from "lucide-react"
import { toast } from "sonner"
import { preOrdersApi } from "@/lib/api-client"
import type { PreOrder } from "@/types"

const INITIAL_FORM = {
  title: "",
  description: "",
  game: "",
  price: "",
  release_date: "",
  max_slots: "",
  image_url: "",
}

type Props = { fiatSymbol: string }

export function PreOrdersTab({ fiatSymbol }: Props) {
  const { categories: dynamicCategories } = useDynamicCategories()
  const [preOrders, setPreOrders]   = useState<PreOrder[]>([])
  const [loading, setLoading]       = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]             = useState(INITIAL_FORM)
  const [saving, setSaving]         = useState(false)
  const [actionId, setActionId]     = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const data = await preOrdersApi.listAll()
      if (data.success) setPreOrders(data.preOrders)
    } catch {
      toast.error("Failed to load pre-orders")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

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

  const handleCreate = async () => {
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
      if (!result.success) throw new Error(result.error ?? "Failed to create")
      toast.success("Pre-order created")
      setForm(INITIAL_FORM)
      setShowCreate(false)
      fetchAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create pre-order")
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async (id: string) => {
    setActionId(id)
    try {
      await preOrdersApi.update(id, { approval_status: "approved" })
      toast.success("Pre-order approved")
      setPreOrders((prev) => prev.map((p) => p.id === id ? { ...p, approval_status: "approved" } : p))
    } catch {
      toast.error("Failed to approve")
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (id: string) => {
    setActionId(id)
    try {
      await preOrdersApi.update(id, { approval_status: "rejected" })
      toast.success("Pre-order rejected")
      setPreOrders((prev) => prev.map((p) => p.id === id ? { ...p, approval_status: "rejected" } : p))
    } catch {
      toast.error("Failed to reject")
    } finally {
      setActionId(null)
    }
  }

  const handleToggleStatus = async (po: PreOrder) => {
    const newStatus = po.status === "active" ? "closed" : "active"
    setActionId(po.id)
    try {
      await preOrdersApi.update(po.id, { status: newStatus })
      toast.success(`Pre-order ${newStatus === "active" ? "reopened" : "closed"}`)
      setPreOrders((prev) => prev.map((p) => p.id === po.id ? { ...p, status: newStatus } : p))
    } catch {
      toast.error("Failed to update status")
    } finally {
      setActionId(null)
    }
  }

  const pending  = preOrders.filter((p) => p.approval_status === "pending")
  const approved = preOrders.filter((p) => p.approval_status !== "pending")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Pre-Orders</h2>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          {showCreate ? "Cancel" : "Create Pre-Order"}
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="bg-white shadow-sm border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-primary">New Store-Wide Pre-Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="po-title">Title *</Label>
                <Input id="po-title" placeholder="e.g. Scarlet & Violet Booster Box" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="po-game">Game *</Label>
                <Select value={form.game} onValueChange={(v) => setForm({ ...form, game: v })}>
                  <SelectTrigger id="po-game"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dynamicCategories.map((cat) => <SelectItem key={cat.id} value={cat.label}>{cat.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="po-price">Price ({fiatSymbol}) *</Label>
                <Input id="po-price" type="number" min="0" placeholder="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="po-date">Release Date *</Label>
                <Input id="po-date" type="date" value={form.release_date} onChange={(e) => setForm({ ...form, release_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="po-slots">Max Slots (blank = unlimited)</Label>
                <Input id="po-slots" type="number" min="1" placeholder="Unlimited" value={form.max_slots} onChange={(e) => setForm({ ...form, max_slots: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="po-image">Product Image</Label>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="po-image-file"
                    className="flex items-center gap-2 cursor-pointer px-3 py-2 border rounded-md text-sm text-gray-600 hover:border-primary hover:text-primary transition"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? "Uploading…" : "Upload"}
                  </Label>
                  <input id="po-image-file" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  {form.image_url && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Uploaded</span>}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="po-desc">Description</Label>
              <Textarea id="po-desc" placeholder="Optional description..." rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="resize-none" />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreate} disabled={saving} className="bg-primary hover:bg-primary/90 text-white">
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</> : "Create Pre-Order"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-amber-700 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse inline-block" />
            Pending Approval ({pending.length})
          </h3>
          {pending.map((po) => (
            <Card key={po.id} className="bg-amber-50 border-amber-200 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="relative h-14 w-14 shrink-0 rounded-lg bg-white border border-amber-200 overflow-hidden flex items-center justify-center">
                  {po.image_url
                    ? <Image src={po.image_url} alt={po.title} fill className="object-contain" />
                    : <Package className="h-6 w-6 text-amber-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{po.title}</p>
                  <p className="text-xs text-gray-500">{po.game} · {fiatSymbol}{po.price.toLocaleString()} · Releases {new Date(po.release_date).toLocaleDateString()}</p>
                  {(po.seller_business ?? po.seller_name) && (
                    <p className="text-xs text-gray-400">Submitted by: {po.seller_business ?? po.seller_name}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleApprove(po.id)}
                    disabled={actionId === po.id}
                  >
                    {actionId === po.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    <span className="ml-1 hidden sm:inline">Approve</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => handleReject(po.id)}
                    disabled={actionId === po.id}
                  >
                    <XCircle className="h-3 w-3" />
                    <span className="ml-1 hidden sm:inline">Reject</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* All pre-orders list */}
      {loading ? (
        <Card className="bg-white shadow-sm">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
          </CardContent>
        </Card>
      ) : approved.length === 0 ? (
        <Card className="bg-white shadow-sm">
          <CardContent className="p-12 text-center">
            <Package className="h-10 w-10 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No pre-orders yet. Create the first one above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-700">All Pre-Orders ({approved.length})</h3>
          {approved.map((po) => {
            const isExpanded = expandedId === po.id
            return (
              <Card key={po.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative h-12 w-12 shrink-0 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                      {po.image_url
                        ? <Image src={po.image_url} alt={po.title} fill className="object-contain" />
                        : <Package className="h-6 w-6 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 truncate">{po.title}</p>
                        <Badge variant="outline" className="text-xs">{po.game}</Badge>
                        {po.status === "active"
                          ? <Badge className="bg-green-500 text-white text-xs">Active</Badge>
                          : <Badge variant="secondary" className="text-xs">Closed</Badge>}
                        {po.approval_status === "rejected" && (
                          <Badge variant="outline" className="text-xs text-red-600 border-red-200">Rejected</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-0.5">
                        <span>{fiatSymbol}{po.price.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(po.release_date).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{po.reservation_count ?? 0} reserved{po.max_slots ? ` / ${po.max_slots}` : ""}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(po)}
                        disabled={actionId === po.id}
                        className={po.status === "active" ? "text-amber-600 border-amber-200" : "text-green-600 border-green-200"}
                      >
                        {actionId === po.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : po.status === "active"
                            ? <><LockKeyhole className="h-3 w-3 mr-1" />Close</>
                            : <><Unlock className="h-3 w-3 mr-1" />Reopen</>}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : po.id)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {isExpanded && po.description && (
                    <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                      {po.description}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
