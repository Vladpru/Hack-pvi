import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  trend?: string
  trendPositive?: boolean
  className?: string
}

export function StatCard({ label, value, icon: Icon, iconColor = 'text-primary', trend, trendPositive, className }: StatCardProps) {
  return (
    <div className={cn('bg-card border border-border rounded-xl p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{value}</p>
          {trend && (
            <p className={cn('text-xs mt-1.5 font-medium', trendPositive ? 'text-emerald-400' : 'text-destructive')}>
              {trend}
            </p>
          )}
        </div>
        <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg bg-secondary shrink-0', iconColor.replace('text-', 'text-').replace('text-', ''))}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>
    </div>
  )
}
