import { ChevronDown } from 'lucide-react'
import {
  formatDeadline,
  formatMeetingDuration,
  formatSchedulingWindow,
  type Meeting,
} from '../domain/meeting'
import './ParticipantMeetingContext.css'

type ParticipantMeetingContextProps = {
  meeting: Meeting
  isScheduleEntry: boolean
  isEditing: boolean
  remainingCount: number
  deadlinePassed: boolean
}

export function ParticipantMeetingContext({
  meeting,
  isScheduleEntry,
  isEditing,
  remainingCount,
  deadlinePassed,
}: ParticipantMeetingContextProps) {
  const referenceMaterial = meeting.referenceMaterial?.trim()

  return (
    <>
      {isScheduleEntry ? (
        <details className="respond-mobile-context">
          <summary>
            <div>
              <strong>{meeting.title}</strong>
              <span>마감 {formatDeadline(meeting.responseDeadline)}</span>
            </div>
            <span className="respond-mobile-context__toggle">
              회의 정보
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </summary>
          <div className="respond-mobile-context__detail">
            <p>{meeting.purpose}</p>
            <span>요청자: {meeting.hostLabel}</span>
            <dl>
              <div>
                <dt>조율 기간</dt>
                <dd>{formatSchedulingWindow(meeting.schedulingWindow)}</dd>
              </div>
              <div>
                <dt>비워둘 시간</dt>
                <dd>{formatMeetingDuration(meeting.durationMinutes)}</dd>
              </div>
              <div>
                <dt>최종 결정</dt>
                <dd>주최자가 확정</dd>
              </div>
            </dl>
          </div>
        </details>
      ) : null}

      <section className="respond-hero" aria-label="응답 안내">
        <div>
          <span className="respond-eyebrow">회의 요청</span>
          <h1>{meeting.title}</h1>
          <div className="respond-meeting-overview">
            <strong>{meeting.purpose}</strong>
            <span>요청자: {meeting.hostLabel}</span>
            {referenceMaterial ? <small>참고 출처: {referenceMaterial}</small> : null}
          </div>
        </div>
        <div className="respond-status-card">
          <span>{deadlinePassed ? '응답 마감 지남' : '응답 마감'}</span>
          <strong>{formatDeadline(meeting.responseDeadline)}</strong>
          <small>
            {deadlinePassed
              ? '마감이 지났지만 지금 제출하면 결과에 바로 반영돼요.'
              : remainingCount === 0
                ? '응답을 저장할 수 있어요'
                : `${remainingCount}개 시간의 응답이 남았어요.`}
          </small>
        </div>
      </section>

      {isEditing ? (
        <section className="participant-notice">
          <strong>이전에 고른 응답이에요.</strong>
          <span>확정 전까지 받은 요청에서 응답을 다시 수정할 수 있어요.</span>
        </section>
      ) : null}

      <section className="respond-progress" aria-label="응답 진행 상황">
        <div>
          <span>조율 기간</span>
          <strong>{formatSchedulingWindow(meeting.schedulingWindow)}</strong>
        </div>
        <div>
          <span>비워둘 시간</span>
          <strong>{formatMeetingDuration(meeting.durationMinutes)}</strong>
        </div>
        <div>
          <span>최종 결정</span>
          <strong>주최자가 확정</strong>
        </div>
      </section>
    </>
  )
}
