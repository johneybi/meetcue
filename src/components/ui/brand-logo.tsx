import { cn } from '../../lib/utils'
import './brand-logo.css'

type BrandLogoVariant = 'emblem' | 'wordmark' | 'lockup'
type BrandLogoSize = 'small' | 'medium' | 'large'

type BrandLogoProps = {
  variant?: BrandLogoVariant
  size?: BrandLogoSize
  label?: string
  className?: string
}

function BrandLogo({ variant = 'lockup', size = 'medium', label, className }: BrandLogoProps) {
  const showEmblem = variant === 'emblem' || variant === 'lockup'
  const showWordmark = variant === 'wordmark' || variant === 'lockup'
  const accessibilityProps = label
    ? { role: 'img', 'aria-label': label }
    : { 'aria-hidden': true as const }

  return (
    <span
      className={cn('mc-brand-logo', className)}
      data-size={size}
      data-variant={variant}
      {...accessibilityProps}
    >
      {showEmblem && (
        <img
          className="mc-brand-logo__emblem"
          src={`${import.meta.env.BASE_URL}brand/meetcue-emblem-64.png`}
          alt=""
        />
      )}
      {showWordmark && <span className="mc-brand-logo__wordmark">MeetCue</span>}
    </span>
  )
}

export { BrandLogo }
export type { BrandLogoProps, BrandLogoSize, BrandLogoVariant }
