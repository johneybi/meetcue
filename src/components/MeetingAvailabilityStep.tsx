import type { RefObject } from 'react'
import {
  formatMeetingDuration,
  formatSchedulingWindow,
  type AvailabilityWindow,
} from '../domain/meeting'
import { AvailabilityWindowPicker, type MeetingWithDuration } from './AvailabilityWindowPicker'
import { TimeStepSummary } from './TimeStepSummary'
import './MeetingAvailabilityStep.css'

type MeetingAvailabilityStepProps = {
  sectionRef: RefObject<HTMLElement | null>
  meeting: MeetingWithDuration
  availabilityWindows: AvailabilityWindow[]
  onAvailabilityWindowsChange: (windows: AvailabilityWindow[]) => void
  onEditConstraints: () => void
}

export function MeetingAvailabilityStep({
  sectionRef,
  meeting,
  availabilityWindows,
  onAvailabilityWindowsChange,
  onEditConstraints,
}: MeetingAvailabilityStepProps) {
  return (
    <section
      ref={sectionRef}
      className="time-create-stage time-create-stage--candidates"
      aria-labelledby="time-candidates-title"
    >
      <TimeStepSummary
        label="회의 조건"
        value={`${formatSchedulingWindow(meeting.schedulingWindow)} · ${formatMeetingDuration(meeting.durationMinutes)}`}
        onEdit={onEditConstraints}
      />
      <header className="time-create-stage__header">
        <h2 id="time-candidates-title" tabIndex={-1}>
          이 시간 안에서 찾아볼게요
        </h2>
        <p>평일 오전 9시부터 오후 6시까지 기본으로 열어뒀어요. 안 되는 시간만 빼주세요.</p>
      </header>
      <AvailabilityWindowPicker
        meeting={{ ...meeting, availabilityWindows }}
        onAvailabilityWindowsChange={onAvailabilityWindowsChange}
      />
    </section>
  )
}
