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
      <h2 id="time-candidates-title" className="sr-only" tabIndex={-1}>
        참석자에게 물어볼 시간
      </h2>
      <AvailabilityWindowPicker
        meeting={{ ...meeting, availabilityWindows }}
        onAvailabilityWindowsChange={onAvailabilityWindowsChange}
      />
    </section>
  )
}
