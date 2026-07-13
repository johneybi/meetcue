import type { LabelHTMLAttributes, ReactNode } from 'react'

import { cn } from '../../lib/utils'
import './field.css'

type FieldProps = Omit<LabelHTMLAttributes<HTMLLabelElement>, 'children'> & {
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
}

function Field({ className, label, hint, children, ...props }: FieldProps) {
  return (
    <label className={cn('field', className)} data-slot="field" {...props}>
      <span>{label}</span>
      {children}
      {hint != null ? <em>{hint}</em> : null}
    </label>
  )
}

export { Field }
