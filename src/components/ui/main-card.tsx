import type { HTMLAttributes } from 'react'

import { cn } from '../../lib/utils'

type MainCardProps = HTMLAttributes<HTMLElement>
type MainCardSectionProps = HTMLAttributes<HTMLDivElement>

function MainCard({ className, ...props }: MainCardProps) {
  return <section className={cn('main-card', className)} {...props} />
}

function MainCardHeader({ className, ...props }: MainCardSectionProps) {
  return <header className={cn('main-card__header', className)} {...props} />
}

function MainCardContent({ className, ...props }: MainCardSectionProps) {
  return <div className={cn('main-card__content', className)} {...props} />
}

function MainCardFooter({ className, ...props }: MainCardSectionProps) {
  return <footer className={cn('main-card__footer', className)} {...props} />
}

export { MainCard, MainCardContent, MainCardFooter, MainCardHeader }
