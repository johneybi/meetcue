import {
  createDefaultHostAvailabilityWindows,
  deriveAvailabilitySlots,
  mergeAvailabilityWindows,
  type AvailabilitySlot,
} from '../domain/availability'
import {
  formatDeadline,
  formatMeetingDuration,
  formatSchedulingWindow,
  type AvailabilityWindow,
  type Meeting,
  type Participant,
} from '../domain/meeting'
import {
  formatCandidateFullDate,
  formatCandidateStartTime,
  getCandidateDateKey,
} from '../lib/candidateTime'
import type { AttendeeDecisionMode } from './AttendanceCriteriaStep'
import { Avatar } from './ui/avatar'
import './CreateReviewStep.css'

type CreateReviewStepProps = {
  meeting: Meeting
  attendanceMode: AttendeeDecisionMode | null
}

export function CreateReviewStep({ meeting, attendanceMode }: CreateReviewStepProps) {
  const invitedParticipants = meeting.participants.filter(
    (participant) => participant.id !== meeting.hostId,
  )
  const requiredParticipants = invitedParticipants.filter(
    (participant) => participant.role === 'required',
  )
  const host = meeting.participants.find((participant) => participant.id === meeting.hostId)
  const hostAvailabilityWindows = meeting.availabilityWindows.filter(
    (window) => window.ownerId === meeting.hostId,
  )
  const referenceMaterial = meeting.referenceMaterial?.trim()

  return (
    <div className="create-step-body create-review">
      <section className="create-review-section" aria-labelledby="review-meeting-title">
        <h2 id="review-meeting-title">회의 안내</h2>
        <div className="create-review-facts">
          <ReviewFactRow label="회의" value={meeting.title} />
          <ReviewIdentityRow label="요청자" name={host?.name ?? meeting.hostLabel} />
          <ReviewFactRow label="정할 내용" value={meeting.purpose.trim()} />
          {referenceMaterial ? <ReviewFactRow label="참고 출처" value={referenceMaterial} /> : null}
        </div>
      </section>

      <section className="create-review-section" aria-labelledby="review-people-title">
        <h2 id="review-people-title">참석자와 참석 기준</h2>
        <div className="create-review-facts">
          <ReviewPeopleRow
            label="참석자"
            participants={invitedParticipants}
            detail={`주최자 포함 ${invitedParticipants.length + 1}명`}
          />
          <ReviewFactRow
            label="참석 기준"
            value={
              attendanceMode === 'everyone'
                ? '모두 참석할 수 있을 때 진행'
                : `주최자 포함 최소 ${meeting.minAttendeeCount}명이 가능할 때 진행`
            }
          />
          {attendanceMode === 'required' && requiredParticipants.length > 0 ? (
            <ReviewPeopleRow
              label="꼭 필요한 사람"
              participants={requiredParticipants}
            />
          ) : null}
        </div>
      </section>

      <section className="create-review-section" aria-labelledby="review-time-title">
        <h2 id="review-time-title">시간</h2>
        <ReviewAvailabilityScope meeting={meeting} windows={hostAvailabilityWindows} />
        <div className="create-review-facts">
          <ReviewFactRow label="응답 마감" value={formatDeadline(meeting.responseDeadline)} />
        </div>
      </section>
    </div>
  )
}

function ReviewAvailabilityScope({
  meeting,
  windows,
}: {
  meeting: Meeting
  windows: AvailabilityWindow[]
}) {
  const defaultWindows = createDefaultHostAvailabilityWindows({
    meetingId: meeting.id,
    hostId: meeting.hostId,
    startDate: meeting.schedulingWindow.startDate,
    endDate: meeting.schedulingWindow.endDate,
  })
  const defaultSlots = deriveAvailabilitySlots(defaultWindows, meeting.hostId)
  const selectedSlots = deriveAvailabilitySlots(windows, meeting.hostId)
  const defaultSlotStarts = new Set(defaultSlots.map((slot) => slot.startAt))
  const selectedSlotStarts = new Set(selectedSlots.map((slot) => slot.startAt))
  const excludedWindows = mergeReviewSlots(
    defaultSlots.filter((slot) => !selectedSlotStarts.has(slot.startAt)),
    meeting,
    'excluded',
  )
  const addedWindows = mergeReviewSlots(
    selectedSlots.filter((slot) => !defaultSlotStarts.has(slot.startAt)),
    meeting,
    'added',
  )

  return (
    <div className="review-availability-scope">
      <ReviewFactRow label="기간" value={formatSchedulingWindow(meeting.schedulingWindow)} />
      <ReviewFactRow label="회의 길이" value={formatMeetingDuration(meeting.durationMinutes)} />
      <ReviewFactRow label="기본 범위" value="평일 09:00–18:00" />
      <ReviewFactRow label="제외한 시간" value={formatReviewExceptionWindows(excludedWindows)} />
      {addedWindows.length > 0 ? (
        <ReviewFactRow label="추가한 시간" value={formatReviewExceptionWindows(addedWindows)} />
      ) : null}
    </div>
  )
}

function mergeReviewSlots(slots: AvailabilitySlot[], meeting: Meeting, kind: 'excluded' | 'added') {
  return mergeAvailabilityWindows(
    slots.map((slot) => ({
      id: `review-${kind}-${slot.startAt}`,
      meetingId: meeting.id,
      ownerId: meeting.hostId,
      startAt: slot.startAt,
      endAt: slot.endAt,
      state: 'available' as const,
    })),
  )
}

function formatReviewExceptionWindows(windows: AvailabilityWindow[]) {
  if (windows.length === 0) return '없음'

  return windows
    .map((window) => {
      const dateKey = getCandidateDateKey(window.startAt)
      return `${formatCandidateFullDate(dateKey)} ${formatCandidateStartTime(window.startAt)}–${formatCandidateStartTime(window.endAt)}`
    })
    .join(', ')
}

function ReviewFactRow({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="review-fact-row">
      <span>{label}</span>
      <div>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
    </div>
  )
}

function ReviewPeopleRow({
  label,
  participants,
  detail,
}: {
  label: string
  participants: Participant[]
  detail?: string
}) {
  return (
    <div className="review-fact-row">
      <span>{label}</span>
      <div>
        <div className="review-people-list">
          {participants.map((participant) => (
            <span className="review-person" key={participant.id}>
              <Avatar name={participant.name} size="small" />
              <strong>{participant.name}</strong>
            </span>
          ))}
        </div>
        {detail ? <small>{detail}</small> : null}
      </div>
    </div>
  )
}

function ReviewIdentityRow({ label, name }: { label: string; name: string }) {
  return (
    <div className="review-fact-row">
      <span>{label}</span>
      <div>
        <span className="review-person">
          <Avatar name={name} size="small" />
          <strong>{name}</strong>
        </span>
      </div>
    </div>
  )
}
