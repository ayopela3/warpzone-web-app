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
} from "lucide-react"
import { toast } from "sonner"
import { preOrdersApi } from "@/lib/api-client"
import type { PreOrder } from "@/types"

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
  const [preOrders, setPreOrders]   = useState<PreOrder[]>([])
  const [loading, setLoading]       = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]             = useState(INITIAL_FORM)
  const [saving, setSaving]         = useState(false)
  const [uploading, setUploading]   = useState(false)

  const fetchMyPreOrders = useCallback(async () => {
    setLoading(true)
    try {
      /** listAll returns all statuses but the server will only include seller's own
       *  rows plus admin rows. We filter client-side to show only this seller's. */
      const data = await preOrdersApi.listAll()
      if (data.success) {
        /** Show only rows that have a seller_id (i.e., submitted by a seller, not admin) */
        setPreOrders(data.preOrders.filter((p) => p.seller_id !== null))
      }
    } catch {
      toast.error("Failed to load pre-orders")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMyPreOrders() }, [fetchMyPreOrders])

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">My Pre-Orders</h2>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          {showCreate ? "Cancel" : "Submit Pre-Order"}
        </Button>
      </div>

      {/* Info notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 text-sm text-blue-700">
          <strong>How it works:</strong> Submit a pre-order listing and an admin will review it.
          Once approved, customers can reserve their slots. You will be notified when items are reserved.
        </CardContent>
      </Card>

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
              <Button onClick={handleSubmit} disabled={saving} className="bg-primary hover:bg-primary/90 text-white">
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : "Submit for Review"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My submitted pre-orders */}
      {loading ? (
        <Card className="bg-white shadow-sm">
          <CardContent className="p-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
          </CardContent>
        </Card>
      ) : preOrders.length === 0 ? (
        <Card className="bg-white shadow-sm">
          <CardContent className="p-10 text-center">
            <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No pre-orders submitted yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {preOrders.map((po) => (
            <Card key={po.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="relative h-12 w-12 shrink-0 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                  {po.image_url
                    ? <Image src={po.image_url} alt={po.title} fill className="object-contain" />
                    : <Package className="h-6 w-6 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 truncate">{po.title}</p>
                    <Badge variant="outline" className="text-xs">{po.game}</Badge>
                    <Badge variant="outline" className={`text-xs capitalize ${approvalColor(po.approval_status)}`}>
                      {po.approval_status}
                    </Badge>
                    {po.status === "closed" && (
                      <Badge variant="secondary" className="text-xs">Closed</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-0.5">
                    <span>{fiatSymbol}{po.price.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(po.release_date).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{po.reservation_count ?? 0} reserved{po.max_slots ? ` / ${po.max_slots}` : ""}</span>
                  </div>
                  {po.approval_status === "pending" && (
                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />Awaiting admin approval
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
