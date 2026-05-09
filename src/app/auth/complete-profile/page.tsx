"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useApp } from "@/components/shared/app-provider"

const sessionIdKey = "warpzone-session-id"

export default function CompleteProfilePage() {
  const router = useRouter()
  const { isAuthenticated } = useApp()

  const [fullName, setFullName]       = useState("")
  const [phone, setPhone]             = useState("")
  const [street, setStreet]           = useState("")
  const [city, setCity]               = useState("")
  const [province, setProvince]       = useState("")
  const [country, setCountry]         = useState("Philippines")
  const [zipCode, setZipCode]         = useState("")
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState("")

  /** Redirect unauthenticated visitors away */
  useEffect(() => {
    if (!isAuthenticated) router.replace("/auth/signin")
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!fullName.trim()) {
      setError("Full name is required.")
      return
    }

    setLoading(true)

    try {
      const sessionId = window.localStorage.getItem(sessionIdKey)
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone_number: phone.trim() || null,
          street: street.trim(),
          city: city.trim(),
          province: province.trim(),
          country: country.trim(),
          zip_code: zipCode.trim(),
        }),
      })

      const data = await res.json()

      if (data.success) {
        router.replace("/")
      } else {
        setError(data.error || "Failed to save profile. Please try again.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg border-neutral-200 bg-white shadow-sm">
        <CardHeader className="space-y-1 pb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Almost there</p>
          <CardTitle className="text-2xl font-black">Complete your profile</CardTitle>
          <p className="text-sm text-neutral-500">
            Tell us a bit about yourself so we can personalise your experience.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            {/* Full name */}
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-sm font-bold">
                Full name <span className="text-red-500">*</span>
              </label>
              <Input
                id="fullName"
                placeholder="Juan dela Cruz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-sm font-bold">
                Phone number
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="+63 9XX XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <hr className="border-neutral-100" />
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Shipping address</p>

            {/* Street */}
            <div className="space-y-1.5">
              <label htmlFor="street" className="text-sm font-bold">Street address</label>
              <Input
                id="street"
                placeholder="123 Rizal St, Barangay Uno"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
            </div>

            {/* City + Province */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="city" className="text-sm font-bold">City / Municipality</label>
                <Input
                  id="city"
                  placeholder="Quezon City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="province" className="text-sm font-bold">Province</label>
                <Input
                  id="province"
                  placeholder="Metro Manila"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                />
              </div>
            </div>

            {/* Country + ZIP */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="country" className="text-sm font-bold">Country</label>
                <Input
                  id="country"
                  placeholder="Philippines"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="zipCode" className="text-sm font-bold">ZIP code</label>
                <Input
                  id="zipCode"
                  placeholder="1100"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Saving..." : "Save and continue →"}
            </Button>

            <button
              type="button"
              onClick={() => router.replace("/")}
              className="w-full text-center text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              Skip for now
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
