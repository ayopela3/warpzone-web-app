"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/components/shared/app-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Users, ShoppingBag, Gavel, Trophy, Package, Check, X, Clock, Loader2, LayoutGrid, List, Edit2, Settings } from "lucide-react"


export default function AdminDashboard() {
  const router = useRouter()
  const { isAuthenticated, userRole, fiatSymbol } = useApp()
  const [pendingApprovals, setPendingApprovals] = useState<Array<{
    id: string
    sku: string
    name: string
    category: string
    rarity: string
    description: string
    image_url: string
    approval_status: string
    created_by: string
    created_at: string
    seller_name: string
    seller_business: string
  }>>([])
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(false)
  const [allProducts, setAllProducts] = useState<Array<{
    id: string
    sku: string
    name: string
    category: string
    rarity: string
    description: string
    image_url: string
    approval_status: string
    created_by: string
    created_at: string
    seller_name: string
    seller_business: string | null
    featured: number
    is_active: number
    quantity: number
    price: number
  }>>([])
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest")
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalProducts, setTotalProducts] = useState(0)
  const [activeAuctions, setActiveAuctions] = useState(0)
  const [approvalsView, setApprovalsView] = useState<"grid" | "list">("list")
  const [productsView, setProductsView] = useState<"grid" | "list">("grid")
  const [editingProduct, setEditingProduct] = useState<{
    id: string
    sku: string
    name: string
    category: string
    rarity: string | null
    description: string | null
    price: number
    quantity: number
  } | null>(null)
  const [editForm, setEditForm] = useState({
    sku: "",
    name: "",
    category: "",
    rarity: "",
    description: "",
    price: "",
    quantity: ""
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [editFiatSymbol, setEditFiatSymbol] = useState(fiatSymbol)

  // Tournament form state
  const [tournamentForm, setTournamentForm] = useState({
    name: "",
    playerSize: "",
    description: "",
    preregistrationFee: "",
    tournamentDate: "",
    location: "",
    format: "",
    prizePool: ""
  })
  const [isCreatingTournament, setIsCreatingTournament] = useState(false)
  const [tournamentError, setTournamentError] = useState("")
  const [tournamentSuccess, setTournamentSuccess] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || userRole !== "admin") {
      router.push("/")
    }
  }, [isAuthenticated, userRole, router])

  useEffect(() => {
    if (isAuthenticated && userRole === "admin") {
      fetchPendingApprovals()
    }
  }, [isAuthenticated, userRole])

  const handleSaveFiatSymbol = async () => {
    setIsSavingSettings(true)
    try {
      const response = await fetch("/api/settings/fiat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiatSymbol: editFiatSymbol })
      })
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "Failed to save fiat symbol")
      }
      setEditFiatSymbol(data.fiatSymbol)
      window.location.reload()
    } catch (error) {
      console.error("Failed to save fiat symbol:", error)
    } finally {
      setIsSavingSettings(false)
    }
  }

  const fetchPendingApprovals = async () => {
    setIsLoadingApprovals(true)
    try {
      const response = await fetch("/api/admin/products/pending")
      const data = await response.json()
      if (data.success) {
        setPendingApprovals(data.products || [])
      }
    } catch (error) {
      console.error("Failed to fetch pending approvals:", error)
    } finally {
      setIsLoadingApprovals(false)
    }
  }

  const handleApproval = async (productId: string, approvalStatus: "approved" | "rejected") => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus })
      })
      const data = await response.json()
      if (data.success) {
        fetchPendingApprovals()
        fetchAllProducts()
      }
    } catch (error) {
      console.error("Failed to approve/reject product:", error)
    }
  }

  const handleToggleFeatured = async (productId: string, currentFeatured: number) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/toggle-featured`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: currentFeatured === 1 ? 0 : 1 })
      })
      const data = await response.json()
      if (data.success) {
        fetchAllProducts()
      }
    } catch (error) {
      console.error("Failed to toggle featured status:", error)
    }
  }

  const handleToggleActive = async (productId: string, currentActive: number) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/toggle-active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: currentActive === 1 ? 0 : 1 })
      })
      const data = await response.json()
      if (data.success) {
        fetchAllProducts()
      }
    } catch (error) {
      console.error("Failed to toggle active status:", error)
    }
  }

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/update-quantity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity })
      })
      const data = await response.json()
      if (data.success) {
        fetchAllProducts()
      }
    } catch (error) {
      console.error("Failed to update quantity:", error)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/products/${productId}?userRole=admin`, {
        method: "DELETE"
      })
      const data = await response.json()
      if (data.success) {
        fetchAllProducts()
      }
    } catch (error) {
      console.error("Failed to delete product:", error)
    }
  }

  const handleEditProduct = (product: {
    id: string
    sku: string
    name: string
    category: string
    rarity: string | null
    description: string | null
    price: number
    quantity: number
  }) => {
    setEditingProduct(product)
    setEditForm({
      sku: product.sku,
      name: product.name,
      category: product.category,
      rarity: product.rarity || "",
      description: product.description || "",
      price: product.price.toString(),
      quantity: product.quantity.toString()
    })
    setSaveError("")
  }

  const handleSaveEdit = async () => {
    if (!editingProduct) return

    setIsSaving(true)
    setSaveError("")

    try {
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: editForm.sku,
          name: editForm.name,
          category: editForm.category,
          rarity: editForm.rarity,
          description: editForm.description,
          price: parseFloat(editForm.price) || 0,
          quantity: parseInt(editForm.quantity) || 0,
          userRole: "admin"
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update product")
      }

      setEditingProduct(null)
      fetchAllProducts()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to update product")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingProduct(null)
    setEditForm({
      sku: "",
      name: "",
      category: "",
      rarity: "",
      description: "",
      price: "",
      quantity: ""
    })
    setSaveError("")
  }

  const fetchAllProducts = async () => {
    setIsLoadingProducts(true)
    try {
      const response = await fetch("/api/products?showAll=true")
      const data = await response.json()
      if (data.success) {
        setAllProducts(data.products || [])
        setTotalProducts(data.products?.length || 0)
      }
    } catch (error) {
      console.error("Failed to fetch all products:", error)
    } finally {
      setIsLoadingProducts(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      // Fetch total users
      const usersResponse = await fetch("/api/admin/analytics/users")
      const usersData = await usersResponse.json()
      if (usersData.success) {
        setTotalUsers(usersData.count || 0)
      }

      // Fetch active auctions
      const auctionsResponse = await fetch("/api/admin/analytics/auctions")
      const auctionsData = await auctionsResponse.json()
      if (auctionsData.success) {
        setActiveAuctions(auctionsData.count || 0)
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    }
  }

  useEffect(() => {
    if (isAuthenticated && userRole === "admin") {
      fetchAllProducts()
      fetchAnalytics()
    }
  }, [isAuthenticated, userRole])

  const handleTournamentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingTournament(true)
    setTournamentError("")

    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tournamentForm.name,
          playerSize: parseInt(tournamentForm.playerSize),
          description: tournamentForm.description,
          preregistrationFee: parseFloat(tournamentForm.preregistrationFee) || 0,
          tournamentDate: tournamentForm.tournamentDate,
          location: tournamentForm.location,
          format: tournamentForm.format,
          prizePool: tournamentForm.prizePool
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create tournament")
      }

      setTournamentSuccess(true)
      // Reset form
      setTournamentForm({
        name: "",
        playerSize: "",
        description: "",
        preregistrationFee: "",
        tournamentDate: "",
        location: "",
        format: "",
        prizePool: ""
      })

      setTimeout(() => setTournamentSuccess(false), 3000)
    } catch (error) {
      setTournamentError(error instanceof Error ? error.message : "Failed to create tournament")
    } finally {
      setIsCreatingTournament(false)
    }
  }

  if (!isAuthenticated || userRole !== "admin") {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your platform and approve submissions</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-primary to-primary/90 text-white shadow-lg hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-white/90">Total Users</p>
                  <p className="text-4xl font-black mt-2">{totalUsers}</p>
                  <p className="text-xs font-medium text-white/80 mt-1">Registered users</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-all border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Products</p>
                  <p className="text-4xl font-bold mt-2 text-gray-900">{totalProducts}</p>
                  <p className="text-xs text-gray-500 mt-1">Total listings</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <ShoppingBag className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-all border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Auctions</p>
                  <p className="text-4xl font-bold mt-2 text-gray-900">{activeAuctions}</p>
                  <p className="text-xs text-gray-500 mt-1">Live auctions</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Gavel className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-white/90">Pending Approvals</p>
                  <p className="text-4xl font-black mt-2">{pendingApprovals.length}</p>
                  <p className="text-xs font-medium text-white/80 mt-1">Awaiting review</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="approvals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="auctions">Auctions</TabsTrigger>
            <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals">
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Pending Product Approvals</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={approvalsView === "grid" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setApprovalsView("grid")}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={approvalsView === "list" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setApprovalsView("list")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingApprovals ? (
                  <div className="p-12 text-center">
                    <Loader2 className="h-8 w-8 text-gray-400 mx-auto animate-spin" />
                    <p className="mt-4 text-sm text-gray-600">Loading pending approvals...</p>
                  </div>
                ) : pendingApprovals.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold text-gray-900">No pending approvals</h3>
                    <p className="mt-2 text-sm text-gray-600">All product submissions have been reviewed</p>
                  </div>
                ) : (
                  approvalsView === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {pendingApprovals.map((product) => (
                        <Card key={product.id} className="bg-white shadow-md hover:shadow-lg transition-all border border-gray-200">
                          <CardContent className="p-0">
                            <div className="relative">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-full h-48 object-cover"
                                />
                              ) : (
                                <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                  <Package className="h-16 w-16 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="p-5">
                              <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{product.name}</h3>
                              <div className="space-y-2 mb-4">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500">SKU:</span>
                                  <span className="font-mono text-gray-900">{product.sku}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500">Category:</span>
                                  <span className="text-gray-900">{product.category}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500">Seller:</span>
                                  <span className="text-gray-900 truncate">{product.seller_name || 'Unknown'}</span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleApproval(product.id, "approved")}
                                >
                                  <Check className="mr-1 h-3 w-3" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                                  onClick={() => handleApproval(product.id, "rejected")}
                                >
                                  <X className="mr-1 h-3 w-3" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingApprovals.map((product) => (
                        <Card key={product.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-4 flex-1">
                                {product.image_url && (
                                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                    <img
                                      src={product.image_url}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                                  <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                                  <p className="text-sm text-gray-600">{product.category}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Seller: {product.seller_name || product.seller_business || 'Unknown'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Created: {new Date(product.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleApproval(product.id, "approved")}
                                >
                                  <Check className="mr-1 h-3 w-3" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-200 text-red-600 hover:bg-red-50"
                                  onClick={() => handleApproval(product.id, "rejected")}
                                >
                                  <X className="mr-1 h-3 w-3" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Manage Products</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={sortOrder === "latest" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortOrder("latest")}
                    >
                      Latest
                    </Button>
                    <Button
                      variant={sortOrder === "oldest" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortOrder("oldest")}
                    >
                      Oldest
                    </Button>
                    <Button
                      variant={productsView === "grid" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setProductsView("grid")}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={productsView === "list" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setProductsView("list")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingProducts ? (
                  <div className="p-12 text-center">
                    <Loader2 className="h-8 w-8 text-gray-400 mx-auto animate-spin" />
                    <p className="mt-4 text-sm text-gray-600">Loading products...</p>
                  </div>
                ) : allProducts.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold text-gray-900">No products found</h3>
                    <p className="mt-2 text-sm text-gray-600">Products will appear here once they are created</p>
                  </div>
                ) : (
                  productsView === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {allProducts
                        .sort((a, b) => {
                          const dateA = new Date(a.created_at).getTime()
                          const dateB = new Date(b.created_at).getTime()
                          return sortOrder === "latest" ? dateB - dateA : dateA - dateB
                        })
                        .map((product) => (
                          <Card key={product.id} className="bg-white shadow-md hover:shadow-lg transition-all border border-gray-200">
                            <CardContent className="p-0">
                              <div className="relative">
                                {product.image_url ? (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-full h-48 object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                    <Package className="h-16 w-16 text-gray-400" />
                                  </div>
                                )}
                                <div className="absolute top-3 right-3 flex gap-2">
                                  <Badge
                                    variant={
                                      product.approval_status === "approved" ? "default" :
                                      product.approval_status === "pending" ? "secondary" :
                                      "destructive"
                                    }
                                    className="capitalize shadow-sm"
                                  >
                                    {product.approval_status}
                                  </Badge>
                                  {product.featured === 1 && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 shadow-sm">
                                      Featured
                                    </Badge>
                                  )}
                                  {product.is_active === 0 && (
                                    <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300 shadow-sm">
                                      Disabled
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="p-5">
                                <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{product.name}</h3>
                                <div className="space-y-2 mb-4">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">SKU:</span>
                                    <span className="font-mono text-gray-900">{product.sku}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Price:</span>
                                    <span className="font-semibold text-gray-900">{fiatSymbol}{product.price.toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Quantity:</span>
                                    <span className="font-semibold text-gray-900">{product.quantity}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Category:</span>
                                    <span className="text-gray-900">{product.category}</span>
                                  </div>
                                </div>
                                <div className="pt-4 border-t border-gray-100">
                                  <p className="text-xs text-gray-500 mb-2">
                                    Seller: {product.seller_name || 'Unknown'}
                                  </p>
                                  <div className="flex gap-2 mb-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1"
                                      onClick={() => handleEditProduct(product)}
                                    >
                                      <Edit2 className="h-3 w-3 mr-1" />
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1"
                                      onClick={() => handleToggleFeatured(product.id, product.featured)}
                                    >
                                      {product.featured === 1 ? 'Unfeature' : 'Feature'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="flex-1"
                                      onClick={() => handleDeleteProduct(product.id)}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-500">Enabled</span>
                                    <Switch
                                      checked={product.is_active === 1}
                                      onCheckedChange={() => handleToggleActive(product.id, product.is_active)}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Quantity:</span>
                                    <Input
                                      type="number"
                                      value={product.quantity}
                                      onChange={(e) => handleUpdateQuantity(product.id, parseInt(e.target.value) || 0)}
                                      className="h-8 text-xs"
                                      min="0"
                                    />
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {allProducts
                        .sort((a, b) => {
                          const dateA = new Date(a.created_at).getTime()
                          const dateB = new Date(b.created_at).getTime()
                          return sortOrder === "latest" ? dateB - dateA : dateA - dateB
                        })
                        .map((product) => (
                          <Card key={product.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                  {product.image_url && (
                                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                      <img
                                        src={product.image_url}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                                      <Badge
                                        variant={
                                          product.approval_status === "approved" ? "default" :
                                          product.approval_status === "pending" ? "secondary" :
                                          "destructive"
                                        }
                                        className="capitalize"
                                      >
                                        {product.approval_status}
                                      </Badge>
                                      {product.featured === 1 && (
                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                          Featured
                                        </Badge>
                                      )}
                                      {product.is_active === 0 && (
                                        <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                                          Disabled
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                                    <p className="text-sm text-gray-600">{product.category}</p>
                                    <p className="text-sm text-gray-600">Price: {fiatSymbol}{product.price.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Seller: {product.seller_name || product.seller_business || 'Unknown'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Created: {new Date(product.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2 flex-shrink-0">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditProduct(product)}
                                  >
                                    <Edit2 className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={product.featured === 1 ? "default" : "outline"}
                                    onClick={() => handleToggleFeatured(product.id, product.featured)}
                                  >
                                    {product.featured === 1 ? "Unfeature" : "Feature"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteProduct(product.id)}
                                  >
                                    Delete
                                  </Button>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Enabled</span>
                                    <Switch
                                      checked={product.is_active === 1}
                                      onCheckedChange={() => handleToggleActive(product.id, product.is_active)}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Quantity:</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      className="w-20 h-7 text-xs"
                                      defaultValue={product.quantity}
                                      onBlur={(e) => {
                                        const newQuantity = parseInt(e.target.value)
                                        if (!isNaN(newQuantity) && newQuantity >= 0 && newQuantity !== product.quantity) {
                                          handleUpdateQuantity(product.id, newQuantity)
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const newQuantity = parseInt(e.currentTarget.value)
                                          if (!isNaN(newQuantity) && newQuantity >= 0 && newQuantity !== product.quantity) {
                                            handleUpdateQuantity(product.id, newQuantity)
                                          }
                                        }
                                      }}
                                    />
                                    {product.quantity === 0 && (
                                      <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auctions">
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>Manage Auctions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Auction management coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tournaments">
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>Create Tournament Announcement</CardTitle>
              </CardHeader>
              <CardContent>
                {tournamentSuccess && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">Tournament created successfully!</p>
                  </div>
                )}
                {tournamentError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{tournamentError}</p>
                  </div>
                )}
                <form onSubmit={handleTournamentSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="tournamentName">Tournament Name *</Label>
                    <Input
                      id="tournamentName"
                      placeholder="e.g., Pokemon Championship 2024"
                      value={tournamentForm.name}
                      onChange={(e) => setTournamentForm({ ...tournamentForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="playerSize">Player Size *</Label>
                      <Input
                        id="playerSize"
                        type="number"
                        placeholder="e.g., 32"
                        value={tournamentForm.playerSize}
                        onChange={(e) => setTournamentForm({ ...tournamentForm, playerSize: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preregistrationFee">Preregistration Fee</Label>
                      <Input
                        id="preregistrationFee"
                        type="number"
                        step="0.01"
                        placeholder="e.g., 25.00"
                        value={tournamentForm.preregistrationFee}
                        onChange={(e) => setTournamentForm({ ...tournamentForm, preregistrationFee: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tournamentDate">Tournament Date *</Label>
                    <Input
                      id="tournamentDate"
                      type="date"
                      value={tournamentForm.tournamentDate}
                      onChange={(e) => setTournamentForm({ ...tournamentForm, tournamentDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        placeholder="e.g., Main Hall, 123 Event St"
                        value={tournamentForm.location}
                        onChange={(e) => setTournamentForm({ ...tournamentForm, location: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="format">Format</Label>
                      <Input
                        id="format"
                        placeholder="e.g., Standard, Commander"
                        value={tournamentForm.format}
                        onChange={(e) => setTournamentForm({ ...tournamentForm, format: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prizePool">Prize Pool</Label>
                    <Input
                      id="prizePool"
                      placeholder="e.g., $500 cash + prizes"
                      value={tournamentForm.prizePool}
                      onChange={(e) => setTournamentForm({ ...tournamentForm, prizePool: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <textarea
                      id="description"
                      className="w-full min-h-[120px] p-3 border rounded-md text-sm"
                      placeholder="Describe the tournament details, rules, schedule, etc."
                      value={tournamentForm.description}
                      onChange={(e) => setTournamentForm({ ...tournamentForm, description: e.target.value })}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isCreatingTournament}>
                    {isCreatingTournament ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Tournament...
                      </>
                    ) : (
                      <>
                        <Trophy className="mr-2 h-4 w-4" />
                        Create Tournament
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>Manage Users</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">User management coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>App Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Settings className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Fiat Currency Symbol</h3>
                      <p className="text-sm text-gray-600">Change the currency symbol used throughout the app</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fiatSymbol">Currency Symbol</Label>
                    <Input
                      id="fiatSymbol"
                      value={editFiatSymbol}
                      onChange={(e) => setEditFiatSymbol(e.target.value)}
                      placeholder="Enter currency symbol (e.g., $, €, £, ¥)"
                      maxLength={3}
                    />
                    <p className="text-xs text-gray-500">This will update all price displays across the platform</p>
                  </div>
                  <Button onClick={handleSaveFiatSymbol} disabled={isSavingSettings}>
                    {isSavingSettings ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Settings"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={editForm.sku}
                  onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rarity">Rarity</Label>
                <Input
                  id="rarity"
                  value={editForm.rarity}
                  onChange={(e) => setEditForm({ ...editForm, rarity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  className="w-full min-h-[100px] p-3 border rounded-md text-sm"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
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
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
