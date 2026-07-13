import type { Meeting } from '../domain/meeting'
import { Button } from './ui/button'
import './ParticipantPageShell.css'
import './InvalidParticipantInviteScreen.css'

const meetCueEmblemUrl = `${import.meta.env.BASE_URL}brand/meetcue-emblem-64.png`

export function InvalidParticipantInviteScreen({
  meeting,
  onExit,
}: {
  meeting: Meeting
  onExit: () => void
}) {
  return (
    <div className="respond-app">
      <header className="respond-header">
        <div className="respond-brand">
          <img className="brand-dot" src={meetCueEmblemUrl} alt="" />
          <strong className="brand-wordmark">MeetCue</strong>
        </div>
        <Button
          className="respond-host-link"
          variant="fieldAction"
          size="text"
          onClick={onExit}
        >
          회의 만들기
        </Button>
      </header>
      <main className="respond-main respond-main--identity">
        <section className="soft-panel invalid-invite" aria-labelledby="invalid-invite-title">
          <span className="respond-eyebrow">{meeting.title}</span>
          <h1 id="invalid-invite-title">회의 요청을 열 수 없어요</h1>
          <p>내 계정에 도착한 회의 요청 알림에서 다시 열어주세요.</p>
        </section>
      </main>
    </div>
  )
}
