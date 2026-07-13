import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const selectableCardVariants = cva(
  'min-w-0 rounded-card border border-border bg-surface text-left text-foreground outline-none transition-colors hover:border-border-strong hover:bg-surface-subtle focus-visible:ring-3 focus-visible:ring-primary-soft',
  {
    variants: {
      variant: {
        default: '',
        person: '',
      },
      selected: {
        true: 'border-primary bg-primary-soft shadow-[inset_0_0_0_1px_var(--mc-color-accent)]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      selected: false,
    },
  },
)

type SelectableCardProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof selectableCardVariants> & {
    isSelected?: boolean
  }

const SelectableCard = forwardRef<HTMLButtonElement, SelectableCardProps>(
  ({ className, isSelected, selected, variant, type = 'button', ...props }, ref) => {
    const resolvedSelected = isSelected ?? selected ?? false

    return (
      <button
        ref={ref}
        type={type}
        data-selected={resolvedSelected}
        data-variant={variant ?? 'default'}
        className={cn(
          'ui-selectable-card',
          selectableCardVariants({ variant, selected: resolvedSelected }),
          className,
        )}
        {...props}
      />
    )
  },
)

SelectableCard.displayName = 'SelectableCard'

export { SelectableCard }
