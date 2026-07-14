import { Check } from 'lucide-react'
import { formatDeadline, participantRoleLabels, type Meeting } from '../domain/meeting'
import { Button } from './ui/button'
import { Avatar } from './ui/avatar'
import './RequestSentScreen.css'

export function RequestSentScreen({
  meeting,
  onOpenHost,
}: {
  meeting: Meeting
  onOpenHost: () => void
}) {
  const responseTargets = meeting.participants.filter(
    (participant) => participant.id !== meeting.hostId,
  )
  const completedCount = responseTargets.filter(
    (participant) => participant.responseStatus === 'submitted',
  ).length

  return (
    <div className="share-workspace">
      <section className="share-card">
        <header className="share-card__header">
          <span className="share-card__status-icon" aria-hidden="true">
            <Check size={19} strokeWidth={2.5} />
          </span>
          <div>
            <span>요청 발송 완료</span>
            <h1>요청을 보냈어요</h1>
            <p>
              {meeting.title} · {formatDeadline(meeting.responseDeadline)} 마감
            </p>
          </div>
        </header>
        <div className="share-list-head">
          <strong>참석자</strong>
          <span>{responseTargets.length}명</span>
        </div>
        <div className="request-recipient-list" aria-label="응답 요청 대상">
          {responseTargets.map((participant) => (
            <div className="request-recipient-row" key={participant.id}>
              <div className="request-recipient-row__person">
                <Avatar name={participant.name} size="small" />
                <div>
                  <strong>{participant.name}</strong>
                  <small>{participantRoleLabels[participant.role]}</small>
                </div>
              </div>
              <span
                className={`request-delivery-status${
                  participant.responseStatus === 'submitted' ? ' is-complete' : ''
                }`}
              >
                {participant.responseStatus === 'submitted' ? '응답 완료' : '요청됨'}
              </span>
            </div>
          ))}
        </div>
        <footer className="share-card__footer">
          <p>
            {completedCount > 0
              ? `${completedCount}명이 이미 응답했어요.`
              : '응답이 오면 후보 시간을 바로 계산해요.'}
          </p>
          <Button size="action" onClick={onOpenHost}>
            응답 현황 보기
          </Button>
        </footer>
      </section>
    </div>
  )
}
