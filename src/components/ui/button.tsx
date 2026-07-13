import type { ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-5 text-[15px] leading-[22px] font-semibold transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-primary-soft disabled:pointer-events-none disabled:bg-[#b0b8c1] disabled:text-white',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground hover:bg-primary-pressed active:bg-primary-pressed',
        secondary:
          'bg-surface-subtle text-foreground-secondary hover:bg-surface-pressed active:bg-surface-pressed',
        quiet:
          'bg-transparent text-foreground-secondary hover:bg-surface-subtle active:bg-surface-pressed',
        destructive:
          'bg-destructive text-white hover:brightness-95 active:brightness-90 focus-visible:ring-destructive-soft',
      },
      size: {
        default: 'min-h-12 px-5',
        compact: 'min-h-11 px-4 text-[13px] leading-5',
        icon: 'size-11 min-h-11 px-0',
      },
      width: {
        auto: '',
        full: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
      width: 'auto',
    },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>

function Button({ className, variant, size, width, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, width }), className)}
      {...props}
    />
  )
}

export { Button }
