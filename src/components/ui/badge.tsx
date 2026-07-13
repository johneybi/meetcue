import type { HTMLAttributes } from 'react'

import { cn } from '../../lib/utils'

type BadgeTone = 'success' | 'warning' | 'danger' | 'info'
type BadgeSize = 'default' | 'compact'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone: BadgeTone
  size?: BadgeSize
}

function Badge({ className, tone, size = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn('mc-badge', className)}
      data-tone={tone}
      data-size={size}
      {...props}
    />
  )
}

export { Badge }
export type { BadgeSize, BadgeTone }
