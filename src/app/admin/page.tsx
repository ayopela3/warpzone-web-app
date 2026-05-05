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
import { Users, ShoppingBag, Gavel, Trophy, Package, Check, X, Clock, Eye, Loader2 } from "lucide-react"


export default function AdminDashboard() {
  const router = useRouter()
  const { isAuthenticated, userRole } = useApp()
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
  const [selectedApproval, setSelectedApproval] = useState<typeof pendingApprovals[0] | null>(null)
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
    seller_business: string
  }>>([])
  const [productsFilter, setProductsFilter] = useState<"all" | "approved" | "pending" | "rejected">("all")
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)

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
        setSelectedApproval(null)
        fetchPendingApprovals()
        fetchAllProducts()
      }
    } catch (error) {
      console.error("Failed to approve/reject product:", error)
    }
  }

  const fetchAllProducts = async () => {
    setIsLoadingProducts(true)
    try {
      const response = await fetch("/api/products?showAll=true")
      const data = await response.json()
      if (data.success) {
        setAllProducts(data.products || [])
      }
    } catch (error) {
      console.error("Failed to fetch all products:", error)
    } finally {
      setIsLoadingProducts(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && userRole === "admin") {
      fetchAllProducts()
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
                  <p className="text-4xl font-black mt-2">0</p>
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
                  <p className="text-4xl font-bold mt-2 text-gray-900">0</p>
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
                  <p className="text-4xl font-bold mt-2 text-gray-900">0</p>
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
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="auctions">Auctions</TabsTrigger>
            <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals" className="space-y-6">
            {isLoadingApprovals ? (
              <Card className="bg-white shadow-lg">
                <CardContent className="p-12 text-center">
                  <Loader2 className="h-8 w-8 text-gray-400 mx-auto animate-spin" />
                  <p className="mt-4 text-sm text-gray-600">Loading pending approvals...</p>
                </CardContent>
              </Card>
            ) : pendingApprovals.length === 0 ? (
              <Card className="bg-white shadow-lg">
                <CardContent className="p-12 text-center">
                  <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-900">No pending approvals</h3>
                  <p className="mt-2 text-sm text-gray-600">All product submissions have been reviewed</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1 space-y-4">
                  <p className="text-sm font-medium text-gray-600">Pending Submissions</p>
                  {pendingApprovals.map((approval) => (
                    <Card
                      key={approval.id}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        selectedApproval?.id === approval.id ? "border-primary border-2" : "border-gray-200"
                      }`}
                      onClick={() => setSelectedApproval(approval)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{approval.name}</h3>
                            <p className="text-sm text-gray-600">{approval.category}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">{approval.sku}</Badge>
                              {approval.rarity && <Badge variant="outline" className="text-xs">{approval.rarity}</Badge>}
                            </div>
                          </div>
                          <Eye className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                          <span>{approval.seller_name || approval.seller_business || 'Unknown'}</span>
                          <span>{new Date(approval.created_at).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="lg:col-span-2">
                  {selectedApproval && (
                    <Card className="bg-white shadow-lg sticky top-4">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>Review Submission</span>
                          <Badge variant="outline" className="text-xs">Pending</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Product Name</p>
                            <p className="text-lg font-semibold text-gray-900">{selectedApproval.name}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-600">SKU</p>
                              <p className="text-gray-900">{selectedApproval.sku}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Category</p>
                              <p className="text-gray-900">{selectedApproval.category}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Rarity</p>
                              <p className="text-gray-900">{selectedApproval.rarity || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Status</p>
                              <p className="text-gray-900 capitalize">{selectedApproval.approval_status}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Description</p>
                            <p className="text-gray-900 mt-1">{selectedApproval.description || "No description provided"}</p>
                          </div>
                          {selectedApproval.image_url && (
                            <div>
                              <p className="text-sm font-medium text-gray-600">Product Image</p>
                              <img src={selectedApproval.image_url} alt={selectedApproval.name} className="mt-2 max-w-full h-48 object-cover rounded-lg" />
                            </div>
                          )}
                          <div className="pt-4 border-t space-y-2">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Submitted By</p>
                              <p className="text-gray-900">{selectedApproval.seller_name || selectedApproval.seller_business || 'Unknown'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Submitted At</p>
                              <p className="text-gray-900">{new Date(selectedApproval.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-4 pt-4 border-t">
                          <Button 
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleApproval(selectedApproval.id, "approved")}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => handleApproval(selectedApproval.id, "rejected")}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="products">
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Manage Products</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={productsFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setProductsFilter("all")}
                    >
                      All
                    </Button>
                    <Button
                      variant={productsFilter === "approved" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setProductsFilter("approved")}
                    >
                      Approved
                    </Button>
                    <Button
                      variant={productsFilter === "pending" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setProductsFilter("pending")}
                    >
                      Pending
                    </Button>
                    <Button
                      variant={productsFilter === "rejected" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setProductsFilter("rejected")}
                    >
                      Rejected
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
                  <div className="space-y-4">
                    {allProducts
                      .filter(product => {
                        if (productsFilter === "all") return true
                        return product.approval_status === productsFilter
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
                                  </div>
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
                              {product.approval_status === "pending" && (
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
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
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
        </Tabs>
      </div>
    </div>
  )
}
