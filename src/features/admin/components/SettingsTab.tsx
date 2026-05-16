"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2, Info, QrCode, Upload, Trash2 } from "lucide-react"
import { settingsApi } from "@/lib/api-client"

type Props = {
  fiatSymbol: string
  onSaved: (symbol: string) => void
}

export function SettingsTab({ fiatSymbol, onSaved }: Props) {
  const [value, setValue] = useState(fiatSymbol)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  // Platform payment QR state
  const [platformQrUrl, setPlatformQrUrl]   = useState<string | null>(null)
  const [qrUploading, setQrUploading]       = useState(false)
  const [qrSaving, setQrSaving]             = useState(false)
  const [qrSaved, setQrSaved]               = useState(false)
  const [qrError, setQrError]               = useState("")

  // Fee rate state — stored as percentage strings for UX (e.g. "10" = 10%)
  const [auctionFeeInput, setAuctionFeeInput]     = useState("")
  const [preOrderFeeInput, setPreOrderFeeInput]   = useState("")
  const [feeLoading, setFeeLoading]               = useState(true)
  const [feeSaving, setFeeSaving]                 = useState(false)
  const [feeError, setFeeError]                   = useState("")
  const [feeSaved, setFeeSaved]                   = useState(false)

  useEffect(() => { setValue(fiatSymbol) }, [fiatSymbol])

  useEffect(() => {
    fetch("/api/settings/payment-qr")
      .then((r) => r.json())
      .then((d: { success: boolean; payment_qr_url?: string | null }) => {
        if (d.success) setPlatformQrUrl(d.payment_qr_url ?? null)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/settings/fees")
      .then((r) => r.json())
      .then((d: { success: boolean; auctionFeeRate?: number; preOrderFeeRate?: number }) => {
        if (d.success) {
          setAuctionFeeInput(String(((d.auctionFeeRate ?? 0.10) * 100).toFixed(2)))
          setPreOrderFeeInput(String(((d.preOrderFeeRate ?? 0.05) * 100).toFixed(2)))
        }
      })
      .catch(() => { setAuctionFeeInput("10"); setPreOrderFeeInput("5") })
      .finally(() => setFeeLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError("")
    setSaved(false)
    try {
      const data = await settingsApi.setFiat(value)
      if (!data.success) throw new Error("Failed to save")
      onSaved(data.fiatSymbol)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save fiat symbol")
    } finally {
      setSaving(false)
    }
  }

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setQrUploading(true)
    setQrError("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json() as { success: boolean; url?: string; error?: string }
      if (!data.success || !data.url) throw new Error(data.error ?? "Upload failed")
      setPlatformQrUrl(data.url)
    } catch (err) {
      setQrError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setQrUploading(false)
      e.target.value = ""
    }
  }

  const handleQrSave = async () => {
    setQrSaving(true)
    setQrError("")
    setQrSaved(false)
    try {
      const res = await fetch("/api/settings/payment-qr", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}`,
        },
        body: JSON.stringify({ payment_qr_url: platformQrUrl ?? "" }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) throw new Error(data.error ?? "Failed to save")
      setQrSaved(true)
      setTimeout(() => setQrSaved(false), 3000)
    } catch (err) {
      setQrError(err instanceof Error ? err.message : "Failed to save QR")
    } finally {
      setQrSaving(false)
    }
  }

  const handleQrRemove = async () => {
    setPlatformQrUrl(null)
    setQrSaving(true)
    try {
      await fetch("/api/settings/payment-qr", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}`,
        },
        body: JSON.stringify({ payment_qr_url: "" }),
      })
    } finally {
      setQrSaving(false)
    }
  }

  const handleSaveFees = async () => {
    const auctionRate   = parseFloat(auctionFeeInput)
    const preOrderRate  = parseFloat(preOrderFeeInput)

    if (isNaN(auctionRate) || auctionRate < 0 || auctionRate > 100) {
      setFeeError("Auction fee must be between 0 and 100")
      return
    }
    if (isNaN(preOrderRate) || preOrderRate < 0 || preOrderRate > 100) {
      setFeeError("Pre-order fee must be between 0 and 100")
      return
    }

    setFeeSaving(true)
    setFeeError("")
    setFeeSaved(false)
    try {
      const res = await fetch("/api/settings/fees", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}`,
        },
        body: JSON.stringify({
          auctionFeeRate:   auctionRate / 100,
          preOrderFeeRate:  preOrderRate / 100,
        }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) throw new Error(data.error ?? "Failed to save")
      setFeeSaved(true)
      setTimeout(() => setFeeSaved(false), 3000)
    } catch (err) {
      setFeeError(err instanceof Error ? err.message : "Failed to save fee rates")
    } finally {
      setFeeSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      {/* Currency Symbol */}
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle>App Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fiatSymbol">Currency Symbol</Label>
            <p className="text-sm text-gray-500">This symbol will prefix all prices across the app.</p>
            <div className="flex gap-3">
              <Input
                id="fiatSymbol"
                value={value}
                maxLength={5}
                onChange={(e) => setValue(e.target.value)}
                className="max-w-[120px] text-lg font-bold"
              />
              <Button onClick={handleSave} disabled={saving || !value.trim()}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {saved && (
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle2 className="h-4 w-4" />Saved successfully
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Service Fee Rates */}
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle>Platform Service Fees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
            <p>Fee rates apply to <strong>future</strong> transactions only. Existing recorded fees are not retroactively recalculated.</p>
          </div>

          {feeLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />Loading current rates…
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auctionFee">Auction Service Fee (%)</Label>
                <p className="text-sm text-gray-500">Charged on the final winning bid when an auction is settled.</p>
                <div className="flex items-center gap-2">
                  <Input
                    id="auctionFee"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={auctionFeeInput}
                    onChange={(e) => setAuctionFeeInput(e.target.value)}
                    className="max-w-[100px]"
                  />
                  <span className="text-gray-500 text-sm font-semibold">%</span>
                  {auctionFeeInput && !isNaN(parseFloat(auctionFeeInput)) && (
                    <span className="text-xs text-gray-400">
                      e.g. {fiatSymbol}3,600 bid → {fiatSymbol}{(3600 * parseFloat(auctionFeeInput) / 100).toFixed(2)} fee → seller gets {fiatSymbol}{(3600 - 3600 * parseFloat(auctionFeeInput) / 100).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preOrderFee">Pre-order Service Fee (%)</Label>
                <p className="text-sm text-gray-500">Charged per paid reservation slot on seller pre-orders.</p>
                <div className="flex items-center gap-2">
                  <Input
                    id="preOrderFee"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={preOrderFeeInput}
                    onChange={(e) => setPreOrderFeeInput(e.target.value)}
                    className="max-w-[100px]"
                  />
                  <span className="text-gray-500 text-sm font-semibold">%</span>
                  {preOrderFeeInput && !isNaN(parseFloat(preOrderFeeInput)) && (
                    <span className="text-xs text-gray-400">
                      e.g. {fiatSymbol}3,600 sale → {fiatSymbol}{(3600 * parseFloat(preOrderFeeInput) / 100).toFixed(2)} fee → seller gets {fiatSymbol}{(3600 - 3600 * parseFloat(preOrderFeeInput) / 100).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <Button onClick={handleSaveFees} disabled={feeSaving}>
                  {feeSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Fee Rates
                </Button>
              </div>

              {feeError && <p className="text-sm text-red-600">{feeError}</p>}
              {feeSaved && (
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle2 className="h-4 w-4" />Fee rates saved successfully
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Platform Payment QR */}
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            <CardTitle>Platform Payment QR</CardTitle>
          </div>
          <p className="text-sm text-gray-500 mt-1">This QR is shown to buyers at checkout. All payments go to the platform — you then cash out to sellers manually.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {platformQrUrl ? (
            <div className="flex flex-col items-center gap-4">
              <div className="border-4 border-primary/20 rounded-2xl p-3 bg-white shadow">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={platformQrUrl} alt="Platform Payment QR" className="h-52 w-52 object-contain rounded-lg" />
              </div>
              <div className="flex gap-2">
                <Label
                  htmlFor="admin-qr-replace"
                  className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-md border-2 border-dashed border-gray-300 hover:border-primary text-sm text-gray-600 hover:text-primary transition"
                >
                  {qrUploading
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</>
                    : <><Upload className="h-4 w-4" />Replace QR</>}
                </Label>
                <input id="admin-qr-replace" type="file" accept="image/*" className="hidden" onChange={handleQrUpload} disabled={qrUploading} />
                <Button variant="outline" size="sm" onClick={handleQrRemove} disabled={qrSaving} className="text-red-600 border-red-200 hover:bg-red-50">
                  <Trash2 className="h-4 w-4 mr-1" />Remove
                </Button>
              </div>
              <Button onClick={handleQrSave} disabled={qrSaving || qrUploading} className="bg-primary hover:bg-primary/90 w-full max-w-xs">
                {qrSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save QR Code"}
              </Button>
            </div>
          ) : (
            <Label
              htmlFor="admin-qr-upload"
              className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary cursor-pointer transition text-center"
            >
              {qrUploading
                ? <Loader2 className="h-8 w-8 text-primary animate-spin" />
                : <QrCode className="h-8 w-8 text-gray-400" />}
              <div>
                <p className="font-medium text-gray-700">{qrUploading ? "Uploading…" : "Upload platform payment QR"}</p>
                <p className="text-sm text-gray-400 mt-1">PNG, JPG up to 10MB · GCash, Maya, bank transfer, etc.</p>
              </div>
              <input id="admin-qr-upload" type="file" accept="image/*" className="hidden" onChange={handleQrUpload} disabled={qrUploading} />
            </Label>
          )}
          {qrError && <p className="text-sm text-red-600">{qrError}</p>}
          {qrSaved && (
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle2 className="h-4 w-4" />QR saved — buyers will see this at checkout
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
