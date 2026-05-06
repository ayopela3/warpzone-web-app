"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Package, Loader2, LayoutGrid, List, Edit2, Trash2 } from "lucide-react"
import type { Product } from "@/types"

type EditForm = {
  sku: string
  name: string
  category: string
  rarity: string
  description: string
  price: string
  quantity: string
}

type Props = {
  products: Product[]
  loading: boolean
  fiatSymbol: string
  onToggleFeatured: (id: string, current: number) => void
  onToggleActive: (id: string, current: number) => void
  onDelete: (id: string) => void
  onSaveEdit: (id: string, form: EditForm) => Promise<void>
}

const APPROVAL_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
}

export function ProductsTab({ products, loading, fiatSymbol, onToggleFeatured, onToggleActive, onDelete, onSaveEdit }: Props) {
  const [view, setView] = useState<"grid" | "list">("grid")
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest")
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<EditForm>({ sku: "", name: "", category: "", rarity: "", description: "", price: "", quantity: "" })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  const sorted = [...products].sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return sortOrder === "latest" ? -diff : diff
  })

  const handleEdit = (p: Product) => {
    setEditing(p)
    setForm({ sku: p.sku, name: p.name, category: p.category, rarity: p.rarity ?? "", description: p.description ?? "", price: String(p.price), quantity: String(p.quantity) })
    setSaveError("")
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    setSaveError("")
    try {
      await onSaveEdit(editing.id, form)
      setEditing(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to update product")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-white shadow-lg">
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 text-gray-400 mx-auto animate-spin" />
          <p className="mt-4 text-sm text-gray-600">Loading products...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Manage Products</CardTitle>
            <div className="flex gap-2">
              {(["latest", "oldest"] as const).map((o) => (
                <Button key={o} variant={sortOrder === o ? "default" : "outline"} size="sm" onClick={() => setSortOrder(o)} className="capitalize">{o}</Button>
              ))}
              <Button variant={view === "grid" ? "default" : "outline"} size="sm" onClick={() => setView("grid")}><LayoutGrid className="h-4 w-4" /></Button>
              <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")}><List className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="h-8 w-8 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">No products found</h3>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sorted.map((product) => (
                <Card key={product.id} className="border border-gray-200 shadow-sm">
                  <CardContent className="p-0">
                    <div className="relative">
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover" />
                        : <div className="w-full h-48 bg-gray-100 flex items-center justify-center"><Package className="h-16 w-16 text-gray-400" /></div>
                      }
                      <div className="absolute top-3 right-3 flex gap-1 flex-wrap justify-end">
                        <Badge variant={APPROVAL_VARIANT[product.approval_status] ?? "secondary"} className="capitalize shadow-sm">{product.approval_status}</Badge>
                        {product.featured === 1 && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 shadow-sm">Featured</Badge>}
                        {product.is_active === 0 && <Badge variant="outline" className="bg-gray-100 text-gray-600 shadow-sm">Disabled</Badge>}
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="font-bold text-gray-900 line-clamp-1">{product.name}</h3>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="font-semibold">{fiatSymbol}{product.price.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Qty</span><span>{product.quantity}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Seller</span><span className="truncate ml-2">{product.seller_name ?? "Unknown"}</span></div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(product)}><Edit2 className="h-3 w-3 mr-1" />Edit</Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => onToggleFeatured(product.id, product.featured)}>{product.featured === 1 ? "Unfeature" : "Feature"}</Button>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Switch checked={product.is_active === 1} onCheckedChange={() => onToggleActive(product.id, product.is_active)} />
                          <span className="text-gray-600">{product.is_active === 1 ? "Active" : "Disabled"}</span>
                        </div>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => onDelete(product.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((product) => (
                <div key={product.id} className="flex items-center gap-4 border rounded-lg p-4">
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} className="w-16 h-16 object-cover rounded" />
                    : <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center"><Package className="h-8 w-8 text-gray-400" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.sku} · {product.category} · {fiatSymbol}{product.price.toLocaleString()}</p>
                    <Badge variant={APPROVAL_VARIANT[product.approval_status] ?? "secondary"} className="capitalize text-xs mt-1">{product.approval_status}</Badge>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={product.is_active === 1} onCheckedChange={() => onToggleActive(product.id, product.is_active)} />
                    <Button size="sm" variant="outline" onClick={() => handleEdit(product)}><Edit2 className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => onDelete(product.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {saveError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{saveError}</p>}
            {(["sku", "name", "category", "rarity", "price", "quantity"] as (keyof EditForm)[]).map((field) => (
              <div key={field} className="space-y-1">
                <Label className="capitalize">{field}</Label>
                <Input value={form[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))} />
              </div>
            ))}
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
