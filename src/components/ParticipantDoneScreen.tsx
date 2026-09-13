import { useEffect } from 'react'
import { Check } from 'lucide-react'
import type { Meeting, Participant } from '../domain/meeting'
import { ParticipantPageShell } from './ParticipantPageShell'
import { Button } from './ui/button'
import './ParticipantDoneScreen.css'
import { ResponseAnswerList } from './ResponseAnswerList'

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
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])
  const responses = meeting.responses.filter((r) => r.participantId === participant.id)
  const available = responses.filter((r) => r.value === 'available').length
  const adjustable = responses.filter((r) => r.value === 'adjustable').length
  const intent = responses.filter((r) => r.value === 'adjustment_intent').length
  const hasAttendableCandidate = available + adjustable + intent > 0
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
        <section className="participant-receipt__answers" aria-labelledby="sent-answers-title">
          <div className="participant-receipt__section-heading">
            <h2 id="sent-answers-title">전달한 응답</h2>
            <span>시간 확정 전</span>
          </div>
          <ResponseAnswerList
            candidates={meeting.candidates}
            answers={Object.fromEntries(responses.map((r) => [r.candidateId, r.value]))}
          />
          <div className="response-review-note">
            <strong>
              {intent > 0
                ? '조정이 필요하면 다시 물어볼게요'
                : '다음은 주최자가 시간을 정할 차례예요'}
            </strong>
            {intent > 0
              ? '검토 가능으로 답한 시간은 아직 참석 약속이 아니에요. 변경 요청을 받으면 결정해 주세요.'
              : '확정 전까지 내 응답을 수정할 수 있어요.'}
          </div>
          {participant.responseScope === 'candidates' && (
            <p className="participant-receipt__note">
              응답한 후보만 전달했어요. 다른 시간은 미확인으로 남아요.
            </p>
          )}
        </section>
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
