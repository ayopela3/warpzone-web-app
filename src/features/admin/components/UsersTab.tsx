"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Users,
  Loader2,
  ShieldOff,
  ShieldCheck,
  Search,
  Store,
} from "lucide-react"
import { toast } from "sonner"
import { adminApi } from "@/lib/api-client"
import type { AdminUser } from "@/types"

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-50 text-purple-700 border-purple-200",
  seller: "bg-blue-50 text-blue-700 border-blue-200",
  "regular-user": "bg-gray-50 text-gray-600 border-gray-200",
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  seller: "Seller",
  "regular-user": "User",
}

export function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionUser, setActionUser] = useState<AdminUser | null>(null)
  const [banReason, setBanReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.listUsers()
      if (data.success) setUsers(data.users)
    } catch {
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      u.email.toLowerCase().includes(q) ||
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.business_name ?? "").toLowerCase().includes(q)
    )
  })

  const openBanDialog = (user: AdminUser) => {
    setBanReason("")
    setActionUser(user)
  }

  const handleBan = async () => {
    if (!actionUser) return
    setSubmitting(true)
    try {
      const result = await adminApi.banUser(
        actionUser.user_id,
        banReason.trim() || undefined,
      )
      if (!result.success) throw new Error(result.error)
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === actionUser.user_id
            ? { ...u, is_banned: 1, ban_reason: banReason.trim() || null }
            : u,
        ),
      )
      toast.success(
        `${actionUser.full_name ?? actionUser.email} has been banned`,
      )
      setActionUser(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to ban user")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnban = async (user: AdminUser) => {
    try {
      const result = await adminApi.unbanUser(user.user_id)
      if (!result.success) throw new Error(result.error)
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === user.user_id
            ? { ...u, is_banned: 0, ban_reason: null }
            : u,
        ),
      )
      toast.success(`${user.full_name ?? user.email} has been unbanned`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unban user")
    }
  }

  const bannedCount = users.filter((u) => u.is_banned === 1).length
  const sellerCount = users.filter((u) => u.role === "seller").length

  return (
    <div className='space-y-5'>
      {/* Header + stats */}
      <div className='flex items-center justify-between flex-wrap gap-3'>
        <div>
          <h2 className='text-xl font-bold text-gray-900'>User Management</h2>
          <p className='text-sm text-gray-500 mt-0.5'>
            {users.length} total · {sellerCount} sellers · {bannedCount} banned
          </p>
        </div>
      </div>

      {/* Search */}
      <div className='relative max-w-sm'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
        <Input
          placeholder='Search by name, email…'
          className='pl-9'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className='py-16 flex justify-center'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      ) : filtered.length === 0 ? (
        <Card className='bg-white shadow-sm'>
          <CardContent className='py-16 text-center'>
            <Users className='h-10 w-10 text-muted-foreground mx-auto mb-3' />
            <p className='text-sm text-muted-foreground'>No users found</p>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-2'>
          {filtered.map((user) => {
            const initials = (user.full_name ?? user.email)
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
            const isBanned = user.is_banned === 1
            const isAdmin = user.role === "admin"

            return (
              <Card
                key={user.user_id}
                className={`bg-white shadow-sm border transition-colors ${isBanned ? "border-red-200 bg-red-50/30" : "border-border"}`}
              >
                <CardContent className='p-4 flex items-center gap-4'>
                  {/* Avatar */}
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                      isBanned
                        ? "bg-red-100 text-red-600 border border-red-200"
                        : "bg-primary/10 text-primary border border-primary/20"
                    }`}
                  >
                    {initials}
                  </div>

                  {/* Info */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <p className='font-semibold text-sm text-foreground truncate'>
                        {user.full_name ?? "—"}
                      </p>
                      <Badge
                        variant='outline'
                        className={`text-xs capitalize ${ROLE_COLORS[user.role ?? "regular-user"]}`}
                      >
                        {user.role === "seller" && (
                          <Store className='h-3 w-3 mr-1' />
                        )}
                        {ROLE_LABELS[user.role ?? "regular-user"]}
                      </Badge>
                      {isBanned && (
                        <Badge
                          variant='outline'
                          className='text-xs bg-red-50 text-red-700 border-red-200'
                        >
                          Banned
                        </Badge>
                      )}
                    </div>
                    <p className='text-xs text-muted-foreground truncate'>
                      {user.email}
                    </p>
                    {user.business_name && (
                      <p className='text-xs text-muted-foreground truncate'>
                        Business: {user.business_name}
                      </p>
                    )}
                    {isBanned && user.ban_reason && (
                      <p className='text-xs text-red-600 mt-0.5'>
                        Reason: {user.ban_reason}
                      </p>
                    )}
                    <p className='text-[11px] text-muted-foreground/60 mt-0.5'>
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Action */}
                  {!isAdmin &&
                    (isBanned ? (
                      <Button
                        size='sm'
                        variant='outline'
                        className='shrink-0 border-green-200 text-green-700 hover:bg-green-50 gap-1.5'
                        onClick={() => handleUnban(user)}
                      >
                        <ShieldCheck className='h-3.5 w-3.5' />
                        Unban
                      </Button>
                    ) : (
                      <Button
                        size='sm'
                        variant='outline'
                        className='shrink-0 border-red-200 text-red-600 hover:bg-red-50 gap-1.5'
                        onClick={() => openBanDialog(user)}
                      >
                        <ShieldOff className='h-3.5 w-3.5' />
                        Ban
                      </Button>
                    ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Ban confirmation dialog */}
      <Dialog
        open={!!actionUser}
        onOpenChange={(open) => {
          if (!open) setActionUser(null)
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-red-600'>
              <ShieldOff className='h-5 w-5' />
              Ban User
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <p className='text-sm text-muted-foreground'>
              Banning{" "}
              <strong>{actionUser?.full_name ?? actionUser?.email}</strong> will
              immediately invalidate all their sessions and prevent them from
              signing in.
            </p>
            <div className='space-y-1.5'>
              <Label htmlFor='ban-reason'>
                Reason <span className='text-muted-foreground'>(optional)</span>
              </Label>
              <Input
                id='ban-reason'
                placeholder='e.g. Violation of terms of service'
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className='gap-2'>
            <Button
              variant='outline'
              onClick={() => setActionUser(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className='bg-red-600 hover:bg-red-700 text-white'
              onClick={handleBan}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                "Confirm Ban"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
