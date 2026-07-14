import { useState } from 'react'
import { Bell, Check, Clock3 } from 'lucide-react'
import {
  formatDeadline,
  participantRoleLabels,
  type Meeting,
  type Participant,
} from '../domain/meeting'
import { Button } from './ui/button'
import { Avatar } from './ui/avatar'
import './HostWaitingScreen.css'

export function HostWaitingScreen({
  meeting,
  onRemindParticipant,
  onAdvancePrototype,
}: {
  meeting: Meeting
  onRemindParticipant: (participant: Participant) => void
  onAdvancePrototype?: () => void
}) {
  const [remindedParticipantIds, setRemindedParticipantIds] = useState<string[]>([])
  const responseTargets = meeting.participants.filter(
    (participant) => participant.id !== meeting.hostId,
  )
  const completedParticipants = responseTargets.filter(
    (participant) => participant.responseStatus === 'submitted',
  )
  const pendingParticipants = responseTargets.filter(
    (participant) => participant.responseStatus !== 'submitted',
  )
  const responseProgress =
    responseTargets.length === 0
      ? 0
      : Math.round((completedParticipants.length / responseTargets.length) * 100)
  const orderedParticipants = [...pendingParticipants, ...completedParticipants]

  return (
    <div className="waiting-workspace">
      <section className="waiting-card">
        <header className="waiting-header">
          <div className="waiting-header__context">
            <div>
              <span>회의</span>
              <strong>{meeting.title}</strong>
            </div>
            <span className="waiting-header__eyebrow">응답 수집 중</span>
          </div>
          <h1>{pendingParticipants.length}명의 응답을 기다리고 있어요</h1>
          <p>모든 응답을 기다리지 않아도, 조건을 충족한 시간이 생기면 바로 확인할 수 있어요.</p>
        </header>

        <section className="waiting-overview" aria-label={`응답 진행률 ${responseProgress}%`}>
          <div className="waiting-overview__count">
            <span>응답 현황</span>
            <strong>
              {completedParticipants.length}
              <small> / {responseTargets.length}명</small>
            </strong>
          </div>
          <div className="waiting-overview__progress">
            <span className="waiting-progress__track" aria-hidden="true">
              <span style={{ width: `${responseProgress}%` }} />
            </span>
            <span>{responseProgress}% 완료</span>
          </div>
          <dl className="waiting-overview__meta">
            <div>
              <dt>응답 마감</dt>
              <dd>{formatDeadline(meeting.responseDeadline)}</dd>
            </div>
            <div>
              <dt>후보 시간</dt>
              <dd>{meeting.candidates.length}개</dd>
            </div>
          </dl>
        </section>

        <section className="waiting-participants">
          <div className="waiting-participants__head">
            <div>
              <h2>참석자 응답</h2>
              <p>응답이 필요한 사람을 먼저 보여드려요.</p>
            </div>
            <span>
              대기 {pendingParticipants.length} · 완료 {completedParticipants.length}
            </span>
          </div>
          <div className="waiting-response-list">
            {orderedParticipants.map((participant) => {
              const isComplete = participant.responseStatus === 'submitted'
              const wasReminded = remindedParticipantIds.includes(participant.id)
              return (
                <div
                  className={`waiting-response-row${isComplete ? ' is-complete' : ''}`}
                  key={participant.id}
                >
                  <div className="waiting-response-row__person">
                    <Avatar name={participant.name} size="small" />
                    <div>
                      <strong>{participant.name}</strong>
                      <small>{participantRoleLabels[participant.role]}</small>
                    </div>
                  </div>
                  <span className={`waiting-response-state${isComplete ? ' is-complete' : ''}`}>
                    {isComplete ? (
                      <Check size={15} aria-hidden="true" />
                    ) : (
                      <Clock3 size={15} aria-hidden="true" />
                    )}
                    {isComplete ? '응답 완료' : '응답 대기'}
                  </span>
                  {!isComplete ? (
                    <Button
                      className="waiting-remind-button"
                      variant="fieldAction"
                      size="text"
                      aria-label={
                        wasReminded
                          ? `${participant.name}님에게 다시 알림 보냄`
                          : `${participant.name}님에게 다시 알리기`
                      }
                      disabled={wasReminded}
                      onClick={() => {
                        onRemindParticipant(participant)
                        setRemindedParticipantIds((currentIds) =>
                          currentIds.includes(participant.id)
                            ? currentIds
                            : [...currentIds, participant.id],
                        )
                      }}
                    >
                      <Bell size={15} aria-hidden="true" />
                      {wasReminded ? '알림 보냄' : '다시 알리기'}
                    </Button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      </section>
      {onAdvancePrototype ? (
        <aside className="prototype-flow-action waiting-demo-card" aria-label="데모 시연">
          <div>
            <span>
              {completedParticipants.length > 0
                ? `${completedParticipants.length}명의 응답을 반영했어요`
                : '데모 시연'}
            </span>
            <strong>
              {completedParticipants.length > 0
                ? '현재 조건으로 가능한 시간을 확인해 보세요'
                : '응답이 도착한 다음 화면을 미리 확인해 보세요'}
            </strong>
          </div>
          <Button size="action" onClick={onAdvancePrototype}>
            {completedParticipants.length > 0 ? '결과 확인하기' : '다음 단계 보기'}
          </Button>
        </aside>
      ) : null}
    </div>
  )
}
