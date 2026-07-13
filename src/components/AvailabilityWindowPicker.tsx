import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useMemo,
  useRef,
  useState,
} from 'react'
import { CalendarDate, getLocalTimeZone, startOfWeek, today } from '@internationalized/date'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  createDefaultHostAvailabilityWindows,
  removeAvailabilityRange,
} from '../domain/availability'
import {
  formatCandidateTime,
  formatMeetingDuration,
  type AvailabilityWindow,
  type Meeting,
  type MeetingDuration,
} from '../domain/meeting'
import { useMediaQuery } from '../hooks/useMediaQuery'
import './AvailabilityWindowPicker.css'

const TIME_QUANTUM_MINUTES = 30
const TIME_GRID_START_MINUTES = 9 * 60
const TIME_GRID_END_MINUTES = 18 * 60
const TIME_SLOT_MINUTES = Array.from(
  { length: (TIME_GRID_END_MINUTES - TIME_GRID_START_MINUTES) / TIME_QUANTUM_MINUTES },
  (_, index) => TIME_GRID_START_MINUTES + index * TIME_QUANTUM_MINUTES,
)

const koreanDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
})
const koreanShortDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'numeric',
  day: 'numeric',
})
const koreanWeekdayFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  weekday: 'short',
})

type ScopeBrushMode = 'exclude' | 'add'
export type MeetingWithDuration = Meeting & { durationMinutes: MeetingDuration }

function toCalendarDate(date: Date) {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function parseCalendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new CalendarDate(year, month, day)
}

function toLocalDate(date: CalendarDate, minuteOfDay = 0) {
  const hour = Math.floor(minuteOfDay / 60)
  const minute = minuteOfDay % 60
  return new Date(date.year, date.month - 1, date.day, hour, minute, 0, 0)
}

