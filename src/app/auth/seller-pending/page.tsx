"use client"

import Link from "next/link"
import { Clock, CheckCircle, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SellerPendingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Clock className="h-10 w-10 text-primary" />
        </div>

        <h1 className="text-2xl font-black text-neutral-900">Application submitted!</h1>
        <p className="mt-3 text-sm text-neutral-500 leading-relaxed">
          Your seller account is under review. Our team will verify your details and approve your application
          within <strong>1&ndash;2 business days</strong>.
        </p>

        {/* Steps */}
        <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 text-left space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-neutral-800">Account created</p>
              <p className="text-xs text-neutral-500">Your credentials have been saved.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-neutral-800">Pending admin review</p>
              <p className="text-xs text-neutral-500">We&apos;ll verify your business details.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-neutral-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-neutral-400">Approval notification</p>
              <p className="text-xs text-neutral-400">You&apos;ll be notified once approved.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/">Browse the store</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/auth/signin">Sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
