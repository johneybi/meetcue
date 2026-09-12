import type { Meeting } from '../domain/meeting'
import { ParticipantPageShell } from './ParticipantPageShell'
import { Button } from './ui/button'
import './InvalidParticipantInviteScreen.css'
export function InvalidParticipantInviteScreen({
  onExit,
}: {
  meeting: Meeting
  onExit: () => void
}) {
  return (
    <ParticipantPageShell onExit={onExit}>
      <main className="respond-main respond-main--identity">
        <section className="soft-panel invalid-invite">
          <h1>회의 요청을 찾을 수 없어요</h1>
          <p>링크가 올바른지 확인하거나 받은 요청에서 회의를 다시 열어주세요.</p>
          <a className="header-return" href="#/requests">
            받은 요청 확인하기
          </a>
          <Button variant="quiet" size="text" onClick={onExit}>
            홈으로
          </Button>
        </section>
      </main>
    </ParticipantPageShell>
  )
}
