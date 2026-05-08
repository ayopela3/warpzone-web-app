"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Package, Gavel, ShoppingBag, DollarSign,
  Plus, CheckCircle2, XCircle, Hourglass, Loader2, Edit2, X, LayoutGrid, List,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import { toast } from "sonner"
import { productsApi } from "@/lib/api-client"
import { SellerProductEditDialog } from "./SellerProductEditDialog"
import { SellerOrdersTab } from "./SellerOrdersTab"
import { SellerPreOrdersTab } from "./SellerPreOrdersTab"
import type { EditForm } from "./SellerProductEditDialog"
import type { Product, Auction } from "@/types"

const CATEGORY_OPTIONS = [
  { value: "pokemon", label: "Pok\u00e9mon" },
  { value: "mtg", label: "Magic: The Gathering" },
  { value: "yugioh", label: "Yu-Gi-Oh!" },
  { value: "plushies", label: "Plushies" },
  { value: "stickers", label: "Stickers" },
  { value: "accessories", label: "Accessories" },
  { value: "other", label: "Other" },
]

const CONDITION_OPTIONS = [
  { value: "NEW", label: "Brand New" },
  { value: "LIKE NEW", label: "Near Mint" },
  { value: "GOOD", label: "Lightly Played" },
  { value: "FAIR", label: "Moderately Played" },
  { value: "POOR", label: "Heavily Played" },
  { value: "DAMAGED", label: "Damaged" },
]

type AuctionEditForm = {
  title: string
  description: string
  category: string
  condition: string
  rarity: string
  starting_price: string
  min_bid_increment: string
  start_time: string
  end_time: string
}
type Props = { userId: string | null; fiatSymbol: string }

