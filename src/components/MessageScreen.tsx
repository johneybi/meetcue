import { Check, Users } from 'lucide-react'
import type { CandidateEvaluation } from '../domain/evaluation'
import { formatCandidateTime, type Meeting } from '../domain/meeting'
import { Avatar } from './ui/avatar'
import { Button } from './ui/button'
import './MessageScreen.css'

export function MessageScreen({
  meeting,
  evaluation,
  onBack,
  onConfirm,
}: {
  meeting: Meeting
  evaluation: CandidateEvaluation
  onBack?: () => void
  onConfirm: () => void
}) {
  const isConfirmed = meeting.status === 'confirmed'
  const recipients = meeting.participants.filter((participant) => participant.id !== meeting.hostId)

  return (
    <div className="message-workspace">
      <section className="message-panel" data-confirmed={isConfirmed}>
        <header className="message-panel__header">
          <div>
            <span>{isConfirmed ? '회의 확정 완료' : '최종 확인'}</span>
            <h1>{isConfirmed ? '회의가 확정됐어요' : '이 시간으로 확정할까요?'}</h1>
            <p>
              {isConfirmed
                ? '참석자에게 확정된 일정을 알렸어요.'
                : '확정하면 참석자에게 최종 일정을 바로 알려드려요.'}
            </p>
          </div>
        </header>

        <section className="message-panel__event" aria-labelledby="confirmation-event-title">
          <span>{isConfirmed ? '확정 일정' : '선택한 일정'}</span>
          <h2 id="confirmation-event-title">{meeting.title}</h2>
          <strong>{formatCandidateTime(evaluation.candidate)}</strong>
        </section>

        <section className="message-panel__recipients" aria-label="알림 대상">
          <span className="message-panel__recipients-icon" aria-hidden="true">
            {isConfirmed ? <Check size={18} /> : <Users size={18} />}
          </span>
          <div>
            <strong>
              {isConfirmed
                ? `${recipients.length}명에게 알렸어요`
                : `참석자 ${recipients.length}명에게 알릴게요`}
            </strong>
            <span>{recipients.map((participant) => participant.name).join(', ')}</span>
          </div>
          <div className="message-panel__avatar-stack" aria-hidden="true">
            {recipients.map((participant) => (
              <Avatar key={participant.id} name={participant.name} size="small" />
            ))}
          </div>
        </section>

        {!isConfirmed ? (
          <footer className="message-panel__actions">
            <div className="button-row">
              {onBack ? (
                <Button variant="secondary" size="action" onClick={onBack}>
                  결과로 돌아가기
                </Button>
              ) : null}
              <Button size="action" onClick={onConfirm}>
                확정하고 참석자에게 알리기
              </Button>
            </div>
          </footer>
        ) : null}
      </section>
    </div>
  )
}
