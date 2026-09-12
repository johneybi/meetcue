import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { BrandLink } from './BrandLink'
import './ParticipantPageShell.css'

type ParticipantPageShellProps = { onExit: () => void; children: ReactNode }
export function ParticipantPageShell({ children }: ParticipantPageShellProps) {
  return (
    <div className="respond-app">
      <header className="respond-header">
        <BrandLink />
        <a className="header-return" href="#/requests">
          받은 요청
        </a>
      </header>
      <div className="participant-breadcrumb">
        <a href="#/requests">
          <ChevronLeft size={16} aria-hidden="true" />
          받은 요청으로
        </a>
        <span>회의 초대</span>
      </div>
      {children}
    </div>
  )
}
