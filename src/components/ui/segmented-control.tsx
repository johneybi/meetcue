import { Check } from 'lucide-react'
import { useRef } from 'react'
import './segmented-control.css'

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  const group = useRef<HTMLDivElement>(null)
  return (
    <div ref={group} className="ui-segmented" role="radiogroup" aria-label={label}>
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => {
            let next: number
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
              next = (index + 1) % options.length
            else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
              next = (index + options.length - 1) % options.length
            else if (event.key === 'Home') next = 0
            else if (event.key === 'End') next = options.length - 1
            else return
            event.preventDefault()
            onChange(options[next].value)
            group.current?.querySelectorAll<HTMLButtonElement>('button')[next].focus()
          }}
        >
          <Check size={15} aria-hidden="true" className="ui-segmented__check" />
          {option.label}
        </button>
      ))}
    </div>
  )
}
