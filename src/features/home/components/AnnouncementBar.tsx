"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

const MESSAGES = [
  "🎉 Free in-store pickup on all orders — no minimum required",
  "⚡ New singles added every week — check back often!",
  // "🏆 Weekly tournaments every Saturday — register now",
]

export function AnnouncementBar() {
  const [visible, setVisible] = useState(true)
  /** Always start at 0 (SSR-safe), randomise after hydration */
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    setMsgIndex(Math.floor(Math.random() * MESSAGES.length))
  }, [])

  if (!visible) return null

  return (
    <div className="relative bg-black text-white text-center text-sm font-semibold py-2.5 px-10">
      <span>{MESSAGES[msgIndex]}</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
        aria-label="Dismiss announcement"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
