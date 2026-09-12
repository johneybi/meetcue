import { downloadCalendarEvent } from '../lib/calendarExport'
import { ArrowLeft, CalendarPlus } from 'lucide-react'
import type { CandidateEvaluation } from '../domain/evaluation'
import type { Meeting } from '../domain/meeting'
import { Button } from './ui/button'
import { MeetingReceipt, MeetingSchedule } from './MeetingReceipt'
import './MessageScreen.css'

export function MessageScreen({
  meeting,
  evaluation,
  onBack,
  onConfirm,
  onHome,
}: {
  meeting: Meeting
  evaluation: CandidateEvaluation
  onBack?: () => void
  onConfirm: () => void
  onHome: () => void
}) {
  const isConfirmed = meeting.status === 'confirmed'
  const recipients = meeting.participants.filter((p) => p.id !== meeting.hostId)
  return (
    <div className="message-workspace" data-confirmed={isConfirmed}>
      {!isConfirmed && onBack ? (
        <Button className="message-workspace__back" variant="quiet" size="text" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          다른 시간 보기
        </Button>
      ) : null}
      <MeetingReceipt
        title={isConfirmed ? '회의가 확정됐어요' : '이 일정으로 확정할까요?'}
        description={
          isConfirmed
            ? '확정한 일정을 캘린더에 추가해 두세요.'
            : '날짜와 참석자를 확인한 뒤 회의 시간을 정해요.'
        }
        confirmed={isConfirmed}
        actions={
          isConfirmed ? (
            <>
              <Button
                size="action"
                onClick={() => downloadCalendarEvent(meeting, evaluation.candidate)}
              >
                <CalendarPlus size={18} aria-hidden="true" />
                캘린더에 추가
              </Button>
              <Button variant="quiet" onClick={onHome}>
                내 회의로 돌아가기
              </Button>
            </>
          ) : (
            <Button size="action" onClick={onConfirm}>
              이 일정으로 확정하기
            </Button>
          )
        }
      >
        <MeetingSchedule title={meeting.title} candidate={evaluation.candidate} />
        <details className="meeting-receipt__people">
          <summary>초대한 참석자 {recipients.length}명</summary>
          <p>{recipients.map((p) => p.name).join(', ')}</p>
        </details>
      </MeetingReceipt>
    </div>
  )
}
