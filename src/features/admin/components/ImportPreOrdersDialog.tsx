"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Download,
  Loader2,
  RefreshCw,
  CheckSquare,
  Square,
  AlertCircle,
  ExternalLink,
  ImageOff,
} from "lucide-react"
import { toast } from "sonner"
import { preOrdersApi } from "@/lib/api-client"

// ---------------------------------------------------------------------------
// Types (mirrors the API route's ScrapedPreOrderItem)
// ---------------------------------------------------------------------------

interface ScrapedItem {
  _key: string
  source: string
  game: string
  title: string
  description: string | null
  image_url: string | null
  full_price: number
  release_date: string | null
  cutoff_date: string | null
  source_url: string
  already_exists: boolean
}

interface LudusCollection {
  slug: string
  game: string
}

/** Editable overlay — keyed by _key, only fields the admin can change */
type EditOverlay = {
  title: string
  full_price: string
  release_date: string
  cutoff_date: string
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  open: boolean
  onClose: () => void
  fiatSymbol: string
  /** Called after a successful import so the parent can refresh its list */
  onImported: () => void
}

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

function ImageThumb({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <ImageOff className="h-5 w-5 text-gray-400" />
      </div>
    )
  }
  return (
    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
      <Image src={src} alt={alt} fill className="object-cover" unoptimized />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

export function ImportPreOrdersDialog({ open, onClose, fiatSymbol, onImported }: Props) {
  const [fetching, setFetching]           = useState(false)
  const [importing, setImporting]         = useState(false)
  const [items, setItems]                 = useState<ScrapedItem[]>([])
  const [collections, setCollections]     = useState<LudusCollection[]>([])
  const [collectionFilter, setCollectionFilter] = useState<string>("all")
  /** Set of _key values the admin has ticked for import */
  const [selected, setSelected]           = useState<Set<string>>(new Set())
  /** Per-item edits keyed by _key */
  const [edits, setEdits]                 = useState<Record<string, EditOverlay>>({})
  /** Which row is in edit mode */
  const [editingKey, setEditingKey]       = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Fetch from API
  // ---------------------------------------------------------------------------

  const fetchItems = useCallback(async (collection?: string) => {
    setFetching(true)
    setItems([])
    setSelected(new Set())
    setEdits({})
    setEditingKey(null)
    try {
      const qs = new URLSearchParams({ source: "ludus" })
      if (collection && collection !== "all") qs.set("collection", collection)

      const sessionId = localStorage.getItem("warpzone-session-id") ?? ""
      const res = await fetch(`/api/admin/scrape-preorders?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${sessionId}` },
      })
      const data = await res.json() as {
        success: boolean
        items?: ScrapedItem[]
        collections?: LudusCollection[]
        error?: string
      }
      if (!data.success) throw new Error(data.error ?? "Failed to fetch")

      setItems(data.items ?? [])
      if (data.collections) setCollections(data.collections)

      // Pre-select items that don't already exist
      const autoSelect = new Set(
        (data.items ?? [])
          .filter((i) => !i.already_exists)
          .map((i) => i._key),
      )
      setSelected(autoSelect)
      toast.success(`Loaded ${data.items?.length ?? 0} product(s) from Ludus`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load distributor data")
    } finally {
      setFetching(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Edit helpers
  // ---------------------------------------------------------------------------

  function getOverlay(item: ScrapedItem): EditOverlay {
    return edits[item._key] ?? {
      title:        item.title,
      full_price:   String(item.full_price),
      release_date: item.release_date ?? "",
      cutoff_date:  item.cutoff_date  ?? "",
    }
  }

  function patchOverlay(key: string, patch: Partial<EditOverlay>) {
    setEdits((prev) => ({
      ...prev,
      [key]: { ...getOverlay(items.find((i) => i._key === key)!), ...prev[key], ...patch },
    }))
  }

  // ---------------------------------------------------------------------------
  // Select all / none helpers (respects current collection filter)
  // ---------------------------------------------------------------------------

  const visibleItems = collectionFilter === "all"
    ? items
    : items.filter((i) => {
        const col = collections.find((c) => c.game === i.game)
        return col?.slug === collectionFilter
      })

  function selectAll() {
    setSelected((prev) => {
      const next = new Set(prev)
      visibleItems.forEach((i) => { if (!i.already_exists) next.add(i._key) })
      return next
    })
  }

  function selectNone() {
    setSelected((prev) => {
      const next = new Set(prev)
      visibleItems.forEach((i) => next.delete(i._key))
      return next
    })
  }

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) { next.delete(key) } else { next.add(key) }
      return next
    })
  }

  // ---------------------------------------------------------------------------
  // Import selected
  // ---------------------------------------------------------------------------

  async function handleImport() {
    const toImport = visibleItems.filter((i) => selected.has(i._key))
    if (!toImport.length) {
      toast.error("Select at least one item to import")
      return
    }

    setImporting(true)
    let ok = 0
    let fail = 0

    for (const item of toImport) {
      const overlay = getOverlay(item)
      const fullPrice = parseFloat(overlay.full_price)
      if (!fullPrice || fullPrice <= 0) {
        toast.error(`"${overlay.title}" has no valid price — skipped`)
        fail++
        continue
      }
      const releaseDate = overlay.release_date ||
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

      try {
        const result = await preOrdersApi.create({
          title:        overlay.title.trim(),
          description:  item.description ?? undefined,
          game:         item.game,
          image_url:    item.image_url ?? undefined,
          full_price:   fullPrice,
          release_date: releaseDate,
          cutoff_date:  overlay.cutoff_date || null,
        } as Parameters<typeof preOrdersApi.create>[0])

        if (!result.success) throw new Error(result.error ?? "API error")
        ok++
      } catch (err) {
        console.error("Import failed for", item.title, err)
        toast.error(`Failed to import "${overlay.title}"`)
        fail++
      }
    }

    setImporting(false)
    if (ok > 0) {
      toast.success(`Imported ${ok} pre-order${ok > 1 ? "s" : ""}${fail ? `, ${fail} failed` : ""}`)
      onImported()
      onClose()
    } else {
      toast.error("All imports failed — check the console for details")
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const selectedCount = visibleItems.filter((i) => selected.has(i._key)).length

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Import Pre-Orders from Distributor
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b bg-gray-50 flex flex-wrap items-center gap-3">
          {/* Source label */}
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <span>Source:</span>
            <Badge variant="outline" className="font-semibold">Ludus Distributors</Badge>
            <a
              href="https://www.ludusproducts.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Collection filter */}
          <Select
            value={collectionFilter}
            onValueChange={(v) => setCollectionFilter(v)}
          >
            <SelectTrigger className="h-8 w-48 text-xs">
              <SelectValue placeholder="All collections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All collections</SelectItem>
              {collections.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>{c.game}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Fetch / refresh */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchItems(collectionFilter === "all" ? undefined : collectionFilter)}
            disabled={fetching}
            className="h-8 text-xs"
          >
            {fetching
              ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
            {items.length ? "Refresh" : "Load Products"}
          </Button>

          {items.length > 0 && (
            <>
              <div className="h-4 w-px bg-gray-200" />
              <Button size="sm" variant="ghost" onClick={selectAll} className="h-8 text-xs gap-1">
                <CheckSquare className="h-3.5 w-3.5" /> Select all
              </Button>
              <Button size="sm" variant="ghost" onClick={selectNone} className="h-8 text-xs gap-1">
                <Square className="h-3.5 w-3.5" /> Deselect all
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">
                {selectedCount} of {visibleItems.length} selected
              </span>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {fetching ? (
            <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Fetching from Ludus…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-sm text-muted-foreground">
              <Download className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Click <strong>Load Products</strong> to fetch available pre-orders from Ludus.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleItems.map((item) => {
                const overlay   = getOverlay(item)
                const isEditing = editingKey === item._key
                const isSelected = selected.has(item._key)

                return (
                  <div
                    key={item._key}
                    className={[
                      "rounded-xl border p-3 transition-colors",
                      item.already_exists
                        ? "border-gray-200 bg-gray-50 opacity-60"
                        : isSelected
                          ? "border-primary/40 bg-primary/5"
                          : "border-gray-200 bg-white",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => !item.already_exists && toggle(item._key)}
                        disabled={item.already_exists}
                        className="mt-0.5 shrink-0"
                        aria-label={isSelected ? "Deselect" : "Select"}
                      >
                        {isSelected
                          ? <CheckSquare className="h-5 w-5 text-primary" />
                          : <Square className="h-5 w-5 text-gray-400" />}
                      </button>

                      {/* Thumb */}
                      <ImageThumb src={item.image_url} alt={item.title} />

                      {/* Details / editable */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {isEditing ? (
                          <Input
                            value={overlay.title}
                            onChange={(e) => patchOverlay(item._key, { title: e.target.value })}
                            className="h-7 text-sm font-semibold"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {overlay.title}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">{item.game}</Badge>
                          {item.already_exists && (
                            <Badge variant="secondary" className="text-xs text-amber-700 bg-amber-50 border-amber-200 gap-1">
                              <AlertCircle className="h-3 w-3" /> Already imported
                            </Badge>
                          )}
                        </div>

                        {/* Editable fields row */}
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          {/* Price */}
                          <label className="flex items-center gap-1 text-xs text-gray-500">
                            <span>{fiatSymbol}</span>
                            <Input
                              type="number"
                              min={0}
                              value={overlay.full_price}
                              onChange={(e) => patchOverlay(item._key, { full_price: e.target.value })}
                              className="h-7 w-28 text-xs"
                              placeholder="Price"
                            />
                          </label>

                          {/* Release date */}
                          <label className="flex items-center gap-1 text-xs text-gray-500">
                            <span>Release</span>
                            <Input
                              type="date"
                              value={overlay.release_date}
                              onChange={(e) => patchOverlay(item._key, { release_date: e.target.value })}
                              className="h-7 w-36 text-xs"
                            />
                          </label>

                          {/* Cutoff date */}
                          <label className="flex items-center gap-1 text-xs text-gray-500">
                            <span>Cutoff</span>
                            <Input
                              type="date"
                              value={overlay.cutoff_date}
                              onChange={(e) => patchOverlay(item._key, { cutoff_date: e.target.value })}
                              className="h-7 w-36 text-xs"
                              placeholder="optional"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Source link */}
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-gray-400 hover:text-primary transition-colors mt-0.5"
                        title="View on Ludus"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-gray-50 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || selectedCount === 0}
            className="gap-2"
          >
            {importing
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            Import {selectedCount > 0 ? `${selectedCount} ` : ""}Pre-Order{selectedCount !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
