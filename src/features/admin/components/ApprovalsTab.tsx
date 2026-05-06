"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, X, Package, Loader2, LayoutGrid, List } from "lucide-react"
import type { Product } from "@/types"

type Props = {
  products: Product[]
  loading: boolean
  view: "grid" | "list"
  onViewChange: (v: "grid" | "list") => void
  onApprove: (id: string, status: "approved" | "rejected") => void
}

function ProductImage({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return <img src={url} alt={name} className="w-full h-48 object-cover" />
  }
  return (
    <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
      <Package className="h-16 w-16 text-gray-400" />
    </div>
  )
}

function ApprovalActions({ id, onApprove }: { id: string; onApprove: Props["onApprove"] }) {
  return (
    <div className="flex gap-2">
      <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => onApprove(id, "approved")}>
        <Check className="mr-1 h-3 w-3" />Approve
      </Button>
      <Button size="sm" variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50" onClick={() => onApprove(id, "rejected")}>
        <X className="mr-1 h-3 w-3" />Reject
      </Button>
    </div>
  )
}

export function ApprovalsTab({ products, loading, view, onViewChange, onApprove }: Props) {
  return (
    <Card className="bg-white shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Pending Product Approvals</CardTitle>
          <div className="flex gap-2">
            <Button variant={view === "grid" ? "default" : "outline"} size="sm" onClick={() => onViewChange("grid")}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => onViewChange("list")}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-8 w-8 text-gray-400 mx-auto animate-spin" />
            <p className="mt-4 text-sm text-gray-600">Loading pending approvals...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-gray-900">No pending approvals</h3>
            <p className="mt-2 text-sm text-gray-600">All product submissions have been reviewed</p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="bg-white shadow-md border border-gray-200">
                <CardContent className="p-0">
                  <ProductImage url={product.image_url ?? null} name={product.name} />
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{product.name}</h3>
                    <div className="space-y-1 text-sm mb-4">
                      <div className="flex justify-between"><span className="text-gray-500">SKU</span><span className="font-mono">{product.sku}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Category</span><span>{product.category}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Seller</span><span className="truncate ml-2">{product.seller_name ?? "Unknown"}</span></div>
                    </div>
                    <ApprovalActions id={product.id} onApprove={onApprove} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <Card key={product.id} className="bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {product.image_url && (
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                        <p className="text-sm text-gray-600">SKU: {product.sku} · {product.category}</p>
                        <p className="text-xs text-gray-500 mt-1">Seller: {product.seller_name ?? "Unknown"}</p>
                        <p className="text-xs text-gray-500">Created: {new Date(product.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <ApprovalActions id={product.id} onApprove={onApprove} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
