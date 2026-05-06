"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import type { Product } from "@/types"

export type EditForm = {
  name: string
  category: string
  rarity: string
  description: string
  price: string
  quantity: string
}

type Props = {
  product: Product | null
  form: EditForm
  saving: boolean
  saveError: string
  onFormChange: (form: EditForm) => void
  onSave: () => void
  onCancel: () => void
}

export function SellerProductEditDialog({ product, form, saving, saveError, onFormChange, onSave, onCancel }: Props) {
  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        {product && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>SKU (Read-only)</Label>
              <Input value={product.sku} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input value={form.name} onChange={(e) => onFormChange({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => onFormChange({ ...form, category: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Rarity</Label>
              <Input value={form.rarity} onChange={(e) => onFormChange({ ...form, rarity: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => onFormChange({ ...form, price: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" value={form.quantity} onChange={(e) => onFormChange({ ...form, quantity: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="w-full min-h-[100px] p-3 border rounded-md text-sm"
                value={form.description}
                onChange={(e) => onFormChange({ ...form, description: e.target.value })}
              />
            </div>
            {saveError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{saveError}</p>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
