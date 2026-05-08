"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Flag,
  Loader2,
  ShieldOff,
  X,
  AlertTriangle,
  CheckCheck,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { adminApi } from "@/lib/api-client"
import type { UserReport, ReportStatus } from "@/types"

const REASON_LABELS: Record<string, string> = {
  joy_bidding: "Joy Bidding",
  non_payment: "Non-Payment",
  other: "Other",
}

const REASON_COLORS: Record<string, string> = {
  joy_bidding: "bg-orange-50 text-orange-700 border-orange-200",
  non_payment: "bg-red-50 text-red-700 border-red-200",
  other: "bg-gray-50 text-gray-600 border-gray-200",
}

const STATUS_ICON: Record<ReportStatus, React.ReactNode> = {
  pending: <Clock className='h-3.5 w-3.5' />,
  dismissed: <CheckCheck className='h-3.5 w-3.5' />,
  banned: <ShieldOff className='h-3.5 w-3.5' />,
}

type ResolveAction = { report: UserReport; action: "dismiss" | "ban" }

export function ReportsTab() {
  const [reports, setReports] = useState<UserReport[]>([])
  const [loading, setLoading] = useState(true)
  const [statusTab, setStatusTab] = useState<ReportStatus>("pending")
  const [resolving, setResolving] = useState<ResolveAction | null>(null)
  const [adminNote, setAdminNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchReports = useCallback(async (s: ReportStatus) => {
    setLoading(true)
    try {
      const data = await adminApi.listReports(s)
      if (data.success) setReports(data.reports)
    } catch {
      toast.error("Failed to load reports")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReports(statusTab)
  }, [fetchReports, statusTab])

  const openResolve = (report: UserReport, action: "dismiss" | "ban") => {
    setAdminNote("")
    setResolving({ report, action })
  }

  const handleResolve = async () => {
    if (!resolving) return
    setSubmitting(true)
    try {
      const result = await adminApi.resolveReport(
        resolving.report.id,
        resolving.action,
        adminNote.trim() || undefined,
        resolving.action === "ban"
          ? adminNote.trim() || "Reported by seller"
          : undefined,
      )
      if (!result.success) throw new Error(result.error)
      setReports((prev) => prev.filter((r) => r.id !== resolving.report.id))
      toast.success(
        resolving.action === "ban" ? "User banned" : "Report dismissed",
      )
      setResolving(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to resolve report",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='space-y-5'>
      <div>
        <h2 className='text-xl font-bold text-gray-900'>User Reports</h2>
        <p className='text-sm text-gray-500 mt-0.5'>
          Seller-submitted flags for joy bidding and non-payment
        </p>
      </div>

      {/* Status filter tabs */}
      <Tabs
        value={statusTab}
        onValueChange={(v) => setStatusTab(v as ReportStatus)}
      >
        <TabsList className='w-full max-w-sm grid grid-cols-3'>
          <TabsTrigger value='pending'>Pending</TabsTrigger>
          <TabsTrigger value='dismissed'>Dismissed</TabsTrigger>
          <TabsTrigger value='banned'>Banned</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className='py-16 flex justify-center'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      ) : reports.length === 0 ? (
        <Card className='bg-white shadow-sm'>
          <CardContent className='py-16 text-center'>
            <Flag className='h-10 w-10 text-muted-foreground mx-auto mb-3' />
            <p className='text-sm text-muted-foreground'>
              No {statusTab} reports
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-3'>
          {reports.map((report) => {
            const isBanned = report.reported_is_banned === 1
            return (
              <Card
                key={report.id}
                className='bg-white shadow-sm border-border'
              >
                <CardContent className='p-5 space-y-3'>
                  {/* Header row */}
                  <div className='flex items-start justify-between gap-3 flex-wrap'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <Badge
                        variant='outline'
                        className={`text-xs ${REASON_COLORS[report.reason]}`}
                      >
                        <AlertTriangle className='h-3 w-3 mr-1' />
                        {REASON_LABELS[report.reason] ?? report.reason}
                      </Badge>
                      <Badge variant='outline' className='text-xs gap-1'>
                        {STATUS_ICON[report.status]}
                        {report.status}
                      </Badge>
                      {isBanned && (
                        <Badge
                          variant='outline'
                          className='text-xs bg-red-50 text-red-700 border-red-200'
                        >
                          User already banned
                        </Badge>
                      )}
                    </div>
                    <span className='text-xs text-muted-foreground shrink-0'>
                      {new Date(report.created_at).toLocaleString()}
                    </span>
                  </div>

                  {/* Reporter → Reported */}
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='bg-muted/40 rounded-xl p-3'>
                      <p className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1'>
                        Reported by (Seller)
                      </p>
                      <p className='text-sm font-semibold text-foreground'>
                        {report.reporter_name ?? "—"}
                      </p>
                      <p className='text-xs text-muted-foreground truncate'>
                        {report.reporter_email ?? "—"}
                      </p>
                    </div>
                    <div className='bg-red-50 border border-red-100 rounded-xl p-3'>
                      <p className='text-[10px] font-semibold text-red-400 uppercase tracking-wide mb-1'>
                        Reported User (Buyer)
                      </p>
                      <p className='text-sm font-semibold text-foreground'>
                        {report.reported_name ?? "—"}
                      </p>
                      <p className='text-xs text-muted-foreground truncate'>
                        {report.reported_email ?? "—"}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  {report.details && (
                    <div className='bg-amber-50 border border-amber-100 rounded-xl px-4 py-3'>
                      <p className='text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1'>
                        Seller&apos;s Note
                      </p>
                      <p className='text-sm text-foreground'>
                        {report.details}
                      </p>
                    </div>
                  )}

                  {/* Reference */}
                  {report.reference_id && (
                    <p className='text-xs text-muted-foreground'>
                      Ref:{" "}
                      <span className='font-medium text-foreground capitalize'>
                        {report.reference_type}
                      </span>
                      {" · "}
                      <code className='text-xs'>{report.reference_id}</code>
                    </p>
                  )}

                  {/* Admin note (resolved) */}
                  {report.admin_note && (
                    <p className='text-xs text-muted-foreground italic'>
                      Admin note: {report.admin_note}
                    </p>
                  )}

                  {/* Actions — only for pending */}
                  {report.status === "pending" && (
                    <div className='flex gap-2 pt-1'>
                      <Button
                        size='sm'
                        variant='outline'
                        className='gap-1.5 border-gray-200 text-gray-600 hover:bg-gray-50'
                        onClick={() => openResolve(report, "dismiss")}
                      >
                        <X className='h-3.5 w-3.5' />
                        Dismiss
                      </Button>
                      <Button
                        size='sm'
                        className='gap-1.5 bg-red-600 hover:bg-red-700 text-white'
                        disabled={isBanned}
                        onClick={() => openResolve(report, "ban")}
                      >
                        <ShieldOff className='h-3.5 w-3.5' />
                        {isBanned ? "Already Banned" : "Ban User"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Resolve dialog */}
      <Dialog
        open={!!resolving}
        onOpenChange={(open) => {
          if (!open) setResolving(null)
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle
              className={`flex items-center gap-2 ${resolving?.action === "ban" ? "text-red-600" : "text-gray-700"}`}
            >
              {resolving?.action === "ban" ? (
                <>
                  <ShieldOff className='h-5 w-5' /> Ban User
                </>
              ) : (
                <>
                  <X className='h-5 w-5' /> Dismiss Report
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <p className='text-sm text-muted-foreground'>
              {resolving?.action === "ban" ? (
                <>
                  This will <strong>immediately ban</strong>{" "}
                  <strong>
                    {resolving?.report.reported_name ??
                      resolving?.report.reported_email}
                  </strong>{" "}
                  and log them out of all sessions.
                </>
              ) : (
                <>
                  Dismissing will mark this report as resolved with no action
                  taken against{" "}
                  <strong>
                    {resolving?.report.reported_name ??
                      resolving?.report.reported_email}
                  </strong>
                  .
                </>
              )}
            </p>
            <div className='space-y-1.5'>
              <Label htmlFor='admin-note'>
                {resolving?.action === "ban" ? "Ban reason" : "Admin note"}
                <span className='text-muted-foreground ml-1'>(optional)</span>
              </Label>
              <Textarea
                id='admin-note'
                rows={3}
                className='resize-none'
                placeholder={
                  resolving?.action === "ban"
                    ? "e.g. Confirmed joy bidder — 3 incidents"
                    : "e.g. Insufficient evidence"
                }
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className='gap-2'>
            <Button
              variant='outline'
              onClick={() => setResolving(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className={
                resolving?.action === "ban"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : ""
              }
              onClick={handleResolve}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : resolving?.action === "ban" ? (
                "Confirm Ban"
              ) : (
                "Dismiss"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
