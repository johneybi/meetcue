import { CalendarCheck2 } from 'lucide-react'
import { generateConfirmationMessage, type CandidateEvaluation } from '../domain/evaluation'
import { formatCandidateTime, type Meeting } from '../domain/meeting'
import { Button } from './ui/button'
import './MessageScreen.css'

export function MessageScreen({
  meeting,
  evaluation,
  onBack,
  onNotify,
}: {
  meeting: Meeting
  evaluation: CandidateEvaluation
  onBack?: () => void
  onNotify: () => void
}) {
  const message = generateConfirmationMessage(meeting, evaluation)
  const recipientCount = meeting.participants.filter(
    (participant) => participant.id !== meeting.hostId,
  ).length

  return (
    <div className="message-workspace">
      <section className="message-panel">
        <header className="message-panel__header">
          <span className="message-panel__icon" aria-hidden="true">
            <CalendarCheck2 size={22} />
          </span>
          <div>
            <span>회의 시간 확정</span>
            <h1>회의 시간을 확정했어요</h1>
            <p>{meeting.title}</p>
          </div>
        </header>
        <div className="message-panel__time">
          <span>확정 시간</span>
          <strong>{formatCandidateTime(evaluation.candidate)}</strong>
        </div>
        <section className="message-panel__preview" aria-labelledby="confirmation-preview-title">
          <div>
            <span id="confirmation-preview-title">참석자에게 보낼 내용</span>
            <small>{recipientCount}명에게 전송</small>
          </div>
          <p>{message}</p>
        </section>
        <footer className="message-panel__actions">
          <p>확정 알림을 보내면 참석자에게 최종 시간이 안내돼요.</p>
          <div className="button-row">
            <Button size="action" onClick={onNotify}>
              확정 알림 보내기
            </Button>
            {onBack ? (
              <Button variant="secondary" size="action" onClick={onBack}>
                회의 결과로 돌아가기
              </Button>
            ) : null}
          </div>
        </footer>
      </section>
    </div>
  )
}
