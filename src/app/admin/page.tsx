"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/components/shared/app-provider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminStats } from "@/features/admin/components/AdminStats"
import { ApprovalsTab } from "@/features/admin/components/ApprovalsTab"
import { ProductsTab } from "@/features/admin/components/ProductsTab"
import { TournamentsTab } from "@/features/admin/components/TournamentsTab"
import { PreOrdersTab } from "@/features/admin/components/PreOrdersTab"
import { SettingsTab } from "@/features/admin/components/SettingsTab"
import { UsersTab } from "@/features/admin/components/UsersTab"
import { SellersTab } from "@/features/admin/components/SellersTab"
import { ReportsTab } from "@/features/admin/components/ReportsTab"
import { CategoriesTab } from "@/features/admin/components/CategoriesTab"
import { adminApi, productsApi } from "@/lib/api-client"
import type { Product } from "@/types"

export default function AdminDashboard() {
  const router = useRouter()
  const { isAuthenticated, userRole, fiatSymbol, setFiatSymbol } = useApp()

  const [pendingProducts, setPendingProducts] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [approvalsLoading, setApprovalsLoading] = useState(false)
  const [productsLoading, setProductsLoading] = useState(false)
  const [approvalsView, setApprovalsView] = useState<"grid" | "list">("list")
  const [totalUsers, setTotalUsers] = useState(0)
  const [activeAuctions, setActiveAuctions] = useState(0)

  useEffect(() => {
    if (!isAuthenticated || userRole !== "admin") router.push("/")
  }, [isAuthenticated, userRole, router])

  const fetchPending = useCallback(async () => {
    setApprovalsLoading(true)
    try {
      const data = await adminApi.pendingProducts()
      if (data.success) setPendingProducts(data.products)
    } finally {
      setApprovalsLoading(false)
    }
  }, [])

  const fetchAllProducts = useCallback(async () => {
    setProductsLoading(true)
    try {
      const data = await productsApi.list({ showAll: true })
      if (data.success) setAllProducts(data.products)
    } finally {
      setProductsLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    const [usersData, auctionsData] = await Promise.all([
      adminApi.analyticsUsers(),
      adminApi.analyticsAuctions(),
    ])
    if (usersData.success) setTotalUsers(usersData.count)
    if (auctionsData.success) setActiveAuctions(auctionsData.count)
  }, [])

  useEffect(() => {
    fetchPending()
    fetchAllProducts()
    fetchStats()
  }, [fetchPending, fetchAllProducts, fetchStats])

  const handleApprove = async (id: string, status: "approved" | "rejected") => {
    await adminApi.approve(id, status)
    setPendingProducts((prev) => prev.filter((p) => p.id !== id))
    fetchAllProducts()
  }

  const handleToggleFeatured = async (id: string, current: number) => {
    await adminApi.toggleFeatured(id, current === 1 ? 0 : 1)
    fetchAllProducts()
  }

  const handleToggleActive = async (id: string, current: number) => {
    await adminApi.toggleActive(id, current === 1 ? 0 : 1)
    fetchAllProducts()
  }

  const handleDelete = async (id: string) => {
    await productsApi.remove(id)
    setAllProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const handleSaveEdit = async (
    id: string,
    form: {
      sku: string
      name: string
      category: string
      rarity: string
      description: string
      price: string
      quantity: string
    },
  ) => {
    const result = await productsApi.update(id, {
      sku: form.sku,
      name: form.name,
      category: form.category,
      rarity: form.rarity,
      description: form.description,
      price: parseFloat(form.price),
      quantity: parseInt(form.quantity),
      userRole: "admin",
    })
    if (!result.success) throw new Error(result.error ?? "Failed to update")
    fetchAllProducts()
  }

  if (!isAuthenticated || userRole !== "admin") return null

  return (
    <div className='min-h-screen bg-gray-50 p-6'>
      <div className='max-w-7xl mx-auto'>
        <div className='mb-8'>
          <h1 className='text-3xl font-black text-gray-900'>Admin Dashboard</h1>
          <p className='text-gray-500 mt-1'>
            Manage products, auctions, tournaments and settings
          </p>
        </div>

        <AdminStats
          totalUsers={totalUsers}
          totalProducts={allProducts.length}
          activeAuctions={activeAuctions}
          pendingCount={pendingProducts.length}
        />

        <Tabs defaultValue='approvals' className='space-y-6'>
          <TabsList className='grid grid-cols-9 w-full max-w-5xl'>
            <TabsTrigger value='approvals'>Approvals</TabsTrigger>
            <TabsTrigger value='sellers'>Sellers</TabsTrigger>
            <TabsTrigger value='products'>Products</TabsTrigger>
            <TabsTrigger value='pre-orders'>Pre-Orders</TabsTrigger>
            <TabsTrigger value='tournaments'>Tournaments</TabsTrigger>
            <TabsTrigger value='categories'>Categories</TabsTrigger>
            <TabsTrigger value='users'>Users</TabsTrigger>
            <TabsTrigger value='reports'>Reports</TabsTrigger>
            <TabsTrigger value='settings'>Settings</TabsTrigger>
          </TabsList>

          <TabsContent value='approvals'>
            <ApprovalsTab
              products={pendingProducts}
              loading={approvalsLoading}
              view={approvalsView}
              onViewChange={setApprovalsView}
              onApprove={handleApprove}
            />
          </TabsContent>

          <TabsContent value='products'>
            <ProductsTab
              products={allProducts}
              loading={productsLoading}
              fiatSymbol={fiatSymbol}
              onToggleFeatured={handleToggleFeatured}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
              onSaveEdit={handleSaveEdit}
            />
          </TabsContent>

          <TabsContent value='pre-orders'>
            <PreOrdersTab fiatSymbol={fiatSymbol} />
          </TabsContent>

          <TabsContent value='tournaments'>
            <TournamentsTab />
          </TabsContent>

          <TabsContent value='sellers'>
            <SellersTab />
          </TabsContent>

          <TabsContent value='users'>
            <UsersTab />
          </TabsContent>

          <TabsContent value='categories'>
            <CategoriesTab />
          </TabsContent>

          <TabsContent value='reports'>
            <ReportsTab />
          </TabsContent>

          <TabsContent value='settings'>
            <SettingsTab fiatSymbol={fiatSymbol} onSaved={setFiatSymbol} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
