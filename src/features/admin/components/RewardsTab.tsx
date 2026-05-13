"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Plus, Loader2, Pencil, Trash2, Gift, CheckCircle2,
  XCircle, Clock, Star, Package, Eye, EyeOff, UserPlus,
} from "lucide-react"

type RewardItem = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  points_cost: number
  stock: number | null
  is_active: number
  sort_order: number
  created_at: string
}

type UserLookup = {
  user_id: string
  email: string
  full_name: string | null
  points_balance: number
}

type Redemption = {
  id: string
  user_id: string
  reward_item_id: string
  item_name: string
  item_image_url: string | null
  points_spent: number
  status: string
  note: string | null
  created_at: string
  user_name: string | null
  user_email: string | null
}

const BLANK_FORM = {
  name: "",
  description: "",
  image_url: "",
  points_cost: "",
  stock: "",
  sort_order: "0",
}

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}`,
})

const STATUS_BADGE: Record<string, React.ReactNode> = {
  pending:   <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>,
  fulfilled: <Badge className="text-xs bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Fulfilled</Badge>,
  cancelled: <Badge className="text-xs bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>,
}

export function RewardsTab() {
  const [items, setItems]               = useState<RewardItem[]>([])
  const [redemptions, setRedemptions]   = useState<Redemption[]>([])
  const [loading, setLoading]           = useState(true)
  const [users, setUsers]               = useState<UserLookup[]>([])
  const [adjustUserId, setAdjustUserId] = useState("")
  const [adjustPoints, setAdjustPoints] = useState("")
  const [adjustNote, setAdjustNote]     = useState("")
  const [adjusting, setAdjusting]       = useState(false)
  const [showCreate, setShowCreate]     = useState(false)
  const [editItem, setEditItem]         = useState<RewardItem | null>(null)
  const [form, setForm]                 = useState(BLANK_FORM)
  const [saving, setSaving]             = useState(false)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [actionId, setActionId]         = useState<string | null>(null)
  const [view, setView]                 = useState<"catalogue" | "redemptions" | "adjust">("catalogue")
  const [uploading, setUploading]       = useState(false)
  const [redemptionFilter, setFilter]   = useState<"pending" | "fulfilled" | "cancelled" | "all">("pending")

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [itemsRes, redRes, usersRes] = await Promise.all([
        fetch("/api/reward-items", { headers: authHeaders() }),
        fetch("/api/admin/redemptions", { headers: authHeaders() }),
        fetch("/api/admin/users", { headers: authHeaders() }),
      ])
      const [itemsData, redData, usersData] = await Promise.all([
        itemsRes.json() as Promise<{ success: boolean; rewardItems: RewardItem[] }>,
        redRes.json() as Promise<{ success: boolean; redemptions: Redemption[] }>,
        usersRes.json() as Promise<{ success: boolean; users: UserLookup[] }>,
      ])
      if (itemsData.success) setItems(itemsData.rewardItems)
      if (redData.success) setRedemptions(redData.redemptions)
      if (usersData.success) setUsers(usersData.users)
    } catch {
      toast.error("Failed to load rewards data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openEdit = (item: RewardItem) => {
    setEditItem(item)
    setForm({
      name: item.name,
      description: item.description ?? "",
      image_url: item.image_url ?? "",
      points_cost: String(item.points_cost),
      stock: item.stock !== null ? String(item.stock) : "",
      sort_order: String(item.sort_order),
    })
    setShowCreate(true)
  }

  const resetForm = () => {
    setEditItem(null)
    setForm(BLANK_FORM)
    setShowCreate(false)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json() as { success: boolean; url?: string }
      if (!data.success || !data.url) throw new Error("Upload failed")
      setForm((f) => ({ ...f, image_url: data.url! }))
      toast.success("Image uploaded")
    } catch { toast.error("Upload failed") }
    finally { setUploading(false); e.target.value = "" }
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return }
    if (!form.points_cost || Number(form.points_cost) < 1) { toast.error("Points cost must be ≥ 1"); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || undefined,
        image_url: form.image_url || undefined,
        points_cost: Number(form.points_cost),
        stock: form.stock !== "" ? Number(form.stock) : null,
        sort_order: Number(form.sort_order ?? 0),
      }

      if (editItem) {
        const res = await fetch(`/api/reward-items/${editItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(payload),
        })
        const data = await res.json() as { success: boolean }
        if (!data.success) throw new Error("Update failed")
        toast.success("Reward item updated")
      } else {
        const res = await fetch("/api/reward-items", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(payload),
        })
        const data = await res.json() as { success: boolean }
        if (!data.success) throw new Error("Create failed")
        toast.success("Reward item created")
      }
      resetForm()
      await fetchAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/reward-items/${id}`, {
        method: "DELETE", headers: authHeaders(),
      })
      const data = await res.json() as { success: boolean }
      if (!data.success) throw new Error()
      toast.success("Reward item deleted")
      await fetchAll()
    } catch { toast.error("Delete failed") }
    finally { setDeletingId(null) }
  }

  const handleToggleActive = async (item: RewardItem) => {
    try {
      await fetch(`/api/reward-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ is_active: !item.is_active }),
      })
      await fetchAll()
    } catch { toast.error("Failed to toggle") }
  }

  const handleRedemption = async (id: string, action: "fulfil" | "cancel", note?: string) => {
    setActionId(id)
    try {
      const res = await fetch(`/api/admin/redemptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action, note }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) throw new Error(data.error)
      toast.success(action === "fulfil" ? "Marked as fulfilled" : "Redemption cancelled — points refunded")
      await fetchAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed")
    } finally { setActionId(null) }
  }

  const visibleRedemptions = redemptionFilter === "all"
    ? redemptions
    : redemptions.filter((r) => r.status === redemptionFilter)

  const pendingCount = redemptions.filter((r) => r.status === "pending").length

  const handleAwardPoints = async () => {
    if (!adjustUserId) { toast.error("Select a user"); return }
    const pts = parseInt(adjustPoints, 10)
    if (!pts || pts === 0) { toast.error("Enter a non-zero point value"); return }
    setAdjusting(true)
    try {
      const res = await fetch(`/api/admin/users/${adjustUserId}/points`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ points: pts, note: adjustNote.trim() || undefined }),
      })
      const data = await res.json() as { success: boolean; newBalance?: number; error?: string }
      if (!data.success) throw new Error(data.error ?? "Failed")
      const user = users.find((u) => u.user_id === adjustUserId)
      toast.success(
        `${pts > 0 ? "Awarded" : "Deducted"} ${Math.abs(pts)} pts ${pts > 0 ? "to" : "from"} ${user?.full_name ?? user?.email}. New balance: ${data.newBalance} pts`
      )
      setAdjustPoints("")
      setAdjustNote("")
      await fetchAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to adjust points")
    } finally { setAdjusting(false) }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">Rewards Programme</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage redeemable reward items and fulfil user redemption requests.
            Point value is admin-only — users only see point costs.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm" variant={view === "catalogue" ? "default" : "outline"}
            onClick={() => setView("catalogue")}
            className={view === "catalogue" ? "bg-primary text-white" : ""}
          >
            <Gift className="h-3.5 w-3.5 mr-1.5" /> Catalogue
          </Button>
          <Button
            size="sm" variant={view === "redemptions" ? "default" : "outline"}
            onClick={() => setView("redemptions")}
            className={view === "redemptions" ? "bg-primary text-white" : ""}
          >
            <Star className="h-3.5 w-3.5 mr-1.5" /> Claims
            {pendingCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </Button>
          <Button
            size="sm" variant={view === "adjust" ? "default" : "outline"}
            onClick={() => setView("adjust")}
            className={view === "adjust" ? "bg-primary text-white" : ""}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Adjust Points
          </Button>
        </div>
      </div>

      {/* ── Catalogue view ── */}
      {view === "catalogue" && (
        <>
          <Button
            onClick={() => { resetForm(); setShowCreate(true) }}
            className="bg-primary hover:bg-primary/90 text-white gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" /> Add Reward Item
          </Button>

          {/* Create / Edit form */}
          {showCreate && (
            <Card className="border-primary/30 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-primary">
                  {editItem ? "Edit Reward Item" : "New Reward Item"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Name *</Label>
                    <Input placeholder="e.g. Pokemon Booster Pack" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Points Cost *</Label>
                    <Input type="number" min="1" placeholder="e.g. 500" value={form.points_cost} onChange={(e) => setForm({ ...form, points_cost: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Stock (blank = unlimited)</Label>
                    <Input type="number" min="0" placeholder="Unlimited" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sort Order</Label>
                    <Input type="number" min="0" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea placeholder="Short description shown to users…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                </div>

                <div className="space-y-1.5">
                  <Label>Image</Label>
                  <div className="flex items-center gap-3">
                    {form.image_url && (
                      <div className="relative h-12 w-12 rounded border bg-gray-50 overflow-hidden shrink-0">
                        <Image src={form.image_url} alt="preview" fill className="object-contain p-1" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <span className="text-xs px-3 py-1.5 rounded border border-gray-300 hover:border-primary text-gray-600 hover:text-primary transition">
                        {uploading ? "Uploading…" : "Upload Image"}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {editItem ? "Save Changes" : "Create"}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : items.length === 0 ? (
            <Card><CardContent className="p-12 text-center text-gray-400">No reward items yet. Add one above.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <Card key={item.id} className={`overflow-hidden ${!item.is_active ? "opacity-60" : ""}`}>
                  <div className="relative h-36 bg-gray-50 flex items-center justify-center border-b">
                    {item.image_url
                      ? <Image src={item.image_url} alt={item.name} fill className="object-contain p-3" />
                      : <Package className="h-10 w-10 text-gray-300" />}
                    <div className="absolute top-2 left-2">
                      {item.is_active
                        ? <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Active</Badge>
                        : <Badge className="text-xs bg-gray-100 text-gray-500 border-gray-200">Hidden</Badge>}
                    </div>
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <p className="font-bold text-gray-900 truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      <span className="font-black text-amber-600">{item.points_cost.toLocaleString()}</span>
                      <span className="text-xs text-gray-400">pts</span>
                      {item.stock !== null && (
                        <span className="ml-auto text-xs text-gray-400">Stock: {item.stock}</span>
                      )}
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      <Button size="sm" variant="outline" className="h-7 flex-1 text-xs gap-1" onClick={() => openEdit(item)}>
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleToggleActive(item)}>
                        {item.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
                        disabled={deletingId === item.id}
                        onClick={() => handleDelete(item.id)}
                      >
                        {deletingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Adjust Points view ── */}
      {view === "adjust" && (
        <div className="space-y-6">
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-primary flex items-center gap-2">
                <UserPlus className="h-4 w-4" /> Manually Adjust User Points
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-gray-500">
                Award or deduct points directly. Use positive numbers to give points, negative numbers to deduct.
                Deductions are blocked if they would make the balance go below zero.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>User *</Label>
                  <select
                    value={adjustUserId}
                    onChange={(e) => setAdjustUserId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select a user…</option>
                    {users.map((u) => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Points *</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 100 or -50"
                    value={adjustPoints}
                    onChange={(e) => setAdjustPoints(e.target.value)}
                  />
                  <p className="text-xs text-gray-400">Positive = award &nbsp;·&nbsp; Negative = deduct</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Note (shown in user&apos;s history)</Label>
                  <Input
                    placeholder="e.g. Birthday bonus"
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleAwardPoints}
                disabled={adjusting || !adjustUserId || !adjustPoints}
                className="bg-primary hover:bg-primary/90 text-white gap-2"
              >
                {adjusting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                Apply Adjustment
              </Button>
            </CardContent>
          </Card>

          {/* Per-user balances */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">User Point Balances</h3>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-1.5">
                {users
                  .filter((u) => (u.points_balance ?? 0) > 0)
                  .sort((a, b) => (b.points_balance ?? 0) - (a.points_balance ?? 0))
                  .map((u) => (
                    <div key={u.user_id} className="flex items-center gap-3 bg-white rounded-lg border px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{u.full_name ?? "—"}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                        <span className="font-black text-amber-600">{(u.points_balance ?? 0).toLocaleString()}</span>
                        <span className="text-xs text-gray-400">pts</span>
                      </div>
                      <Button
                        size="sm" variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => { setAdjustUserId(u.user_id); setView("adjust") }}
                      >
                        <UserPlus className="h-3 w-3" /> Adjust
                      </Button>
                    </div>
                  ))}
                {users.every((u) => !u.points_balance) && (
                  <p className="text-sm text-gray-400">No users have earned points yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Redemptions view ── */}
      {view === "redemptions" && (
        <div className="space-y-4">
          {/* Filter pills */}
          <div className="flex gap-2 flex-wrap">
            {(["pending", "fulfilled", "cancelled", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition capitalize ${
                  redemptionFilter === f
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary"
                }`}
              >
                {f}{f === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : visibleRedemptions.length === 0 ? (
            <Card><CardContent className="p-12 text-center text-gray-400">No {redemptionFilter === "all" ? "" : redemptionFilter} redemptions.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {visibleRedemptions.map((r) => (
                <Card key={r.id} className="bg-white">
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Item image */}
                    <div className="relative h-12 w-12 bg-gray-100 rounded shrink-0 overflow-hidden border">
                      {r.item_image_url
                        ? <Image src={r.item_image_url} alt={r.item_name} fill className="object-contain p-1" />
                        : <Gift className="h-5 w-5 text-gray-300 m-auto absolute inset-0" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900">{r.item_name}</p>
                        {STATUS_BADGE[r.status]}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {r.user_name ?? "Unknown"} ({r.user_email}) ·
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400 inline mx-0.5" />
                        {r.points_spent} pts · {new Date(r.created_at).toLocaleDateString()}
                      </p>
                      {r.note && <p className="text-xs text-blue-600 mt-0.5">{r.note}</p>}
                    </div>

                    {/* Actions */}
                    {r.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
                          disabled={actionId === r.id}
                          onClick={() => handleRedemption(r.id, "fulfil")}
                        >
                          {actionId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          Fulfil
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1"
                          disabled={actionId === r.id}
                          onClick={() => handleRedemption(r.id, "cancel", "Cancelled by admin")}
                        >
                          <XCircle className="h-3 w-3" /> Cancel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
