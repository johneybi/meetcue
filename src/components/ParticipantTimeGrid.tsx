import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { CircleMinus } from 'lucide-react'
import type { AvailabilitySlot } from '../domain/availability'
import type { ResponseValue } from '../domain/meeting'
import './ParticipantTimeGrid.css'

type SlotState = ResponseValue | null

type CalendarEvent = {
  id: string
  title: string
  timeLabel: string
  segment: 'start' | 'end'
}

export type ParticipantTimeGridProps = {
  slots: AvailabilitySlot[]
  brush: ResponseValue
  stateLabels: Record<ResponseValue, string>
  getState: (slot: AvailabilitySlot) => SlotState
  getAvoidPreferred: (slot: AvailabilitySlot) => boolean
  getCalendarEvent?: (slot: AvailabilitySlot) => CalendarEvent | null
  onPaintSlot: (slot: AvailabilitySlot) => void
  onPaintDay: (slots: AvailabilitySlot[]) => void
  onToggleAvoidPreferred: (slot: AvailabilitySlot) => void
}

type DateGroup = {
  key: string
  date: Date
  slots: AvailabilitySlot[]
  slotsByMinutes: Map<number, AvailabilitySlot>
}

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const dateHeadingFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
})
const weekdayFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  weekday: 'short',
})
const dayFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  day: 'numeric',
})
const clockFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

function minutesOfDay(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

function formatMinutes(minutes: number) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  const period = hour < 12 ? '오전' : '오후'
  const displayHour = hour % 12 || 12
  return `${period} ${displayHour}:${String(minute).padStart(2, '0')}`
}

function slotClockRange(slot: AvailabilitySlot) {
  return `${clockFormatter.format(new Date(slot.startAt))}-${clockFormatter.format(new Date(slot.endAt))}`
}

function buildGroups(slots: AvailabilitySlot[]) {
  const groups = new Map<string, DateGroup>()

  slots.forEach((slot) => {
    const date = new Date(slot.startAt)
    const key = dateKeyFormatter.format(date)
    const minutes = minutesOfDay(date)
    const existing = groups.get(key)
    if (existing) {
      existing.slots.push(slot)
      existing.slotsByMinutes.set(minutes, slot)
      return
    }
    groups.set(key, {
      key,
      date,
      slots: [slot],
      slotsByMinutes: new Map([[minutes, slot]]),
    })
  })

  return [...groups.values()].sort((left, right) => left.date.getTime() - right.date.getTime())
}

