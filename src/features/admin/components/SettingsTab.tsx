"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2 } from "lucide-react"
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

  useEffect(() => {
    setValue(fiatSymbol)
  }, [fiatSymbol])

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

  return (
    <Card className="bg-white shadow-lg max-w-md">
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
              <CheckCircle2 className="h-4 w-4" />
              Saved successfully
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
