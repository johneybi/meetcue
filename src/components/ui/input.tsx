import type { InputHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const inputVariants = cva(
  'flex w-full rounded-control border border-border bg-surface text-[15px] leading-[22px] font-normal text-foreground outline-none transition-colors placeholder:text-[var(--mc-color-text-placeholder)] placeholder:opacity-100 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary-soft disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-foreground-muted',
  {
    variants: {
      controlSize: {
        default: 'min-h-11 px-4',
        field: 'min-h-14 px-[18px]',
      },
    },
    defaultVariants: {
      controlSize: 'default',
    },
  },
)

type InputProps = InputHTMLAttributes<HTMLInputElement> & VariantProps<typeof inputVariants>

function Input({ className, controlSize, type = 'text', ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      data-control-size={controlSize ?? 'default'}
      className={cn(
        'ui-input',
        inputVariants({ controlSize }),
        className,
      )}
      {...props}
    />
  )
}

export { Input }
