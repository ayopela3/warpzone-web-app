"use client"

export const runtime = "edge"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { User, Lock, MapPin, Phone, Building2, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { useApp } from "@/components/shared/app-provider"

type ProfileForm = {
  full_name: string
  phone_number: string
  street: string
  city: string
  province: string
  country: string
  zip_code: string
  business_name: string
}

type PasswordForm = {
  current_password: string
  new_password: string
  confirm_password: string
}

const ROLE_LABELS: Record<string, string> = {
  "regular-user": "Customer",
  seller: "Seller",
  admin: "Administrator",
}

export default function SettingsPage() {
  const { isAuthenticated, userRole } = useApp()
  const router = useRouter()

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    full_name: "", phone_number: "", street: "", city: "",
    province: "", country: "", zip_code: "", business_name: "",
  })
  const [email, setEmail] = useState("")
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    current_password: "", new_password: "", confirm_password: "",
  })
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { router.push("/auth/signin"); return }

    fetch("/api/user/profile", {
      headers: { Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setEmail(d.profile.email)
          setProfileForm({
            full_name: d.profile.full_name ?? "",
            phone_number: d.profile.phone_number ?? "",
            street: d.profile.street ?? "",
            city: d.profile.city ?? "",
            province: d.profile.province ?? "",
            country: d.profile.country ?? "",
            zip_code: d.profile.zip_code ?? "",
            business_name: d.profile.business_name ?? "",
          })
        }
      })
      .catch(console.error)
      .finally(() => setLoadingProfile(false))
  }, [isAuthenticated, router])

  const handleProfileSave = async () => {
    if (!profileForm.full_name.trim()) {
      toast.error("Full name is required")
      return
    }
    setSavingProfile(true)
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}`,
        },
        body: JSON.stringify(profileForm),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? "Failed to update profile")
      toast.success("Profile updated successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSave = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password) {
      toast.error("All password fields are required")
      return
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("New passwords do not match")
      return
    }
    if (passwordForm.new_password.length < 8) {
      toast.error("New password must be at least 8 characters")
      return
    }
    setSavingPassword(true)
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}`,
        },
        body: JSON.stringify({
          ...profileForm,
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? "Failed to update password")
      toast.success("Password changed successfully")
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password")
    } finally {
      setSavingPassword(false)
    }
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-1">Manage your personal details and security preferences.</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8 space-y-8">

        {/* Account Info (read-only) */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Account Info</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-gray-500">Email address</p>
                <p className="font-medium text-gray-900">{email}</p>
              </div>
            </div>
            <div className="border-t border-gray-100" />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-gray-500">Account role</p>
                <p className="font-medium text-gray-900">{ROLE_LABELS[userRole ?? "regular-user"] ?? userRole}</p>
              </div>
              <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3" />Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Profile Details</CardTitle>
                <CardDescription>Update your name, contact, and address information.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="full_name">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="full_name"
                    className="pl-9"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    placeholder="Your full name"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone_number">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone_number"
                    className="pl-9"
                    value={profileForm.phone_number}
                    onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                    placeholder="+63 9XX XXX XXXX"
                  />
                </div>
              </div>

              {(userRole === "seller" || userRole === "admin") && (
                <div className="space-y-1">
                  <Label htmlFor="business_name">Business Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="business_name"
                      className="pl-9"
                      value={profileForm.business_name}
                      onChange={(e) => setProfileForm({ ...profileForm, business_name: e.target.value })}
                      placeholder="Your shop or business name"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100" />
            <p className="text-sm font-medium text-gray-700">Address</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  value={profileForm.street}
                  onChange={(e) => setProfileForm({ ...profileForm, street: e.target.value })}
                  placeholder="123 Main St, Unit 4"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} placeholder="Manila" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="province">Province / State</Label>
                <Input id="province" value={profileForm.province} onChange={(e) => setProfileForm({ ...profileForm, province: e.target.value })} placeholder="Metro Manila" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={profileForm.country} onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })} placeholder="Philippines" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="zip_code">ZIP / Postal Code</Label>
                <Input id="zip_code" value={profileForm.zip_code} onChange={(e) => setProfileForm({ ...profileForm, zip_code: e.target.value })} placeholder="1000" />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleProfileSave} disabled={savingProfile} className="bg-primary hover:bg-primary/90">
                {savingProfile ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Change Password</CardTitle>
                <CardDescription>Keep your account secure with a strong password.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="current_password">Current Password</Label>
              <Input
                id="current_password"
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                placeholder="Enter your current password"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  placeholder="Min. 8 characters"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  placeholder="Repeat new password"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handlePasswordSave} disabled={savingPassword} variant="outline" className="border-2">
                {savingPassword ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Change Password"}
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
