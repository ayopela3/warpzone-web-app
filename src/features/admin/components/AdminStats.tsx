"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users, ShoppingBag, Gavel, Clock } from "lucide-react"

type Props = {
  totalUsers: number
  totalProducts: number
  activeAuctions: number
  pendingCount: number
}

export function AdminStats({ totalUsers, totalProducts, activeAuctions, pendingCount }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="bg-gradient-to-br from-primary to-primary/90 text-white shadow-lg">
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

      <Card className="bg-white shadow-lg border-l-4 border-l-blue-500">
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

      <Card className="bg-white shadow-lg border-l-4 border-l-purple-500">
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

      <Card className="bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-white/90">Pending Approvals</p>
              <p className="text-4xl font-black mt-2">{pendingCount}</p>
              <p className="text-xs font-medium text-white/80 mt-1">Awaiting review</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
