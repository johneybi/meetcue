import { formatCandidateTime, type Meeting, type Participant } from '../domain/meeting'
import { ParticipantPageShell } from './ParticipantPageShell'
import { Badge } from './ui/badge'
import './ParticipantDoneScreen.css'
import './ParticipantConfirmedScreen.css'

type ParticipantConfirmedScreenProps = {
  meeting: Meeting
  participant: Participant
  onExit: () => void
}

export function ParticipantConfirmedScreen({
  meeting,
  participant,
  onExit,
}: ParticipantConfirmedScreenProps) {
  const confirmedCandidate = meeting.candidates.find(
    (candidate) => candidate.id === meeting.confirmedCandidateId,
  )
  const response = meeting.responses.find(
    (item) =>
      item.participantId === participant.id && item.candidateId === meeting.confirmedCandidateId,
  )

  return (
    <ParticipantPageShell onExit={onExit}>
      <main className="respond-main">
        <section className="soft-panel participant-done">
          <Badge className="status-label" tone="success" size="compact">
            회의 시간이 정해졌어요
          </Badge>
          <h1>{meeting.title}</h1>
          <p>
            {confirmedCandidate == null
              ? '주최자가 회의 시간을 확정했어요.'
              : `${formatCandidateTime(confirmedCandidate)}에 진행해요.`}
          </p>
          {response?.value === 'adjustable' ? (
            <div className="participant-confirmed-notice">
              조정하면 참석할 수 있다고 답한 시간으로 정해졌어요. 필요하다면 기존 일정을 조정해
              주세요.
            </div>
          ) : null}
        </section>
      </main>
    </ParticipantPageShell>
  )
}
