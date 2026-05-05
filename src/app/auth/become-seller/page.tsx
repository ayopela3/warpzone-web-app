"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useApp } from "@/components/shared/app-provider"

export default function BecomeSellerPage() {
  const router = useRouter()
  const { signIn } = useApp()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    street: "",
    city: "",
    province: "",
    country: "",
    zipCode: "",
    phoneNumber: "",
    businessName: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/become-seller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          street: formData.street,
          city: formData.city,
          province: formData.province,
          country: formData.country,
          zipCode: formData.zipCode,
          phoneNumber: formData.phoneNumber,
          businessName: formData.businessName,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const signInResult = await signIn(formData.email, formData.password)
        if (signInResult.success) {
          router.push("/seller")
        } else {
          setError("Account created but sign in failed. Please try signing in.")
        }
      } else {
        setError(data.error || "Sign up failed")
      }
    } catch {
      setError("Network error")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <Card className="w-full max-w-2xl border-neutral-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-black">Become a Seller</CardTitle>
            <p className="text-sm text-neutral-600">Create your seller account to start listing products</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-sm font-bold">
                    Full Name *
                  </label>
                  <Input
                    id="fullName"
                    name="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="businessName" className="text-sm font-bold">
                    Business Name *
                  </label>
                  <Input
                    id="businessName"
                    name="businessName"
                    placeholder="Your Shop Name"
                    value={formData.businessName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-bold">
                  Email *
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="phoneNumber" className="text-sm font-bold">
                  Phone Number
                </label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder="+639123456789"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold">Address *</label>
                <div className="grid gap-2">
                  <Input
                    name="street"
                    placeholder="Street Address"
                    value={formData.street}
                    onChange={handleChange}
                    required
                  />
                  <div className="grid gap-2 md:grid-cols-2">
                    <Input
                      name="city"
                      placeholder="City"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />
                    <Input
                      name="province"
                      placeholder="Province/State"
                      value={formData.province}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Input
                      name="country"
                      placeholder="Country"
                      value={formData.country}
                      onChange={handleChange}
                      required
                    />
                    <Input
                      name="zipCode"
                      placeholder="ZIP Code"
                      value={formData.zipCode}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-bold">
                    Password *
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-bold">
                    Confirm Password *
                  </label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create Seller Account"}
              </Button>

              <p className="text-center text-sm text-neutral-600">
                Already have an account?{" "}
                <Link href="/auth/signin" className="font-bold text-black underline">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
