import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'ui-textarea',
        'flex min-h-24 w-full resize-y rounded-control border border-border bg-surface px-4 py-3 text-[15px] leading-[22px] font-normal text-foreground outline-none transition-colors placeholder:text-[var(--mc-color-text-placeholder)] placeholder:opacity-100 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary-soft disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-foreground-muted',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
