"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Package, Gavel, ShoppingBag, DollarSign,
  Plus, CheckCircle2, XCircle, Hourglass, Loader2, Edit2,
} from "lucide-react"
import { productsApi } from "@/lib/api-client"
import { SellerProductEditDialog } from "./SellerProductEditDialog"
import type { EditForm } from "./SellerProductEditDialog"
import type { Product } from "@/types"

type Props = { userId: string | null; fiatSymbol: string }

export function SellerDashboard({ userId, fiatSymbol }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
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

  useEffect(() => { fetchProducts() }, [fetchProducts])

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
                  <p className="text-4xl font-bold mt-2 text-gray-900">0</p>
                  <p className="text-xs text-amber-600 mt-1">Currently live</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-xl"><Gavel className="h-6 w-6 text-amber-600" /></div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="products" className="space-y-6">
            <TabsList className="grid w-full max-w-lg grid-cols-3 bg-white p-1">
              <TabsTrigger value="products" className="data-[state=active]:bg-primary data-[state=active]:text-white">Products</TabsTrigger>
              <TabsTrigger value="auctions" className="data-[state=active]:bg-primary data-[state=active]:text-white">Auctions</TabsTrigger>
              <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-white">Orders</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Your Products</h2>
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
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <Card key={product.id} className={`bg-white shadow-md hover:shadow-lg transition-shadow ${product.approval_status === "pending" ? "opacity-60" : ""}`}>
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-gray-900">{product.name}</p>
                            <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {product.approval_status === "pending" && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                                <Hourglass className="h-3 w-3" />Pending
                              </Badge>
                            )}
                            {product.approval_status === "approved" && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />Approved
                              </Badge>
                            )}
                            {product.approval_status === "rejected" && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                                <XCircle className="h-3 w-3" />Rejected
                              </Badge>
                            )}
                            <Button size="sm" variant="outline" onClick={() => openEdit(product)}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {product.image_url && (
                          <div className="w-full h-32 rounded-md overflow-hidden bg-gray-100">
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="pt-4 border-t">
                          <p className="text-sm text-gray-600">{product.category}</p>
                          {product.rarity && <p className="text-sm text-gray-500">Rarity: {product.rarity}</p>}
                        </div>
                        {product.approval_status === "pending" && (
                          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
                            Your product is pending admin approval. You&apos;ll be able to create listings once approved.
                          </p>
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
                <Button asChild className="bg-primary hover:bg-primary/90 text-white">
                  <Link href="/seller/auctions/new"><Plus className="mr-2 h-4 w-4" />Create Auction</Link>
                </Button>
              </div>
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
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Incoming Orders</h2>
              <Card className="bg-white shadow-md">
                <CardContent className="p-12 text-center">
                  <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <ShoppingBag className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-900">No orders yet</h3>
                  <p className="mt-2 text-gray-600">Orders from customers will appear here</p>
                </CardContent>
              </Card>
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
    </>
  )
}
