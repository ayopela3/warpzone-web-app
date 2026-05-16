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
  Plus,
  Minus,
  Star,
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
  const [pointsUser, setPointsUser] = useState<AdminUser | null>(null)
  const [pointsAmount, setPointsAmount] = useState("")
  const [pointsNote, setPointsNote] = useState("")
  const [pointsSubmitting, setPointsSubmitting] = useState(false)
  const [userPoints, setUserPoints] = useState<Record<string, number>>({})

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.listUsers()
      if (data.success) {
        setUsers(data.users)
        // Fetch points for all users
        await Promise.all(
          data.users.map((user) => fetchUserPoints(user.user_id))
        )
      }
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

  const fetchUserPoints = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/points`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}` },
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUserPoints((prev) => ({ ...prev, [userId]: data.balance }))
        }
      }
    } catch (error) {
      console.error("Failed to fetch user points:", error)
    }
  }

  const openPointsDialog = (user: AdminUser) => {
    setPointsAmount("")
    setPointsNote("")
    setPointsUser(user)
    // Fetch current points if not already cached
    if (!userPoints[user.user_id]) {
      fetchUserPoints(user.user_id)
    }
  }

  const handlePointsAdjust = async () => {
    if (!pointsUser || !pointsAmount) return
    
    const points = parseInt(pointsAmount, 10)
    if (isNaN(points) || points === 0) {
      toast.error("Please enter a valid point amount")
      return
    }

    setPointsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/users/${pointsUser.user_id}/points`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}`,
        },
        body: JSON.stringify({
          points,
          note: pointsNote.trim() || undefined,
        }),
      })
      
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      
      setUserPoints((prev) => ({ ...prev, [pointsUser.user_id]: data.newBalance }))
      toast.success(`Points ${points > 0 ? "awarded" : "deducted"} successfully`)
      setPointsUser(null)
      setPointsAmount("")
      setPointsNote("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to adjust points")
    } finally {
      setPointsSubmitting(false)
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
                    
                    {/* Points display */}
                    <div className='flex items-center gap-1.5 mt-2 pt-2 border-t border-border/50'>
                      <Star className='h-3.5 w-3.5 text-amber-500 fill-amber-500' />
                      <span className='text-sm font-medium text-amber-700'>
                        {userPoints[user.user_id] ?? 0} pts
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className='flex flex-col gap-2'>
                    {!isAdmin && (
                      <Button
                        size='sm'
                        variant='outline'
                        className='shrink-0 border-amber-200 text-amber-700 hover:bg-amber-50 gap-1.5'
                        onClick={() => openPointsDialog(user)}
                      >
                        <Star className='h-3.5 w-3.5' />
                        Adjust Points
                      </Button>
                    )}
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
                  </div>
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

      {/* Points adjustment dialog */}
      <Dialog
        open={!!pointsUser}
        onOpenChange={(open) => {
          if (!open) setPointsUser(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Star className="h-5 w-5" />
              Adjust Points
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm font-medium text-amber-800">
                {pointsUser?.full_name ?? pointsUser?.email}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Current balance: <span className="font-bold">{userPoints[pointsUser?.user_id ?? ""] ?? 0} pts</span>
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="points-amount">
                Points Adjustment <span className="text-muted-foreground">(positive = award, negative = deduct)</span>
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPointsAmount("-100")}
                  className="shrink-0"
                >
                  <Minus className="h-3 w-3" />
                  100
                </Button>
                <Input
                  id="points-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  className="text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPointsAmount("100")}
                  className="shrink-0"
                >
                  <Plus className="h-3 w-3" />
                  100
                </Button>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="points-note">
                Note <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="points-note"
                placeholder="e.g. Bonus for tournament participation"
                value={pointsNote}
                onChange={(e) => setPointsNote(e.target.value)}
              />
            </div>
            
            {pointsAmount && !isNaN(parseInt(pointsAmount, 10)) && parseInt(pointsAmount, 10) !== 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  New balance will be: 
                  <span className="font-bold text-gray-900 ml-1">
                    {(userPoints[pointsUser?.user_id ?? ""] ?? 0) + parseInt(pointsAmount, 10)} pts
                  </span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPointsUser(null)}
              disabled={pointsSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handlePointsAdjust}
              disabled={pointsSubmitting || !pointsAmount || isNaN(parseInt(pointsAmount, 10)) || parseInt(pointsAmount, 10) === 0}
            >
              {pointsSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</>
              ) : (
                <>Confirm Adjustment</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
