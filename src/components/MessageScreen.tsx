import { ArrowLeft } from 'lucide-react'
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
    <div className="message-workspace" data-confirmed={isConfirmed}>
      {!isConfirmed && onBack ? (
        <Button className="message-workspace__back" variant="quiet" size="text" onClick={onBack}>
          <ArrowLeft aria-hidden="true" size={18} />
          다른 시간 보기
        </Button>
      ) : null}

      <section className="message-panel" data-confirmed={isConfirmed}>
        <header className="message-panel__header">
          <span>{isConfirmed ? '회의 확정 완료' : '최종 확인'}</span>
          <h1>{isConfirmed ? '회의가 확정됐어요' : '이 일정으로 확정할까요?'}</h1>
          <p>
            {isConfirmed
              ? '참석자에게 확정된 일정을 알렸어요.'
              : '확정하면 참석자에게 최종 일정을 바로 알려드려요.'}
          </p>
        </header>

        <section className="message-panel__event" aria-labelledby="confirmation-event-title">
          <span>{isConfirmed ? '확정된 일정' : '확정할 일정'}</span>
          <h2 id="confirmation-event-title">{formatCandidateTime(evaluation.candidate)}</h2>
          <p>{meeting.title}</p>
        </section>

        <section className="message-panel__recipients" aria-label="알림 대상">
          <div className="message-panel__avatar-stack" aria-hidden="true">
            {recipients.map((participant) => (
              <Avatar key={participant.id} name={participant.name} size="small" />
            ))}
          </div>
          <div>
            <span className="message-panel__recipients-label">알림 대상</span>
            <strong>
              {isConfirmed
                ? `${recipients.length}명에게 알렸어요`
                : `참석자 ${recipients.length}명에게 알릴게요`}
            </strong>
            <span>{recipients.map((participant) => participant.name).join(', ')}</span>
          </div>
        </section>

        {!isConfirmed ? (
          <footer className="message-panel__actions">
            <Button size="action" width="full" onClick={onConfirm}>
              이 일정으로 확정하기
            </Button>
          </footer>
        ) : null}
      </section>
    </div>
  )
}
