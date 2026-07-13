import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { CalendarDays } from 'lucide-react'
import type { AvailabilitySlot } from '../domain/availability'
import type { ResponseValue } from '../domain/meeting'
import './ParticipantTimeGrid.css'

type SlotState = ResponseValue | null

export type CalendarEvent = {
  id: string
  title: string
  timeLabel: string
  segment: 'start' | 'end'
}

export type ParticipantTimeGridProps = {
  slots: AvailabilitySlot[]
  stateLabels: Record<ResponseValue, string>
  getState: (slot: AvailabilitySlot) => SlotState
  getCalendarEvent?: (slot: AvailabilitySlot) => CalendarEvent | null
  getIsManuallyEdited?: (slot: AvailabilitySlot) => boolean
  onPaintSlot: (slot: AvailabilitySlot, state: ResponseValue) => void
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
  stateLabels,
  getState,
  getCalendarEvent,
  getIsManuallyEdited,
  onPaintSlot,
}: ParticipantTimeGridProps) {
  const groups = useMemo(() => buildGroups(slots), [slots])
  const [activeDateKey, setActiveDateKey] = useState(() => groups[0]?.key ?? '')
  const paintedSlotsRef = useRef<Set<string> | null>(null)
  const paintTargetRef = useRef<ResponseValue | null>(null)
  const touchTapRef = useRef(false)

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

  const calendarLabelAnchors = new Map<string, string>()
  slots
    .slice()
    .sort((left, right) => left.startAt.localeCompare(right.startAt))
    .forEach((slot) => {
      const event = getCalendarEvent?.(slot)
      if (event == null || getState(slot) !== 'unavailable') return
      if (!calendarLabelAnchors.has(event.id)) calendarLabelAnchors.set(event.id, slot.startAt)
    })

  function getNextState(state: SlotState): ResponseValue {
    if (state === 'available') return 'adjustable'
    if (state === 'adjustable') return 'unavailable'
    return 'available'
  }

  function beginPaint(event: ReactPointerEvent<HTMLButtonElement>, slot: AvailabilitySlot) {
    if (event.button !== 0) return
    if (event.pointerType === 'touch') {
      touchTapRef.current = true
      return
    }
    touchTapRef.current = false
    const targetState = getNextState(getState(slot))
    paintedSlotsRef.current = new Set([slot.startAt])
    paintTargetRef.current = targetState
    onPaintSlot(slot, targetState)
  }

  function continuePaint(event: ReactPointerEvent<HTMLButtonElement>, slot: AvailabilitySlot) {
    if (event.pointerType === 'touch' || paintedSlotsRef.current == null) return
    if (paintedSlotsRef.current.has(slot.startAt)) return
    paintedSlotsRef.current.add(slot.startAt)
    if (paintTargetRef.current) onPaintSlot(slot, paintTargetRef.current)
  }

  function continuePaintFromTable(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch' || paintedSlotsRef.current == null) return
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-slot-start]')
    const slotStart = target?.dataset.slotStart
    if (slotStart == null || paintedSlotsRef.current.has(slotStart)) return
    const slot = slots.find((item) => item.startAt === slotStart)
    if (slot == null) return
    paintedSlotsRef.current.add(slot.startAt)
    if (paintTargetRef.current) onPaintSlot(slot, paintTargetRef.current)
  }

  function finishPaint() {
    paintedSlotsRef.current = null
    paintTargetRef.current = null
  }

  function renderStateCell(slot: AvailabilitySlot, context: 'desktop' | 'mobile') {
    const state = getState(slot)
    const calendarEvent = getCalendarEvent?.(slot) ?? null
    const isManuallyEdited = getIsManuallyEdited?.(slot) ?? false
    const stateClass = state == null ? 'unset' : state
    const visibleCalendarEvent = state === 'unavailable' ? calendarEvent : null
    const isCalendarLabelAnchor =
      visibleCalendarEvent != null &&
      calendarLabelAnchors.get(visibleCalendarEvent.id) === slot.startAt
    const nextState = getNextState(state)

    return (
      <div
        className={`participant-time-cell is-${stateClass}${context === 'mobile' ? ' is-mobile' : ''}${
          visibleCalendarEvent ? ` has-calendar-event is-event-${visibleCalendarEvent.segment}` : ''
        }${
          isCalendarLabelAnchor ? ' is-calendar-anchor' : ''
        }${isManuallyEdited ? ' is-manually-edited' : ''}`}
        key={`${context}-${slot.startAt}`}
      >
        <button
          className="participant-time-cell__paint"
          type="button"
          data-slot-start={slot.startAt}
          aria-label={`${slotClockRange(slot)}${
            visibleCalendarEvent ? `, Google Calendar 일정 ${visibleCalendarEvent.title}` : ''
          }, 현재 ${state ? stateLabels[state] : '미선택'}, 누르면 ${stateLabels[nextState]}로 변경`}
          title={`${state ? stateLabels[state] : '미선택'} · 누르면 ${stateLabels[nextState]}`}
          onPointerDown={(event) => beginPaint(event, slot)}
          onPointerEnter={(event) => continuePaint(event, slot)}
          onPointerUp={finishPaint}
          onPointerCancel={finishPaint}
          onClick={(event) => {
            if (event.detail === 0 || touchTapRef.current) {
              onPaintSlot(slot, getNextState(getState(slot)))
            }
            touchTapRef.current = false
          }}
        >
          <span className="participant-time-cell__state-symbol" aria-hidden="true">
            {state === 'available'
              ? '○'
              : state === 'adjustable'
                ? '△'
                : state === 'unavailable'
                  ? '×'
                  : '·'}
          </span>
          {context === 'mobile' && !isCalendarLabelAnchor ? (
            <strong>{state ? stateLabels[state] : '미선택'}</strong>
          ) : null}
        </button>
        {isCalendarLabelAnchor && visibleCalendarEvent ? (
          <span className="participant-calendar-event" aria-hidden="true">
            <CalendarDays size={12} />
            <strong>{visibleCalendarEvent.title}</strong>
          </span>
        ) : null}
      </div>
    )
  }

  if (groups.length === 0) return null

  return (
    <div
      className="participant-time-table"
      onPointerMove={continuePaintFromTable}
      onPointerLeave={finishPaint}
      onPointerUp={finishPaint}
      onPointerCancel={finishPaint}
    >
      <div className="participant-state-guide" aria-label="응답 상태 색상 안내">
        <strong>칸을 누를 때마다 상태가 바뀌어요</strong>
        <span>
          <i className="is-available" aria-hidden="true">
            ○
          </i>
          {stateLabels.available}
        </span>
        <span>
          <i className="is-adjustable" aria-hidden="true">
            △
          </i>
          {stateLabels.adjustable}
        </span>
        <span>
          <i className="is-unavailable" aria-hidden="true">
            ×
          </i>
          {stateLabels.unavailable}
        </span>
        <small>여러 칸을 드래그하면 같은 상태로 한 번에 바뀌어요.</small>
      </div>
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
