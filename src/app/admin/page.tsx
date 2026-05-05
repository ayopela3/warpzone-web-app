"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/components/shared/app-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, ShoppingBag, Gavel, Trophy, Package, Check, X, Clock, Eye } from "lucide-react"

const pendingApprovals: Array<{
  id: string
  name: string
  category: string
  price: number
  quantity: number
  rarity: string
  description: string
  submittedBy: string
  submittedAt: string
}> = []

export default function AdminDashboard() {
  const router = useRouter()
  const { isAuthenticated, userRole } = useApp()
  const [selectedApproval, setSelectedApproval] = useState<typeof pendingApprovals[0] | null>(null)

  useEffect(() => {
    if (!isAuthenticated || userRole !== "admin") {
      router.push("/")
    }
  }, [isAuthenticated, userRole, router])

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
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="auctions">Auctions</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals" className="space-y-6">
            {pendingApprovals.length === 0 ? (
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
                              <Badge variant="secondary" className="text-xs">${approval.price}</Badge>
                              {approval.rarity && <Badge variant="outline" className="text-xs">{approval.rarity}</Badge>}
                            </div>
                          </div>
                          <Eye className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                          <span>{approval.submittedBy}</span>
                          <span>{approval.submittedAt}</span>
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
                              <p className="text-sm font-medium text-gray-600">Category</p>
                              <p className="text-gray-900">{selectedApproval.category}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Rarity</p>
                              <p className="text-gray-900">{selectedApproval.rarity || "N/A"}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Price</p>
                              <p className="text-lg font-semibold text-gray-900">${selectedApproval.price}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Quantity</p>
                              <p className="text-gray-900">{selectedApproval.quantity}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Description</p>
                            <p className="text-gray-900 mt-1">{selectedApproval.description}</p>
                          </div>
                          <div className="pt-4 border-t space-y-2">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Submitted By</p>
                              <p className="text-gray-900">{selectedApproval.submittedBy}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Submitted At</p>
                              <p className="text-gray-900">{selectedApproval.submittedAt}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-4 pt-4 border-t">
                          <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                            <Check className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50">
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
                <CardTitle>Manage Products</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Product management coming soon</p>
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
