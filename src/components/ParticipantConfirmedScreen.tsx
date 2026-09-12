import { type Meeting, type Participant } from '../domain/meeting'
import { ParticipantPageShell } from './ParticipantPageShell'
import { Button } from './ui/button'
import { downloadCalendarEvent } from '../lib/calendarExport'
import { MeetingReceipt, MeetingSchedule } from './MeetingReceipt'
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
        <MeetingReceipt
          title="회의가 확정됐어요"
          description="확정한 일정을 캘린더에 추가해 두세요."
          confirmed
          actions={
            <>
              {confirmedCandidate ? (
                <Button
                  size="action"
                  onClick={() => downloadCalendarEvent(meeting, confirmedCandidate)}
                >
                  캘린더에 추가
                </Button>
              ) : null}
              <a className="receipt-home-link" href="#/requests">
                받은 요청으로 돌아가기
              </a>
            </>
          }
        >
          {confirmedCandidate ? (
            <MeetingSchedule title={meeting.title} candidate={confirmedCandidate} />
          ) : (
            <p>{meeting.title} · 주최자가 회의 시간을 확정했어요.</p>
          )}
          {response?.value === 'adjustable' ? (
            <div className="participant-confirmed-notice">
              조정하면 참석할 수 있다고 답한 시간으로 정해졌어요. 필요하다면 기존 일정을 조정해
              주세요.
            </div>
          ) : null}
        </MeetingReceipt>
      </main>
    </ParticipantPageShell>
  )
}
