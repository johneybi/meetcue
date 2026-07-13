import type { ReactNode } from 'react'
import { Button } from './ui/button'
import './ParticipantPageShell.css'

const meetCueEmblemUrl = `${import.meta.env.BASE_URL}brand/meetcue-emblem-64.png`

type ParticipantPageShellProps = {
  onExit: () => void
  children: ReactNode
}

export function ParticipantPageShell({ onExit, children }: ParticipantPageShellProps) {
  return (
    <div className="respond-app">
      <header className="respond-header">
        <div className="respond-brand">
          <img className="brand-dot" src={meetCueEmblemUrl} alt="" />
          <strong className="brand-wordmark">MeetCue</strong>
        </div>
        {import.meta.env.DEV ? (
          <Button
            className="respond-host-link"
            variant="fieldAction"
            size="text"
            onClick={onExit}
          >
            시연 · 결과 보드
          </Button>
        ) : null}
      </header>
      {children}
    </div>
  )
}
