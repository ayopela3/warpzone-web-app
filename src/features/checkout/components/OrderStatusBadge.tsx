import { Badge } from "@/components/ui/badge"
import {
  Clock, CheckCircle2, Package, AlertTriangle, XCircle, ShoppingBag, Loader2,
} from "lucide-react"
import type { OrderStatus } from "@/types"

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; className: string; Icon: React.ElementType }
> = {
  pending_payment: {
    label: "Pending Payment",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    Icon: Clock,
  },
  payment_submitted: {
    label: "Proof Submitted",
    className: "bg-orange-50 text-orange-700 border-orange-200",
    Icon: Loader2,
  },
  confirming_payment: {
    label: "Confirming Payment",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    Icon: Loader2,
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-green-50 text-green-700 border-green-200",
    Icon: CheckCircle2,
  },
  ready_for_pickup: {
    label: "Ready for Pickup",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: ShoppingBag,
  },
  shortlisted: {
    label: "Shortlisted",
    className: "bg-purple-50 text-purple-700 border-purple-200",
    Icon: AlertTriangle,
  },
  out_of_stock: {
    label: "Out of Stock",
    className: "bg-red-50 text-red-700 border-red-200",
    Icon: Package,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-50 text-gray-500 border-gray-200",
    Icon: XCircle,
  },
}

type Props = {
  status: OrderStatus
  size?: "sm" | "md"
}

export function OrderStatusBadge({ status, size = "md" }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending_payment
  const { label, className, Icon } = config
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"
  const textSize = size === "sm" ? "text-xs" : "text-sm"

  return (
    <Badge
      variant="outline"
      className={`${className} ${textSize} flex items-center gap-1 w-fit`}
    >
      <Icon className={`${iconSize} shrink-0`} />
      {label}
    </Badge>
  )
}

export { STATUS_CONFIG }