function formatTimeOfDay(minuteOfDay: number) {
  const hour = Math.floor(minuteOfDay / 60)
  const minute = minuteOfDay % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function formatAvailabilityWindow(window: AvailabilityWindow) {
  return formatCandidateTime({
    id: window.id,
    meetingId: window.meetingId,
    startAt: window.startAt,
    endAt: window.endAt,
  })
}

export function AvailabilityWindowPicker({
  meeting,
  onAvailabilityWindowsChange,
}: {
  meeting: MeetingWithDuration
  onAvailabilityWindowsChange: (windows: AvailabilityWindow[]) => void
}) {
  const isMobile = useMediaQuery('(max-width: 900px)')
  const [todayDate] = useState(() => today(getLocalTimeZone()))
  const windowStartDate = useMemo(
    () => parseCalendarDate(meeting.schedulingWindow.startDate),
    [meeting.schedulingWindow.startDate],
  )
  const windowEndDate = useMemo(
    () => parseCalendarDate(meeting.schedulingWindow.endDate),
    [meeting.schedulingWindow.endDate],
  )
  const [selectedDate, setSelectedDate] = useState(windowStartDate)
  const [focusedSlot, setFocusedSlot] = useState({ dayIndex: 0, timeIndex: 0 })
  const [preview, setPreview] = useState<{
    date: CalendarDate
    startMinutes: number
    endMinutes: number
  } | null>(null)
  const [brushMode, setBrushMode] = useState<ScopeBrushMode>('exclude')
  const gridRef = useRef<HTMLDivElement>(null)
  const dragSelectionRef = useRef<{
    date: CalendarDate
    startMinutes: number
    currentMinutes: number
    pointerId: number
    startX: number
    startY: number
    moved: boolean
    mode: ScopeBrushMode
  } | null>(null)
  const suppressNextClickRef = useRef(false)
  const activeDate =
    selectedDate.compare(windowStartDate) < 0 || selectedDate.compare(windowEndDate) > 0
      ? windowStartDate
      : selectedDate
  const weekStart = useMemo(() => startOfWeek(activeDate, 'ko-KR', 'mon'), [activeDate])
  const firstWindowWeek = useMemo(
    () => startOfWeek(windowStartDate, 'ko-KR', 'mon'),
    [windowStartDate],
  )
  const lastWindowWeek = useMemo(() => startOfWeek(windowEndDate, 'ko-KR', 'mon'), [windowEndDate])
  const displayDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => weekStart.add({ days: index })),
    [weekStart],
  )
  const selectedDateCount = useMemo(
    () =>
      new Set(
        meeting.availabilityWindows.map((window) =>
          toCalendarDate(new Date(window.startAt)).toString(),
        ),
      ).size,
    [meeting.availabilityWindows],
  )
  const selectedMinutes = useMemo(
    () =>
      meeting.availabilityWindows.reduce(
        (total, window) =>
          total + (new Date(window.endAt).getTime() - new Date(window.startAt).getTime()) / 60_000,
        0,
      ),
    [meeting.availabilityWindows],
  )

  function isOutsideWindow(date: CalendarDate) {
    return (
      date.compare(todayDate) < 0 ||
      date.compare(windowStartDate) < 0 ||
      date.compare(windowEndDate) > 0
    )
  }

  function windowOccupyingSlot(date: CalendarDate, startMinutes: number) {
    const slotStart = toLocalDate(date, startMinutes).getTime()

    return meeting.availabilityWindows.find((window) => {
      const rangeStart = new Date(window.startAt).getTime()
      const rangeEnd = new Date(window.endAt).getTime()
      return rangeStart <= slotStart && slotStart < rangeEnd
    })
  }

  function buildRange(date: CalendarDate, startMinutes: number) {
    const endMinutes = startMinutes + TIME_QUANTUM_MINUTES

    if (startMinutes < TIME_GRID_START_MINUTES || endMinutes > TIME_GRID_END_MINUTES) {
      return null
    }

    return { date, startMinutes, endMinutes }
  }

  function buildDragRange(date: CalendarDate, anchorMinutes: number, edgeMinutes: number) {
    const startMinutes = Math.min(anchorMinutes, edgeMinutes)
    const endMinutes = Math.max(anchorMinutes, edgeMinutes) + TIME_QUANTUM_MINUTES

    if (startMinutes < TIME_GRID_START_MINUTES || endMinutes > TIME_GRID_END_MINUTES) {
      return null
    }

    return { date, startMinutes, endMinutes }
  }

  function previewFrom(date: CalendarDate, startMinutes: number) {
    if (isOutsideWindow(date)) {
      setPreview(null)
      return
    }

    const range = buildRange(date, startMinutes)
    const canPreview =
      range != null &&
      (brushMode === 'exclude'
        ? windowOccupyingSlot(date, startMinutes) != null
        : windowOccupyingSlot(date, startMinutes) == null)
    setPreview(canPreview ? range : null)
  }

  function chooseBoundary(date: CalendarDate, startMinutes: number) {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      return
    }

    const existingWindow = windowOccupyingSlot(date, startMinutes)

    if (brushMode === 'exclude') {
      if (existingWindow != null) {
        excludeRange({
          date,
          startMinutes,
          endMinutes: startMinutes + TIME_QUANTUM_MINUTES,
        })
      }
      setPreview(null)
      return
    }

    if (existingWindow != null) return

    if (isOutsideWindow(date)) {
      return
    }

    const range = buildRange(date, startMinutes)

    if (range == null) return

    commitRange(range)
  }

  function commitRange(range: { date: CalendarDate; startMinutes: number; endMinutes: number }) {
    const nextWindow: AvailabilityWindow = {
      id: `aw-${meeting.hostId}-${toLocalDate(range.date, range.startMinutes).getTime()}`,
      meetingId: meeting.id,
      ownerId: meeting.hostId,
      startAt: toLocalDate(range.date, range.startMinutes).toISOString(),
      endAt: toLocalDate(range.date, range.endMinutes).toISOString(),
      state: 'available',
    }

    onAvailabilityWindowsChange([...meeting.availabilityWindows, nextWindow])
    setPreview(null)
  }

  function excludeRange(range: { date: CalendarDate; startMinutes: number; endMinutes: number }) {
    onAvailabilityWindowsChange(
      removeAvailabilityRange(meeting.availabilityWindows, meeting.hostId, {
        startAt: toLocalDate(range.date, range.startMinutes).toISOString(),
        endAt: toLocalDate(range.date, range.endMinutes).toISOString(),
      }),
    )
    setPreview(null)
  }

  function resetDefaultScope() {
    onAvailabilityWindowsChange(
      createDefaultHostAvailabilityWindows({
        meetingId: meeting.id,
        hostId: meeting.hostId,
        startDate: meeting.schedulingWindow.startDate,
        endDate: meeting.schedulingWindow.endDate,
      }),
    )
    setBrushMode('exclude')
    setPreview(null)
  }

  function beginDragSelection(
    event: ReactPointerEvent<HTMLButtonElement>,
    date: CalendarDate,
    startMinutes: number,
  ) {
    if (event.button !== 0 || event.pointerType === 'touch' || isOutsideWindow(date)) return

    const range = buildRange(date, startMinutes)
    if (range == null) return

    event.currentTarget.setPointerCapture(event.pointerId)
    dragSelectionRef.current = {
      date,
      startMinutes,
      currentMinutes: startMinutes,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      mode: brushMode,
    }
    setPreview(range)
  }

  function updateDragSelection(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragSelectionRef.current
    if (drag == null || drag.pointerId !== event.pointerId) return

    const movedDistance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY)
    if (!drag.moved && movedDistance < 5) return

    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLButtonElement>('[data-availability-date][data-start-minutes]')
    const targetDate = target?.dataset.availabilityDate
    const targetMinutes = Number(target?.dataset.startMinutes)

    if (targetDate == null || !Number.isFinite(targetMinutes)) return

    const date = parseCalendarDate(targetDate)
    if (date.compare(drag.date) !== 0) return

    drag.moved = true
    drag.currentMinutes = targetMinutes
    const range = buildDragRange(drag.date, drag.startMinutes, targetMinutes)
    setPreview(range)
  }

  function finishDragSelection(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragSelectionRef.current
    if (drag == null || drag.pointerId !== event.pointerId) return

    if (drag.moved) {
      const range = buildDragRange(drag.date, drag.startMinutes, drag.currentMinutes)
      if (range != null) {
        suppressNextClickRef.current = true
        window.setTimeout(() => {
          suppressNextClickRef.current = false
        }, 0)
        if (drag.mode === 'exclude') {
          excludeRange(range)
        } else {
          commitRange(range)
        }
      } else {
        setPreview(null)
      }
    }

    dragSelectionRef.current = null
  }

  function cancelDragSelection() {
    dragSelectionRef.current = null
    setPreview(null)
  }

  function focusGridSlot(dayIndex: number, timeIndex: number) {
    const nextDayIndex = Math.min(Math.max(dayIndex, 0), displayDays.length - 1)
    const nextTimeIndex = Math.min(Math.max(timeIndex, 0), TIME_SLOT_MINUTES.length - 1)

    setFocusedSlot({ dayIndex: nextDayIndex, timeIndex: nextTimeIndex })
    gridRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-availability-index="${nextTimeIndex}-${nextDayIndex}"]`,
      )
      ?.focus()
  }

  function handleGridKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    dayIndex: number,
    timeIndex: number,
  ) {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusGridSlot(dayIndex + 1, timeIndex)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusGridSlot(dayIndex - 1, timeIndex)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusGridSlot(dayIndex, timeIndex + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusGridSlot(dayIndex, timeIndex - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      chooseBoundary(displayDays[dayIndex], TIME_SLOT_MINUTES[timeIndex])
    }
  }

  function changeWeek(offset: number) {
    const nextDate = activeDate.add({ weeks: offset })

    if (nextDate.compare(windowStartDate) < 0) {
      setSelectedDate(windowStartDate)
    } else if (nextDate.compare(windowEndDate) > 0) {
      setSelectedDate(windowEndDate)
    } else {
      setSelectedDate(nextDate)
    }
  }

  const weekEnd = displayDays[displayDays.length - 1]
  const weekLabel = `${koreanShortDateFormatter.format(toLocalDate(weekStart))} - ${koreanShortDateFormatter.format(toLocalDate(weekEnd))}`
  const cannotGoPrevious = weekStart.compare(firstWindowWeek) <= 0
  const cannotGoNext = weekStart.compare(lastWindowWeek) >= 0

  return (
    <div className="time-picker availability-picker" data-brush-mode={brushMode}>
      <div className="time-picker__status">
        <div>
          <span>참석자에게 물어볼 시간</span>
          <strong>
            {selectedDateCount}일 · {formatMeetingDuration(selectedMinutes)}
          </strong>
        </div>
        <span>안 되는 시간만 빼면 돼요</span>
      </div>

      <div className="availability-brush-toolbar" aria-label="시간 범위 편집 도구">
        <div className="availability-brush-group" role="group" aria-label="편집 모드">
          <button
            className={brushMode === 'exclude' ? 'is-selected' : ''}
            type="button"
            aria-pressed={brushMode === 'exclude'}
            onClick={() => setBrushMode('exclude')}
          >
            제외할 시간
          </button>
          <button
            className={brushMode === 'add' ? 'is-selected' : ''}
            type="button"
            aria-pressed={brushMode === 'add'}
            onClick={() => setBrushMode('add')}
          >
            추가할 시간
          </button>
        </div>
        <button className="availability-reset-button" type="button" onClick={resetDefaultScope}>
          기본값 복원
        </button>
      </div>

      <div className="availability-scope-legend" aria-label="시간표 표시 의미">
        <span>
          <i className="is-included" aria-hidden="true" /> 파란 칸은 참석자에게 물어볼 시간
        </span>
        <span>
          <i className="is-excluded" aria-hidden="true" /> 흰 칸은 제외한 시간
        </span>
      </div>

      <div className="time-picker__toolbar">
        <div className="time-picker__week-navigation" aria-label="주간 이동">
          <button
            type="button"
            aria-label="이전 주"
            disabled={cannotGoPrevious}
            onClick={() => changeWeek(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <strong>{weekLabel}</strong>
          <button
            type="button"
            aria-label="다음 주"
            disabled={cannotGoNext}
            onClick={() => changeWeek(1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {isMobile ? (
        <div className="mobile-time-picker">
          <div className="mobile-date-strip" aria-label="날짜 선택">
            {displayDays.map((date) => {
              const isSelectedDate = date.compare(activeDate) === 0

              return (
                <button
                  key={date.toString()}
                  className={isSelectedDate ? 'is-selected' : ''}
                  type="button"
                  disabled={isOutsideWindow(date)}
                  onClick={() => setSelectedDate(date)}
                >
                  <span>{koreanWeekdayFormatter.format(toLocalDate(date))}</span>
                  <strong>{date.day}</strong>
                </button>
              )
            })}
          </div>
          <section className="mobile-time-slots" aria-labelledby="mobile-availability-title">
            <h2 id="mobile-availability-title">
              {brushMode === 'exclude'
                ? '제외할 시간을 눌러 지워주세요'
                : '추가할 시간을 눌러 칠해주세요'}
            </h2>
            <div
              className="mobile-time-slot-list mobile-availability-list"
              onPointerMove={updateDragSelection}
              onPointerUp={finishDragSelection}
              onPointerCancel={cancelDragSelection}
            >
              {TIME_SLOT_MINUTES.map((startMinutes) => {
                const selectedWindow = windowOccupyingSlot(activeDate, startMinutes)
                return (
                  <button
                    key={startMinutes}
                    className={selectedWindow != null ? 'is-selected' : ''}
                    type="button"
                    aria-pressed={selectedWindow != null}
                    disabled={isOutsideWindow(activeDate)}
                    data-availability-date={activeDate.toString()}
                    data-start-minutes={startMinutes}
                    onPointerDown={(event) => beginDragSelection(event, activeDate, startMinutes)}
                    onClick={() => chooseBoundary(activeDate, startMinutes)}
                  >
                    <span>{formatTimeOfDay(startMinutes)}</span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      ) : (
        <div className="time-picker__workspace availability-paint-workspace">
          <div
            ref={gridRef}
            className="week-time-grid availability-paint-grid"
            role="grid"
            aria-label={`${weekLabel} 가능한 시간 칠하기`}
            onPointerMove={updateDragSelection}
            onPointerUp={finishDragSelection}
            onPointerCancel={cancelDragSelection}
            onMouseLeave={() => {
              if (dragSelectionRef.current == null) {
                setPreview(null)
              }
            }}
          >
            <div className="week-time-grid__header" role="row">
              <span aria-hidden="true" />
              {displayDays.map((date) => (
                <div key={date.toString()} role="columnheader">
                  <span>{koreanWeekdayFormatter.format(toLocalDate(date))}</span>
                  <strong>{date.day}</strong>
                </div>
              ))}
            </div>

            {TIME_SLOT_MINUTES.map((startMinutes, timeIndex) => (
              <div className="week-time-grid__row" role="row" key={startMinutes}>
                <span role="rowheader">{formatTimeOfDay(startMinutes)}</span>
                {displayDays.map((date, dayIndex) => {
                  const selectedWindow = windowOccupyingSlot(date, startMinutes)
                  const previewStartsHere =
                    preview != null &&
                    preview.date.compare(date) === 0 &&
                    preview.startMinutes === startMinutes
                  const isPreviewSlot =
                    preview != null &&
                    preview.date.compare(date) === 0 &&
                    startMinutes >= preview.startMinutes &&
                    startMinutes < preview.endMinutes
                  const previewEndsHere =
                    isPreviewSlot &&
                    preview != null &&
                    startMinutes + TIME_QUANTUM_MINUTES >= preview.endMinutes
                  const className = [
                    selectedWindow != null ? 'is-selected' : '',
                    isPreviewSlot ? 'is-preview-slot' : '',
                    previewStartsHere ? 'is-preview-start' : '',
                    previewEndsHere ? 'is-preview-end' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')

                  return (
                    <div role="gridcell" key={`${date.toString()}-${startMinutes}`}>
                      <button
                        className={className}
                        type="button"
                        data-availability-index={`${timeIndex}-${dayIndex}`}
                        data-availability-date={date.toString()}
                        data-start-minutes={startMinutes}
                        tabIndex={
                          focusedSlot.dayIndex === dayIndex && focusedSlot.timeIndex === timeIndex
                            ? 0
                            : -1
                        }
                        aria-pressed={selectedWindow != null}
                        aria-label={`${koreanDateFormatter.format(toLocalDate(date))} ${formatTimeOfDay(startMinutes)}${selectedWindow != null ? `, ${formatAvailabilityWindow(selectedWindow)} 가능한 시간대에 포함됨` : ', 시간대 경계로 선택'}`}
                        disabled={isOutsideWindow(date)}
                        onFocus={() => {
                          setFocusedSlot({ dayIndex, timeIndex })
                          previewFrom(date, startMinutes)
                        }}
                        onMouseEnter={() => previewFrom(date, startMinutes)}
                        onKeyDown={(event) => handleGridKeyDown(event, dayIndex, timeIndex)}
                        onPointerDown={(event) => beginDragSelection(event, date, startMinutes)}
                        onClick={() => chooseBoundary(date, startMinutes)}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
