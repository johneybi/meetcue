import { Check } from 'lucide-react'
import type { Meeting, Participant } from '../domain/meeting'
import { ParticipantPageShell } from './ParticipantPageShell'
import { Button } from './ui/button'
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
  const responses = meeting.responses.filter((r) => r.participantId === participant.id)
  const available = responses.filter((r) => r.value === 'available').length
  const adjustable = responses.filter((r) => r.value === 'adjustable').length
  const hasAttendableCandidate = available + adjustable > 0
  return (
    <ParticipantPageShell onExit={onExit}>
      <main className="participant-receipt">
        <div className="participant-receipt__mark" aria-hidden="true">
          <Check size={32} strokeWidth={2.5} />
        </div>
        <p className="participant-receipt__meeting">{meeting.title}</p>
        <h1>{hasAttendableCandidate ? '응답을 보냈어요' : '확인한 시간은 어렵다고 알려줬어요'}</h1>
        <p className="participant-receipt__description">
          회의 시간은 주최자가 응답을 보고 정해요.
          <br />
          확정 전까지 내 응답을 바꿀 수 있어요.
        </p>
        <dl className="participant-receipt__summary">
          <div>
            <dt>가능해요</dt>
            <dd>
              {available}
              <span>개</span>
            </dd>
          </div>
          <div>
            <dt>옮겨서 참석</dt>
            <dd>
              {adjustable}
              <span>개</span>
            </dd>
          </div>
          <div>
            <dt>어려워요</dt>
            <dd>
              {responses.filter((r) => r.value === 'unavailable').length}
              <span>개</span>
            </dd>
          </div>
        </dl>
        {participant.responseScope === 'candidates' ? (
          <p className="participant-receipt__note">
            응답한 후보 {participant.responseCandidateIds?.length}개만 전달했어요.
            <br />
            다른 시간은 아직 확인하지 않은 상태예요.
          </p>
        ) : null}
        <div className="participant-receipt__actions">
          {showPrototypeReturn ? (
            <Button size="action" width="full" onClick={onExit}>
              달라진 결과 확인하기
            </Button>
          ) : null}
          <Button variant="secondary" size="action" width="full" onClick={onEdit}>
            응답 수정하기
          </Button>
          <a className="receipt-home-link" href="#/requests">
            받은 요청으로 돌아가기
          </a>
        </div>
      </main>
    </ParticipantPageShell>
  )
}
