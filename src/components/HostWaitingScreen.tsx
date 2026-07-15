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
          <div className="waiting-header__meta">
            <span className="waiting-header__eyebrow">응답 수집 중</span>
            <span aria-hidden="true">·</span>
            <strong>{meeting.title}</strong>
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
          </div>
          <dl className="waiting-overview__meta">
            <div>
              <dt>응답 마감</dt>
              <dd>{formatDeadline(meeting.responseDeadline)}</dd>
            </div>
          </dl>
        </section>

        <section className="waiting-participants">
          <div className="waiting-participants__head">
            <div>
              <h2>참석자 응답</h2>
              {completedParticipants.length > 0 ? (
                <p>응답을 기다리는 사람을 먼저 보여드려요.</p>
              ) : null}
            </div>
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
        {onAdvancePrototype ? (
          <footer className="waiting-demo-footer" aria-label="데모 시연">
            <div>
              <span>데모 시연</span>
              <strong>응답이 도착한 뒤의 판단 화면을 확인해 보세요.</strong>
            </div>
            <Button variant="fieldAction" size="text" onClick={onAdvancePrototype}>
              응답이 온 결과 보기
            </Button>
          </footer>
        ) : null}
      </section>
    </div>
  )
}
