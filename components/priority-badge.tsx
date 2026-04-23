import { cn } from '@/lib/utils'

const priorityConfig = {
  critical: { label: 'Critical', classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
  high: { label: 'High', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  normal: { label: 'Normal', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
}

const statusConfig = {
  pending: { label: 'Pending', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  approved: { label: 'Approved', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  in_transit: { label: 'In Transit', classes: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  delivered: { label: 'Delivered', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelled: { label: 'Cancelled', classes: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20' },
}

export function PriorityBadge({ priority }: { priority: string }) {
  const config = priorityConfig[priority as keyof typeof priorityConfig] ?? priorityConfig.normal
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', config.classes)}>
      {config.label}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.pending
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', config.classes)}>
      {config.label}
    </span>
  )
}
