import { cn } from '../../lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const avatarVariants = cva(
  'inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-surface-subtle text-foreground-tertiary font-semibold',
  {
    variants: {
      size: {
        default: 'size-[34px] text-[13px]',
        small: 'size-7 text-xs',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
)

type AvatarProps = {
  name: string
  src?: string
  alt?: string
  className?: string
} & VariantProps<typeof avatarVariants>

function Avatar({ name, src, alt, size = 'default', className }: AvatarProps) {
  const fallback = Array.from(name.trim())[0] ?? '?'

  return (
    <span
      className={cn('mc-avatar', avatarVariants({ size }), className)}
      data-size={size}
      aria-label={alt ?? name}
    >
      {src ? <img className="size-full object-cover" src={src} alt="" /> : fallback}
    </span>
  )
}

export { Avatar }
