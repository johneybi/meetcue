import type { RefObject } from 'react'
import {
  formatMeetingDuration,
  type AvailabilityWindow,
  type MeetingDuration,
} from '../domain/meeting'
import { Input } from './ui/input'
import { Field } from './ui/field'
import { TimeStepSummary } from './TimeStepSummary'
import './ResponseDeadlineStep.css'

type ResponseDeadlineStepProps = {
  sectionRef: RefObject<HTMLElement | null>
  availabilityWindows: AvailabilityWindow[]
  durationMinutes: MeetingDuration
  responseDeadline: string
  now: Date
  earliestAvailabilityStart: Date | null
  isResponseDeadlineValid: boolean
  onResponseDeadlineChange: (deadline: string) => void
  onEditAvailability: () => void
}

function formatDateTimeLocalInput(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hour}:${minute}`
}

function parseDateTimeLocalInput(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function formatAvailabilityStart(date: Date) {
  const dateLabel = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
  const timeLabel = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)

  return `${dateLabel} ${timeLabel}부터`
}

export function ResponseDeadlineStep({
  sectionRef,
  availabilityWindows,
  durationMinutes,
  responseDeadline,
  now,
  earliestAvailabilityStart,
  isResponseDeadlineValid,
  onResponseDeadlineChange,
  onEditAvailability,
}: ResponseDeadlineStepProps) {
  return (
    <section
      ref={sectionRef}
      className="time-create-stage time-create-stage--deadline"
      aria-labelledby="response-deadline-title"
    >
      <TimeStepSummary
        label="조율할 시간대"
        value={`${availabilityWindows.length}개 · ${formatMeetingDuration(durationMinutes)} 확보`}
        onEdit={onEditAvailability}
      />
      <header className="time-create-stage__header">
        <h2 id="response-deadline-title" tabIndex={-1}>
          응답을 언제까지 받을까요?
        </h2>
        <p>선택한 시간대가 시작되기 전에 참석자 응답을 모아요.</p>
      </header>
      <Field
        className="response-deadline-field"
        label="응답 마감"
        hint={
          earliestAvailabilityStart != null
            ? `첫 조율 시간대: ${formatAvailabilityStart(earliestAvailabilityStart)}`
            : undefined
        }
      >
        <Input
          type="datetime-local"
          value={formatDateTimeLocalInput(responseDeadline)}
          min={formatDateTimeLocalInput(now)}
          max={
            earliestAvailabilityStart == null
              ? undefined
              : formatDateTimeLocalInput(earliestAvailabilityStart)
          }
          onChange={(event) =>
            onResponseDeadlineChange(parseDateTimeLocalInput(event.target.value))
          }
        />
      </Field>
      {!isResponseDeadlineValid ? (
        <p className="time-create-stage__error" role="alert">
          지금 이후이면서 첫 조율 시간대보다 앞선 시각을 선택해 주세요.
        </p>
      ) : null}
    </section>
  )
}
