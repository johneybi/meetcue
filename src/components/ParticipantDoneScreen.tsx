import type { Meeting, Participant } from '../domain/meeting'
import { ParticipantPageShell } from './ParticipantPageShell'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import './ParticipantDoneScreen.css'

type ParticipantDoneScreenProps = {
  meeting: Meeting
  participant: Participant
  onEdit: () => void
  onExit: () => void
  showPrototypeReturn: boolean
}

export function ParticipantDoneScreen({
  meeting,
  participant,
  onEdit,
  onExit,
  showPrototypeReturn,
}: ParticipantDoneScreenProps) {
  const participantResponses = meeting.responses.filter(
    (response) => response.participantId === participant.id,
  )
  const hasAttendableCandidate = participantResponses.some(
    (response) => response.value === 'available' || response.value === 'adjustable',
  )

  return (
    <ParticipantPageShell onExit={onExit}>
      <main className="respond-main">
        <section className="soft-panel participant-done">
          <Badge className="status-label" tone="success" size="compact">
            응답을 저장했어요
          </Badge>
          <h1>
            {hasAttendableCandidate ? '응답을 저장했어요' : '참석 가능한 시간이 없다고 응답했어요'}
          </h1>
          <p>
            {hasAttendableCandidate
              ? `${meeting.title}의 회의 시간은 주최자가 응답을 확인한 뒤 정해요. 확정 전까지 받은 요청에서 응답을 다시 수정할 수 있어요.`
              : '현재 참석 가능한 시간이 없다고 응답했어요. 확정 전까지 받은 요청에서 응답을 다시 수정할 수 있어요.'}
          </p>
          <div className="button-row">
            {showPrototypeReturn ? (
              <Button size="action" onClick={onExit}>
                달라진 결과 확인하기
              </Button>
            ) : null}
            <Button variant="secondary" size="action" onClick={onEdit}>
              응답 수정하기
            </Button>
          </div>
        </section>
      </main>
    </ParticipantPageShell>
  )
}
