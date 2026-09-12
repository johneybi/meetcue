import type { HTMLAttributes } from 'react'

import { cn } from '../../lib/utils'

type MainCardProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'article'
  material?: 'plain' | 'soft'
  selected?: boolean
  interactive?: boolean
}
type MainCardSectionProps = HTMLAttributes<HTMLDivElement>

function MainCard({ as: Tag = 'section', material = 'plain', selected = false, interactive = false, className, ...props }: MainCardProps) {
  return <Tag className={cn('main-card', className)} data-material={material} data-selected={selected} data-interactive={interactive} {...props} />
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
