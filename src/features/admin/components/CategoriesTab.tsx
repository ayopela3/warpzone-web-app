"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Loader2, GripVertical, ImageIcon } from "lucide-react"
import Image from "next/image"

type Category = {
  id: string
  slug: string
  label: string
  emoji: string | null
  image_url: string | null
  color: string
  sort_order: number
  is_active: number
}

type FormState = {
  slug: string
  label: string
  emoji: string
  image_url: string
  color: string
  sort_order: string
}

const PRESET_COLORS = [
  { label: "Red",    value: "bg-red-50 border-red-200 hover:border-red-400 hover:bg-red-100" },
  { label: "Amber",  value: "bg-amber-50 border-amber-200 hover:border-amber-400 hover:bg-amber-100" },
  { label: "Purple", value: "bg-purple-50 border-purple-200 hover:border-purple-400 hover:bg-purple-100" },
  { label: "Blue",   value: "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100" },
  { label: "Pink",   value: "bg-pink-50 border-pink-200 hover:border-pink-400 hover:bg-pink-100" },
  { label: "Green",  value: "bg-green-50 border-green-200 hover:border-green-400 hover:bg-green-100" },
  { label: "Gray",   value: "bg-gray-50 border-gray-200 hover:border-gray-400 hover:bg-gray-100" },
]

const EMPTY_FORM: FormState = { slug: "", label: "", emoji: "", image_url: "", color: PRESET_COLORS[6].value, sort_order: "99" }

export function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/categories")
      const data = await res.json() as { success: boolean; categories: Category[] }
      if (data.success) setCategories(data.categories)
    } catch {
      toast.error("Failed to load categories")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCategories() }, [])

  const openNew = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, sort_order: String((categories.length + 1) * 10) })
    setDialogOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditingId(cat.id)
    setForm({
      slug: cat.slug,
      label: cat.label,
      emoji: cat.emoji ?? "",
      image_url: cat.image_url ?? "",
      color: cat.color,
      sort_order: String(cat.sort_order),
    })
    setDialogOpen(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImg(true)
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
      setUploadingImg(false)
      e.target.value = ""
    }
  }

  const handleSave = async () => {
    if (!form.slug.trim() || !form.label.trim()) {
      toast.error("Slug and label are required")
      return
    }
    setSaving(true)
    try {
      const payload = {
        slug: form.slug.trim(),
        label: form.label.trim(),
        emoji: form.emoji.trim() || null,
        image_url: form.image_url.trim() || null,
        color: form.color,
        sort_order: parseInt(form.sort_order) || 99,
      }

      const res = editingId
        ? await fetch(`/api/categories/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })

      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) throw new Error(data.error ?? "Save failed")
      toast.success(editingId ? "Category updated" : "Category created")
      setDialogOpen(false)
      await fetchCategories()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) throw new Error(data.error ?? "Delete failed")
      toast.success("Category deleted")
      setDeleteConfirmId(null)
      await fetchCategories()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    }
  }

  const field = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">Shop Categories</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage the category tags shown on the home page and shop filters.</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-gray-400">
            No categories yet. Click <strong>Add Category</strong> to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {categories.map((cat) => (
            <Card key={cat.id} className={`border-2 ${cat.color}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />

                {/* Preview icon */}
                <div className="h-10 w-16 flex items-center justify-center shrink-0 rounded-lg bg-white border border-gray-200 overflow-hidden">
                  {cat.image_url ? (
                    <Image src={cat.image_url} alt={cat.label} width={56} height={36} className="object-contain max-h-9 w-auto" />
                  ) : (
                    <span className="text-xl">{cat.emoji ?? "🏷️"}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{cat.label}</p>
                  <p className="text-xs text-gray-400 font-mono">slug: {cat.slug} · order: {cat.sort_order}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => openEdit(cat)} className="h-8 gap-1.5">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 border-red-200 text-red-600 hover:bg-red-50" onClick={() => setDeleteConfirmId(cat.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Label + Slug */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Label <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Pokémon" value={form.label} onChange={(e) => field("label", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Slug <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. pokemon" value={form.slug} onChange={(e) => field("slug", e.target.value)} />
                <p className="text-xs text-gray-400">Used in URLs & product matching</p>
              </div>
            </div>

            {/* Icon: emoji OR image */}
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-500 font-medium">Emoji (fallback)</p>
                  <Input placeholder="e.g. 🔴" value={form.emoji} onChange={(e) => field("emoji", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-500 font-medium">Image (takes priority)</p>
                  {form.image_url ? (
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-16 rounded border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                        <Image src={form.image_url} alt="preview" width={56} height={32} className="object-contain max-h-8 w-auto" />
                      </div>
                      <button type="button" className="text-xs text-red-500 underline" onClick={() => field("image_url", "")}>Remove</button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer border border-dashed border-gray-300 rounded-lg px-3 h-9 hover:border-primary transition">
                      {uploadingImg
                        ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        : <ImageIcon className="h-4 w-4 text-gray-400" />}
                      <span className="text-xs text-gray-500">{uploadingImg ? "Uploading…" : "Upload image"}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImg} />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Card Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => field("color", c.value)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition ${c.value} ${form.color === c.value ? "ring-2 ring-offset-1 ring-primary" : ""}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort order */}
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input type="number" min={0} value={form.sort_order} onChange={(e) => field("sort_order", e.target.value)} className="w-28" />
              <p className="text-xs text-gray-400">Lower numbers appear first</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Category?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            This removes the category from the home page and shop filters. Existing products with this category are unaffected.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