export function SellerDashboard({ userId, fiatSymbol }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [auctionsLoading, setAuctionsLoading] = useState(false)
  const [editingAuction, setEditingAuction] = useState<Auction | null>(null)
  const [auctionEditForm, setAuctionEditForm] = useState<AuctionEditForm>({
    title: "", description: "", category: "", condition: "NEW", rarity: "",
    starting_price: "", min_bid_increment: "1", start_time: "", end_time: "",
  })
  const [savingAuction, setSavingAuction] = useState(false)
  const [productViewMode, setProductViewMode] = useState<"list" | "grid">("list")
  const [auctionViewMode, setAuctionViewMode] = useState<"list" | "grid">("list")
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ name: "", category: "", rarity: "", description: "", price: "", quantity: "" })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  const fetchProducts = useCallback(async () => {
    const id = localStorage.getItem("warpzone-user-id") || userId
    if (!id) return
    setLoading(true)
    try {
      const data = await productsApi.list({ sellerId: id, showAll: true })
      if (data.success) setProducts(data.products)
    } catch (error) {
      console.error("Failed to fetch products:", error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const fetchAuctions = useCallback(async () => {
    setAuctionsLoading(true)
    try {
      const res = await fetch("/api/seller/auctions", {
        headers: { Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}` },
      })
      const data = await res.json()
      if (data.success) setAuctions(data.auctions ?? [])
    } catch (error) {
      console.error("Failed to fetch seller auctions:", error)
    } finally {
      setAuctionsLoading(false)
    }
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => { fetchAuctions() }, [fetchAuctions])

  const openAuctionEdit = (auction: Auction) => {
    setEditingAuction(auction)
    // Convert ISO times to datetime-local format (YYYY-MM-DDTHH:mm)
    const toLocal = (iso: string) => {
      const d = new Date(iso)
      const pad = (n: number) => String(n).padStart(2, "0")
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    setAuctionEditForm({
      title: auction.title,
      description: auction.description ?? "",
      category: auction.category,
      condition: auction.condition,
      rarity: auction.rarity ?? "",
      starting_price: auction.starting_price.toString(),
      min_bid_increment: auction.min_bid_increment.toString(),
      start_time: toLocal(auction.start_time),
      end_time: toLocal(auction.end_time),
    })
  }

  const handleAuctionSave = async () => {
    if (!editingAuction) return
    setSavingAuction(true)
    try {
      const res = await fetch(`/api/seller/auctions/${editingAuction.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}`,
        },
        body: JSON.stringify({
          title: auctionEditForm.title,
          description: auctionEditForm.description,
          category: auctionEditForm.category,
          condition: auctionEditForm.condition,
          rarity: auctionEditForm.rarity || null,
          image_url: editingAuction.image_url,
          starting_price: parseFloat(auctionEditForm.starting_price),
          min_bid_increment: parseFloat(auctionEditForm.min_bid_increment),
          start_time: new Date(auctionEditForm.start_time).toISOString(),
          end_time: new Date(auctionEditForm.end_time).toISOString(),
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? "Failed to update auction")
      toast.success("Auction updated successfully")
      setEditingAuction(null)
      fetchAuctions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update auction")
    } finally {
      setSavingAuction(false)
    }
  }

  const openEdit = (product: Product) => {
    setEditingProduct(product)
    setEditForm({
      name: product.name,
      category: product.category,
      rarity: product.rarity ?? "",
      description: product.description ?? "",
      price: product.price.toString(),
      quantity: product.quantity.toString(),
    })
    setSaveError("")
  }

  const handleSave = async () => {
    if (!editingProduct) return
    setSaving(true)
    setSaveError("")
    try {
      const id = localStorage.getItem("warpzone-user-id") || userId
      const result = await productsApi.update(editingProduct.id, {
        name: editForm.name, category: editForm.category, rarity: editForm.rarity,
        description: editForm.description,
        price: parseFloat(editForm.price) || 0,
        quantity: parseInt(editForm.quantity) || 0,
        sellerId: id ?? undefined,
      })
      if (!result.success) throw new Error(result.error ?? "Failed to update product")
      setEditingProduct(null)
      fetchProducts()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to update product")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingProduct(null)
    setSaveError("")
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="border-b bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your products, auctions, and orders</p>
            </div>
            <Button asChild className="bg-primary hover:bg-primary/90 text-white">
              <Link href="/seller/listings/new">
                <Plus className="mr-2 h-4 w-4" />New Listing
              </Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-primary text-white shadow-lg">
              <CardContent className="p-6 flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-white/90">Products</p>
                  <p className="text-4xl font-black mt-2">{products.length}</p>
                  <p className="text-xs text-white/80 mt-1">Total listings</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl"><Package className="h-6 w-6 text-white" /></div>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-lg border-l-4 border-l-blue-500">
              <CardContent className="p-6 flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600">Orders</p>
                  <p className="text-4xl font-bold mt-2 text-gray-900">0</p>
                  <p className="text-xs text-gray-500 mt-1">Pending fulfillment</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl"><ShoppingBag className="h-6 w-6 text-blue-600" /></div>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-lg border-l-4 border-l-emerald-500">
              <CardContent className="p-6 flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600">Revenue</p>
                  <p className="text-4xl font-bold mt-2 text-gray-900">{fiatSymbol}0</p>
                  <p className="text-xs text-emerald-600 mt-1">+0% from last month</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl"><DollarSign className="h-6 w-6 text-emerald-600" /></div>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-lg border-l-4 border-l-amber-500">
              <CardContent className="p-6 flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Auctions</p>
                  <p className="text-4xl font-bold mt-2 text-gray-900">
                    {auctions.filter((a) => a.status === "active").length}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">Currently live</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-xl"><Gavel className="h-6 w-6 text-amber-600" /></div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="products" className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-4 bg-white p-1">
              <TabsTrigger value="products" className="data-[state=active]:bg-primary data-[state=active]:text-white">Products</TabsTrigger>
              <TabsTrigger value="auctions" className="data-[state=active]:bg-primary data-[state=active]:text-white">Auctions</TabsTrigger>
              <TabsTrigger value="pre-orders" className="data-[state=active]:bg-primary data-[state=active]:text-white">Pre-Orders</TabsTrigger>
              <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-white">Orders</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Your Products</h2>
                <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-white">
                  <Button
                    size="sm" variant={productViewMode === "list" ? "default" : "ghost"}
                    className={`h-7 w-7 p-0 ${productViewMode === "list" ? "bg-primary text-white" : ""}`}
                    onClick={() => setProductViewMode("list")}
                  ><List className="h-4 w-4" /></Button>
                  <Button
                    size="sm" variant={productViewMode === "grid" ? "default" : "ghost"}
                    className={`h-7 w-7 p-0 ${productViewMode === "grid" ? "bg-primary text-white" : ""}`}
                    onClick={() => setProductViewMode("grid")}
                  ><LayoutGrid className="h-4 w-4" /></Button>
                </div>
              </div>
              {loading ? (
                <Card className="bg-white shadow-md">
                  <CardContent className="p-12 text-center">
                    <Loader2 className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
                    <p className="text-gray-600">Loading products...</p>
                  </CardContent>
                </Card>
              ) : products.length === 0 ? (
                <Card className="bg-white shadow-md">
                  <CardContent className="p-12 text-center">
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold text-gray-900">No listings yet</h3>
                    <p className="mt-2 text-gray-600">Add your first listing to start selling on Warpzone</p>
                    <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-white">
                      <Link href="/seller/listings/new"><Plus className="mr-2 h-4 w-4" />New Listing</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : productViewMode === "list" ? (
                <div className="space-y-3">
                  {products.map((product) => (
                    <Card key={product.id} className={`bg-white shadow-sm hover:shadow-md transition-shadow ${product.approval_status === "pending" ? "opacity-60" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex gap-4 items-center">
                          <div className="relative w-20 h-20 shrink-0 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                            {product.image_url
                              ? <Image src={product.image_url} alt={product.name} fill className="object-contain" />
                              : <Package className="h-8 w-8 text-gray-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-bold text-gray-900">{product.name}</p>
                                <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                                <p className="text-sm text-gray-500 capitalize">{product.category}{product.rarity ? ` · ${product.rarity}` : ""}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {product.approval_status === "pending" && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1"><Hourglass className="h-3 w-3" />Pending</Badge>}
                                {product.approval_status === "approved" && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Approved</Badge>}
                                {product.approval_status === "rejected" && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>}
                                <Button size="sm" variant="outline" onClick={() => openEdit(product)}><Edit2 className="h-3 w-3" /></Button>
                              </div>
                            </div>
                            {product.approval_status === "pending" && (
                              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md mt-2">Pending admin approval.</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <Card key={product.id} className={`bg-white shadow-md hover:shadow-lg transition-shadow ${product.approval_status === "pending" ? "opacity-60" : ""}`}>
                      <div className="relative w-full h-48 bg-gray-50 rounded-t-lg overflow-hidden flex items-center justify-center">
                        {product.image_url
                          ? <Image src={product.image_url} alt={product.name} fill className="object-contain" />
                          : <Package className="h-12 w-12 text-gray-300" />}
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-gray-900">{product.name}</p>
                            <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {product.approval_status === "pending" && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs flex items-center gap-1"><Hourglass className="h-3 w-3" />Pending</Badge>}
                            {product.approval_status === "approved" && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Approved</Badge>}
                            {product.approval_status === "rejected" && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs flex items-center gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>}
                            <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => openEdit(product)}><Edit2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 capitalize">{product.category}{product.rarity ? ` · ${product.rarity}` : ""}</p>
                        {product.approval_status === "pending" && (
                          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md">Pending admin approval.</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="auctions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Your Auctions</h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-white">
                    <Button
                      size="sm" variant={auctionViewMode === "list" ? "default" : "ghost"}
                      className={`h-7 w-7 p-0 ${auctionViewMode === "list" ? "bg-primary text-white" : ""}`}
                      onClick={() => setAuctionViewMode("list")}
                    ><List className="h-4 w-4" /></Button>
                    <Button
                      size="sm" variant={auctionViewMode === "grid" ? "default" : "ghost"}
                      className={`h-7 w-7 p-0 ${auctionViewMode === "grid" ? "bg-primary text-white" : ""}`}
                      onClick={() => setAuctionViewMode("grid")}
                    ><LayoutGrid className="h-4 w-4" /></Button>
                  </div>
                  <Button asChild className="bg-primary hover:bg-primary/90 text-white">
                    <Link href="/seller/auctions/new"><Plus className="mr-2 h-4 w-4" />Create Auction</Link>
                  </Button>
                </div>
              </div>
              {auctionsLoading ? (
                <Card className="bg-white shadow-md">
                  <CardContent className="p-12 text-center">
                    <Loader2 className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
                    <p className="text-gray-600">Loading auctions...</p>
                  </CardContent>
                </Card>
              ) : auctions.length === 0 ? (
                <Card className="bg-white shadow-md">
                  <CardContent className="p-12 text-center">
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                      <Gavel className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold text-gray-900">No auctions yet</h3>
                    <p className="mt-2 text-gray-600">Create your first auction to start bidding wars on your products</p>
                    <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-white">
                      <Link href="/seller/auctions/new"><Plus className="mr-2 h-4 w-4" />Create Your First Auction</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : auctionViewMode === "list" ? (
                <div className="space-y-3">
                  {auctions.map((auction) => (
                    <Card key={auction.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex gap-4 items-center">
                          <Link href={`/auctions/${auction.id}`} className="relative w-20 h-20 shrink-0 rounded-md overflow-hidden bg-[linear-gradient(135deg,#fef3c7,#ffffff)] flex items-center justify-center">
                            {auction.image_url
                              ? <Image src={auction.image_url} alt={auction.title} fill className="object-contain" />
                              : <Gavel className="h-8 w-8 text-amber-400" />}
                          </Link>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <Link href={`/auctions/${auction.id}`} className="font-bold text-gray-900 hover:text-primary transition-colors">{auction.title}</Link>
                                <p className="text-sm text-gray-500 capitalize">{auction.category} · {auction.condition}</p>
                                <p className="text-sm font-semibold text-primary">{fiatSymbol}{(auction.current_bid ?? auction.starting_price ?? 0).toLocaleString()}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Badge variant={auction.status === "active" ? "default" : "secondary"} className="text-xs">
                                  {auction.status === "active" ? "Live" : auction.status === "upcoming" ? "Upcoming" : "Ended"}
                                </Badge>
                                {auction.status === "upcoming" && (
                                  <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => openAuctionEdit(auction)}>
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Ends: {new Date(auction.end_time).toLocaleString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {auctions.map((auction) => (
                    <Link key={auction.id} href={`/auctions/${auction.id}`}>
                    <Card className="bg-white shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="relative h-36 bg-[linear-gradient(135deg,#fef3c7,#ffffff)] flex items-center justify-center overflow-hidden rounded-t-lg">
                        {auction.image_url
                          ? <Image src={auction.image_url} alt={auction.title} fill className="object-contain" />
                          : <Gavel className="h-12 w-12 text-amber-400" />}
                      </div>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-gray-900 leading-tight">{auction.title}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge
                              variant={auction.status === "active" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {auction.status === "active" ? "Live" : auction.status === "upcoming" ? "Upcoming" : "Ended"}
                            </Badge>
                            {auction.status === "upcoming" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0"
                                onClick={() => openAuctionEdit(auction)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 capitalize">{auction.category} · {auction.condition}</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-sm text-gray-600">Starting bid</span>
                          <span className="font-bold text-primary">{fiatSymbol}{(auction.starting_price ?? 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Current bid</span>
                          <span className="font-semibold text-gray-900">{fiatSymbol}{(auction.current_bid ?? auction.starting_price ?? 0).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-gray-400">
                          Ends: {new Date(auction.end_time).toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="pre-orders" className="space-y-4">
              <SellerPreOrdersTab fiatSymbol={fiatSymbol} />
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Incoming Orders</h2>
              <SellerOrdersTab fiatSymbol={fiatSymbol} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <SellerProductEditDialog
        product={editingProduct}
        form={editForm}
        saving={saving}
        saveError={saveError}
        onFormChange={setEditForm}
        onSave={handleSave}
        onCancel={handleCancel}
      />

      {/* Auction Edit Dialog */}
      <Dialog open={!!editingAuction} onOpenChange={(open) => { if (!open) setEditingAuction(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Auction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="ea-title">Title *</Label>
              <Input id="ea-title" value={auctionEditForm.title} onChange={(e) => setAuctionEditForm({ ...auctionEditForm, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ea-category">Category *</Label>
                <Select value={auctionEditForm.category} onValueChange={(v) => setAuctionEditForm({ ...auctionEditForm, category: v })}>
                  <SelectTrigger id="ea-category"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>{CATEGORY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ea-condition">Condition *</Label>
                <Select value={auctionEditForm.condition} onValueChange={(v) => setAuctionEditForm({ ...auctionEditForm, condition: v })}>
                  <SelectTrigger id="ea-condition"><SelectValue /></SelectTrigger>
                  <SelectContent>{CONDITION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ea-rarity">Rarity <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input id="ea-rarity" value={auctionEditForm.rarity} onChange={(e) => setAuctionEditForm({ ...auctionEditForm, rarity: e.target.value })} placeholder="e.g., Ultra Rare" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ea-desc">Description</Label>
              <Textarea id="ea-desc" rows={3} value={auctionEditForm.description} onChange={(e) => setAuctionEditForm({ ...auctionEditForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ea-price">Starting Bid *</Label>
                <Input id="ea-price" type="number" step="0.01" min="0" value={auctionEditForm.starting_price} onChange={(e) => setAuctionEditForm({ ...auctionEditForm, starting_price: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ea-increment">Min Increment *</Label>
                <Input id="ea-increment" type="number" step="0.01" min="0.01" value={auctionEditForm.min_bid_increment} onChange={(e) => setAuctionEditForm({ ...auctionEditForm, min_bid_increment: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ea-start">Start Time *</Label>
                <Input id="ea-start" type="datetime-local" value={auctionEditForm.start_time} onChange={(e) => setAuctionEditForm({ ...auctionEditForm, start_time: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ea-end">End Time *</Label>
                <Input id="ea-end" type="datetime-local" value={auctionEditForm.end_time} onChange={(e) => setAuctionEditForm({ ...auctionEditForm, end_time: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAuction(null)} disabled={savingAuction}>
              <X className="h-4 w-4 mr-1" />Cancel
            </Button>
            <Button onClick={handleAuctionSave} disabled={savingAuction} className="bg-primary hover:bg-primary/90">
              {savingAuction ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Saving…</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