export function ParticipantTimeGrid({
  slots,
  brush,
  stateLabels,
  getState,
  getAvoidPreferred,
  getCalendarEvent,
  onPaintSlot,
  onPaintDay,
  onToggleAvoidPreferred,
}: ParticipantTimeGridProps) {
  const groups = useMemo(() => buildGroups(slots), [slots])
  const [activeDateKey, setActiveDateKey] = useState(() => groups[0]?.key ?? '')
  const paintedSlotsRef = useRef<Set<string> | null>(null)

  const timeRows = useMemo(() => {
    if (slots.length === 0) return []
    const starts = slots.map((slot) => minutesOfDay(new Date(slot.startAt)))
    const minimum = Math.min(...starts)
    const maximum = Math.max(...starts)
    const rows: number[] = []
    for (let value = minimum; value <= maximum; value += 30) rows.push(value)
    return rows
  }, [slots])

  const activeGroup = groups.find((group) => group.key === activeDateKey) ?? groups[0]

  function beginPaint(event: ReactPointerEvent<HTMLButtonElement>, slot: AvailabilitySlot) {
    if (event.button !== 0) return
    paintedSlotsRef.current = new Set([slot.startAt])
    onPaintSlot(slot)
  }

  function continuePaint(event: ReactPointerEvent<HTMLButtonElement>, slot: AvailabilitySlot) {
    if (event.pointerType === 'touch' || paintedSlotsRef.current == null) return
    if (paintedSlotsRef.current.has(slot.startAt)) return
    paintedSlotsRef.current.add(slot.startAt)
    onPaintSlot(slot)
  }

  function finishPaint() {
    paintedSlotsRef.current = null
  }

  function renderStateCell(slot: AvailabilitySlot, context: 'desktop' | 'mobile') {
    const state = getState(slot)
    const avoidPreferred = getAvoidPreferred(slot)
    const calendarEvent = getCalendarEvent?.(slot) ?? null
    const stateClass = state == null ? 'unset' : state

    return (
      <div
        className={`participant-time-cell is-${stateClass}${context === 'mobile' ? ' is-mobile' : ''}${
          calendarEvent ? ` has-calendar-event is-event-${calendarEvent.segment}` : ''
        }`}
        key={`${context}-${slot.startAt}`}
      >
        <button
          className="participant-time-cell__paint"
          type="button"
          aria-label={`${slotClockRange(slot)}${
            calendarEvent ? `, Google Calendar 일정 ${calendarEvent.title}` : ''
          }, 현재 ${state ? stateLabels[state] : '미선택'}, ${stateLabels[brush]}로 변경`}
          title={state ? stateLabels[state] : '미선택'}
          onPointerDown={(event) => beginPaint(event, slot)}
          onPointerEnter={(event) => continuePaint(event, slot)}
          onPointerUp={finishPaint}
          onPointerCancel={finishPaint}
          onClick={(event) => {
            if (event.detail === 0) onPaintSlot(slot)
          }}
        >
          {calendarEvent ? (
            <span className="participant-calendar-event">
              {calendarEvent.segment === 'start' ? (
                <>
                  <strong>{calendarEvent.title}</strong>
                  <small>{calendarEvent.timeLabel}</small>
                </>
              ) : null}
            </span>
          ) : context === 'mobile' ? (
            <strong>{state ? stateLabels[state] : '미선택'}</strong>
          ) : null}
          <span className="participant-time-cell__state-dot" aria-hidden="true" />
        </button>
        {state === 'available' || state === 'adjustable' ? (
          <button
            className={`participant-time-cell__avoid${avoidPreferred ? ' is-selected' : ''}`}
            type="button"
            title="가능하면 피하기"
            aria-label={`${slotClockRange(slot)} 가능하면 피하기`}
            aria-pressed={avoidPreferred}
            onClick={() => onToggleAvoidPreferred(slot)}
          >
            <CircleMinus
              size={context === 'mobile' ? 18 : 14}
              strokeWidth={2.4}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>
    )
  }

  if (groups.length === 0) return null

  return (
    <div className="participant-time-table" onPointerLeave={finishPaint}>
      <div
        className="participant-week-grid"
        style={{ '--participant-day-count': groups.length } as CSSProperties}
        role="grid"
        aria-label="주간 가용시간 타임테이블"
      >
        <span className="participant-week-grid__corner" aria-hidden="true" />
        {groups.map((group) => (
          <div className="participant-week-grid__day" role="columnheader" key={group.key}>
            <span>{weekdayFormatter.format(group.date)}</span>
            <strong>{dayFormatter.format(group.date)}</strong>
            <button type="button" onClick={() => onPaintDay(group.slots)}>
              모두 {stateLabels[brush]}
            </button>
          </div>
        ))}
        {timeRows.map((minutes) => (
          <div className="participant-week-grid__row" role="row" key={minutes}>
            <span role="rowheader">{formatMinutes(minutes)}</span>
            {groups.map((group) => {
              const slot = group.slotsByMinutes.get(minutes)
              return slot ? (
                renderStateCell(slot, 'desktop')
              ) : (
                <div
                  className="participant-time-cell is-closed"
                  role="gridcell"
                  aria-label={`${formatMinutes(minutes)} 조율 대상 아님`}
                  key={`${group.key}-${minutes}`}
                />
              )
            })}
          </div>
        ))}
      </div>

      <div className="participant-day-table">
        <div className="participant-day-strip" aria-label="응답할 날짜">
          {groups.map((group) => (
            <button
              className={group.key === activeGroup.key ? 'is-selected' : ''}
              type="button"
              key={group.key}
              aria-pressed={group.key === activeGroup.key}
              onClick={() => setActiveDateKey(group.key)}
            >
              <span>{weekdayFormatter.format(group.date)}</span>
              <strong>{dayFormatter.format(group.date)}</strong>
            </button>
          ))}
        </div>
        <header className="participant-day-table__header">
          <strong>{dateHeadingFormatter.format(activeGroup.date)}</strong>
          <button type="button" onClick={() => onPaintDay(activeGroup.slots)}>
            이 날 모두 {stateLabels[brush]}
          </button>
        </header>
        <div className="participant-day-table__slots">
          {timeRows.map((minutes) => {
            const slot = activeGroup.slotsByMinutes.get(minutes)
            return (
              <div className="participant-day-table__row" key={minutes}>
                <span>{formatMinutes(minutes)}</span>
                {slot ? (
                  renderStateCell(slot, 'mobile')
                ) : (
                  <div className="participant-time-cell is-closed" aria-label="조율 대상 아님">
                    <small>조율 대상 아님</small>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
