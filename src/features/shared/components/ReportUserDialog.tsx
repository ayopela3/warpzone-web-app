"use client"

import { useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Flag, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { reportsApi } from "@/lib/api-client"
import type { ReportReason } from "@/types"

const REASON_OPTIONS: {
  value: ReportReason
  label: string
  description: string
}[] = [
  {
    value: "joy_bidding",
    label: "Joy Bidding",
    description: "Placed a bid with no intention of paying",
  },
  {
    value: "non_payment",
    label: "Non-Payment",
    description: "Ordered but did not complete payment on time",
  },
  { value: "other", label: "Other", description: "Other policy violation" },
]

type Props = {
  /** user_id from the users table */
  reportedUserId: string
  reportedName: string
  /** Optional context link */
  referenceType?: "order" | "pre_order" | "auction"
  referenceId?: string
  /** Controlled open state */
  open: boolean
  onClose: () => void
}

export function ReportUserDialog({
  reportedUserId,
  reportedName,
  referenceType,
  referenceId,
  open,
  onClose,
}: Props) {
  const [reason, setReason] = useState<ReportReason>("non_payment")
  const [details, setDetails] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const result = await reportsApi.submit({
        reported_user_id: reportedUserId,
        reason,
        details: details.trim() || undefined,
        reference_type: referenceType,
        reference_id: referenceId,
      })
      if (!result.success) throw new Error(result.error)
      toast.success("Report submitted. An admin will review it shortly.")
      setDetails("")
      setReason("non_payment")
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit report",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-orange-600'>
            <Flag className='h-5 w-5' />
            Report User
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <p className='text-sm text-muted-foreground'>
            Reporting <strong>{reportedName}</strong>. An admin will review and
            take action if necessary. Only you can see this report.
          </p>

          <div className='space-y-1.5'>
            <Label htmlFor='report-reason'>Reason *</Label>
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as ReportReason)}
            >
              <SelectTrigger id='report-reason'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div>
                      <p className='font-medium'>{opt.label}</p>
                      <p className='text-xs text-muted-foreground'>
                        {opt.description}
                      </p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='report-details'>
              Additional details
              <span className='text-muted-foreground ml-1'>(optional)</span>
            </Label>
            <Textarea
              id='report-details'
              rows={3}
              className='resize-none'
              placeholder='Describe what happened…'
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className='gap-2'>
          <Button variant='outline' onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className='bg-orange-500 hover:bg-orange-600 text-white gap-1.5'
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <>
                <Flag className='h-4 w-4' />
                Submit Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
