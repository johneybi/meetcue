import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useId,
  useRef,
  useState,
} from 'react'
import { CalendarDate, startOfWeek, today } from '@internationalized/date'
import { Check, ChevronLeft, ChevronRight, Minus, Plus, MoreHorizontal, Undo2 } from 'lucide-react'
import {
  createDefaultHostAvailabilityWindows,
  deriveCandidatesFromAvailabilityWindows,
} from '../domain/availability'
import {
  applyHostTimeRange,
  hostTimeBounds,
  koreanDateTime,
  type TimeEditMode,
} from '../domain/hostTimeEditing'
import {
  formatCandidateTime,
  formatMeetingDuration,
  type AvailabilityWindow,
  type Meeting,
  type MeetingDuration,
} from '../domain/meeting'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { Button } from './ui/button'
import { TimeRangeEntry } from './TimeRangeEntry'
import './AvailabilityWindowPicker.css'

const TIME_QUANTUM_MINUTES = 30

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

export type MeetingWithDuration = Meeting & { durationMinutes: MeetingDuration }

function parseCalendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new CalendarDate(year, month, day)
}

function toLocalDate(date: CalendarDate, minuteOfDay = 0) {
  return koreanDateTime(date.toString(), minuteOfDay)
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
  const helpId = useId()
  const moreRef = useRef<HTMLDetailsElement>(null)
  const [entryMode, setEntryMode] = useState<TimeEditMode>('exclude')
  const [todayDate] = useState(() => today('Asia/Seoul'))
  const [entryOpen, setEntryOpen] = useState(false)
  const [showFullDay, setShowFullDay] = useState(false)
  const [announcement, setAnnouncement] = useState('')
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
    dates: string[]
    startMinutes: number
    endMinutes: number
    mode: TimeEditMode
  } | null>(null)
  const [history, setHistory] = useState<AvailabilityWindow[][]>([])
  const gridRef = useRef<HTMLDivElement>(null)
  const dragSelectionRef = useRef<{
    date: CalendarDate
    startMinutes: number
    currentMinutes: number
    currentDate: CalendarDate
    pointerId: number
    startX: number
    startY: number
    moved: boolean
    mode: TimeEditMode
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
  const automaticBounds = hostTimeBounds(meeting.availabilityWindows, meeting.hostId)
  const gridStart = showFullDay ? 0 : automaticBounds.start
  const gridEnd = showFullDay ? 1440 : automaticBounds.end
  const slotMinutes = Array.from(
    { length: (gridEnd - gridStart) / TIME_QUANTUM_MINUTES },
    (_, index) => gridStart + index * TIME_QUANTUM_MINUTES,
  )
  const usableCandidateCount = deriveCandidatesFromAvailabilityWindows(
    meeting.id,
    meeting.hostId,
    meeting.availabilityWindows,
    meeting.durationMinutes,
  ).length
  const selectedMinutes = useMemo(
    () =>
      meeting.availabilityWindows
        .filter((window) => window.ownerId === meeting.hostId && window.state === 'available')
        .reduce(
          (total, window) =>
            total +
            (new Date(window.endAt).getTime() - new Date(window.startAt).getTime()) / 60_000,
          0,
        ),
    [meeting.availabilityWindows, meeting.hostId],
  )

  const usesDefaultHours = useMemo(() => {
    const signature = (windows: AvailabilityWindow[]) =>
      windows
        .filter((window) => window.ownerId === meeting.hostId && window.state === 'available')
        .map((window) => `${window.startAt}/${window.endAt}`)
        .sort()
        .join('|')
    return (
      signature(meeting.availabilityWindows) ===
        signature(
          createDefaultHostAvailabilityWindows({
            meetingId: meeting.id,
            hostId: meeting.hostId,
            startDate: meeting.schedulingWindow.startDate,
            endDate: meeting.schedulingWindow.endDate,
          }),
        ) && selectedMinutes > 0
    )
  }, [
    meeting.id,
    meeting.hostId,
    meeting.schedulingWindow.startDate,
    meeting.schedulingWindow.endDate,
    meeting.availabilityWindows,
    selectedMinutes,
  ])

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
      return (
        window.ownerId === meeting.hostId &&
        window.state === 'available' &&
        rangeStart <= slotStart &&
        slotStart < rangeEnd
      )
    })
  }

  function buildRange(date: CalendarDate, startMinutes: number) {
    const endMinutes = startMinutes + TIME_QUANTUM_MINUTES

    if (startMinutes < gridStart || endMinutes > gridEnd) {
      return null
    }

    return { dates: [date.toString()], startMinutes, endMinutes }
  }

  function buildDragRange(
    anchorDate: CalendarDate,
    edgeDate: CalendarDate,
    anchorMinutes: number,
    edgeMinutes: number,
  ) {
    const startMinutes = Math.min(anchorMinutes, edgeMinutes)
    const endMinutes = Math.max(anchorMinutes, edgeMinutes) + TIME_QUANTUM_MINUTES

    if (startMinutes < gridStart || endMinutes > gridEnd) {
      return null
    }

    const firstDate = anchorDate.compare(edgeDate) <= 0 ? anchorDate : edgeDate
    const lastDate = anchorDate.compare(edgeDate) <= 0 ? edgeDate : anchorDate
    const dates = displayDays
      .filter(
        (date) =>
          date.compare(firstDate) >= 0 && date.compare(lastDate) <= 0 && !isOutsideWindow(date),
      )
      .map((date) => date.toString())
    return dates.length ? { dates, startMinutes, endMinutes } : null
  }

  function previewFrom(date: CalendarDate, startMinutes: number) {
    if (dragSelectionRef.current != null) return
    if (isOutsideWindow(date)) {
      setPreview(null)
      return
    }

    const range = buildRange(date, startMinutes)
    setPreview(
      range
        ? { ...range, mode: windowOccupyingSlot(date, startMinutes) ? 'exclude' : 'add' }
        : null,
    )
  }

  function chooseBoundary(date: CalendarDate, startMinutes: number) {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      return
    }

    if (isOutsideWindow(date)) {
      return
    }

    const range = buildRange(date, startMinutes)

    if (range == null) return

    editRange(
      [date.toString()],
      range.startMinutes,
      range.endMinutes,
      windowOccupyingSlot(date, startMinutes) ? 'exclude' : 'add',
    )
  }

  function editRange(
    dates: string[],
    startMinutes: number,
    endMinutes: number,
    mode: TimeEditMode,
  ) {
    const windows = applyHostTimeRange({
      windows: meeting.availabilityWindows,
      meetingId: meeting.id,
      hostId: meeting.hostId,
      schedulingWindow: meeting.schedulingWindow,
      dates,
      startMinutes,
      endMinutes,
      mode,
    })
    const changed = applyWindows(windows)
    setAnnouncement(
      changed
        ? `${dates.length}개 날짜의 ${formatTimeOfDay(startMinutes)}–${formatTimeOfDay(endMinutes)}를 ${mode === 'exclude' ? '제외' : '추가'}했어요.`
        : `이미 ${mode === 'exclude' ? '제외된' : '포함된'} 시간이에요.`,
    )
    setPreview(null)
  }

  function applyWindows(windows: AvailabilityWindow[]) {
    const signature = (items: AvailabilityWindow[]) =>
      items
        .map((w) => `${w.ownerId}:${w.startAt}:${w.endAt}:${w.state}`)
        .sort()
        .join('|')
    if (signature(windows) === signature(meeting.availabilityWindows)) return false
    setHistory((previous) => [...previous.slice(-19), meeting.availabilityWindows])
    onAvailabilityWindowsChange(windows)
    return true
  }

  function undoChange() {
    if (!history.length) return
    onAvailabilityWindowsChange(history[history.length - 1])
    setHistory((previous) => previous.slice(0, -1))
    setAnnouncement('마지막 변경을 되돌렸어요.')
    cancelDragSelection()
  }

  function closeMoreOptions() {
    moreRef.current?.removeAttribute('open')
    moreRef.current?.querySelector('summary')?.focus({ preventScroll: true })
  }

  function resetDefaultScope() {
    applyWindows([
      ...meeting.availabilityWindows.filter((w) => w.ownerId !== meeting.hostId),
      ...createDefaultHostAvailabilityWindows({
        meetingId: meeting.id,
        hostId: meeting.hostId,
        startDate: meeting.schedulingWindow.startDate,
        endDate: meeting.schedulingWindow.endDate,
      }),
    ])
    setAnnouncement('회의 날짜 범위의 평일 9–18시를 복원했어요. 되돌리기로 취소할 수 있어요.')
    setPreview(null)
  }

  function beginDragSelection(
    event: ReactPointerEvent<HTMLButtonElement>,
    date: CalendarDate,
    startMinutes: number,
  ) {
    suppressNextClickRef.current = false
    if (event.button !== 0 || event.pointerType === 'touch' || isOutsideWindow(date)) return

    const range = buildRange(date, startMinutes)
    if (range == null) return

    event.currentTarget.setPointerCapture(event.pointerId)
    dragSelectionRef.current = {
      date,
      startMinutes,
      currentMinutes: startMinutes,
      currentDate: date,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      mode: windowOccupyingSlot(date, startMinutes) ? 'exclude' : 'add',
    }
    setPreview({ ...range, mode: dragSelectionRef.current.mode })
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

    drag.moved = true
    drag.currentMinutes = targetMinutes
    drag.currentDate = date
    const range = buildDragRange(drag.date, date, drag.startMinutes, targetMinutes)
    setPreview(range ? { ...range, mode: drag.mode } : null)
  }

  function finishDragSelection(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragSelectionRef.current
    if (drag == null || drag.pointerId !== event.pointerId) return

    if (drag.moved) {
      const range = buildDragRange(
        drag.date,
        drag.currentDate,
        drag.startMinutes,
        drag.currentMinutes,
      )
      if (range != null) {
        suppressNextClickRef.current = true
        window.setTimeout(() => {
          suppressNextClickRef.current = false
        }, 0)
        editRange(range.dates, range.startMinutes, range.endMinutes, drag.mode)
      } else {
        setPreview(null)
      }
    }

    dragSelectionRef.current = null
  }

  function cancelDragSelection() {
    if (dragSelectionRef.current != null) suppressNextClickRef.current = true
    dragSelectionRef.current = null
    setPreview(null)
  }

  function focusGridSlot(dayIndex: number, timeIndex: number) {
    const enabledDays = displayDays
      .map((date, index) => ({ date, index }))
      .filter(({ date }) => !isOutsideWindow(date))
    if (!enabledDays.length) return
    const nextDayIndex = Math.min(
      Math.max(dayIndex, enabledDays[0].index),
      enabledDays[enabledDays.length - 1].index,
    )
    const nextTimeIndex = Math.min(Math.max(timeIndex, 0), slotMinutes.length - 1)

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
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      undoChange()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelDragSelection()
    } else if (event.key === 'ArrowRight') {
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
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      focusGridSlot(dayIndex, event.key === 'Home' ? 0 : slotMinutes.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      suppressNextClickRef.current = false
      chooseBoundary(displayDays[dayIndex], slotMinutes[timeIndex])
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

  useEffect(() => {
    function closeOutside(event: globalThis.PointerEvent) {
      if (event.target instanceof Node && !moreRef.current?.contains(event.target)) {
        moreRef.current?.removeAttribute('open')
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])

  const editableDates = displayDays.map((date) => ({
    value: date.toString(),
    day: date.day,
    label: koreanWeekdayFormatter.format(toLocalDate(date)),
    weekday: ![0, 6].includes(toLocalDate(date, 12 * 60).getUTCDay()),
    disabled: isOutsideWindow(date),
  }))

  return (
    <div className="time-picker availability-picker" data-preview-mode={preview?.mode}>
      <div className="time-picker__toolbar">
        <div className="time-picker__week-navigation" aria-label="주간 이동">
          {!(cannotGoPrevious && cannotGoNext) ? (
            <button
              type="button"
              aria-label="이전 주"
              disabled={cannotGoPrevious}
              onClick={() => changeWeek(-1)}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
          ) : null}
          <strong>
            {cannotGoPrevious && cannotGoNext
              ? `${windowStartDate.year}년 ${windowStartDate.month}월${windowStartDate.month !== windowEndDate.month ? ` – ${windowEndDate.year !== windowStartDate.year ? `${windowEndDate.year}년 ` : ''}${windowEndDate.month}월` : ''}`
              : weekLabel}
          </strong>
          {!(cannotGoPrevious && cannotGoNext) ? (
            <button
              type="button"
              aria-label="다음 주"
              disabled={cannotGoNext}
              onClick={() => changeWeek(1)}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="availability-tools">
          <div className="availability-entry-actions" aria-label="날짜와 시간으로 입력">
            <Button
              variant="secondary"
              size="compact"
              aria-haspopup="dialog"
              disabled={selectedMinutes === 0}
              onClick={() => {
                setEntryMode('exclude')
                setEntryOpen(true)
              }}
            >
              <Minus size={16} aria-hidden="true" />
              시간 제외
            </Button>
            <Button
              variant="secondary"
              size="compact"
              aria-haspopup="dialog"
              onClick={() => {
                setEntryMode('add')
                setEntryOpen(true)
              }}
            >
              <Plus size={16} aria-hidden="true" />
              시간 추가
            </Button>
          </div>
          <Button
            variant="quiet"
            size="icon"
            disabled={!history.length}
            onClick={undoChange}
            aria-label="마지막 시간 선택 되돌리기"
            title="되돌리기 (Ctrl/⌘ Z)"
          >
            <Undo2 size={18} aria-hidden="true" />
          </Button>
          <details
            className="availability-more"
            ref={moreRef}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                event.currentTarget.removeAttribute('open')
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.currentTarget.removeAttribute('open')
                event.currentTarget.querySelector('summary')?.focus()
              }
            }}
          >
            <summary aria-label="시간표 옵션" title="시간표 옵션">
              <MoreHorizontal size={20} aria-hidden="true" />
            </summary>
            <div className="availability-more__panel">
              <button
                type="button"
                aria-pressed={showFullDay}
                onClick={() => {
                  cancelDragSelection()
                  setShowFullDay((value) => !value)
                  setFocusedSlot({ dayIndex: 0, timeIndex: 0 })
                  closeMoreOptions()
                }}
              >
                {showFullDay ? '선택한 시간 중심으로 보기' : '24시간 전체 보기'}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetDefaultScope()
                  closeMoreOptions()
                }}
              >
                평일 9–18시로 복원
              </button>
              <button
                type="button"
                onClick={() => {
                  applyWindows(
                    meeting.availabilityWindows.filter((w) => w.ownerId !== meeting.hostId),
                  )
                  setPreview(null)
                  setAnnouncement('시간표를 비웠어요. 가능한 시간을 추가해 주세요.')
                  closeMoreOptions()
                }}
              >
                모든 시간 비우기
              </button>
            </div>
          </details>
        </div>
      </div>
      <div className="availability-grid-guide">
        <div className="availability-legend" aria-label="시간표 범례">
          <span className="availability-selection-key">
            <Check size={13} aria-hidden="true" />
            후보 시간
          </span>
          <span className="availability-excluded-key">
            <span aria-hidden="true" />
            제외된 시간
          </span>
        </div>
        <p>
          {usesDefaultHours
            ? isMobile
              ? '평일 9–18시를 선택했어요. 안 되는 시간만 빼세요.'
              : '평일 9–18시에서 안 되는 시간만 클릭·드래그해 빼세요.'
            : isMobile
              ? '시간을 누르면 선택하거나 해제해요.'
              : '클릭하거나 드래그해 시간을 추가·제외하세요.'}
        </p>
      </div>
      {entryOpen ? (
        <TimeRangeEntry
          initialMode={entryMode}
          weekLabel={weekLabel}
          dates={editableDates}
          onClose={() => setEntryOpen(false)}
          onApply={(dates, start, end, mode) => {
            editRange(dates, start, end, mode)
            setEntryOpen(false)
          }}
        />
      ) : null}
      {usableCandidateCount === 0 ? (
        <p className="availability-empty-hint" role="status">
          {selectedMinutes === 0
            ? '후보 시간이 없어요. 시간 추가를 누르거나 빈 칸을 선택해 주세요.'
            : `${formatMeetingDuration(meeting.durationMinutes)} 회의가 들어갈 연속된 시간이 필요해요.`}
        </p>
      ) : null}

      {isMobile ? (
        <div className="mobile-time-picker">
          <div className="mobile-date-strip" aria-label="날짜 선택">
            {displayDays.map((date) => {
              const isSelectedDate = date.compare(activeDate) === 0

              return (
                <button
                  key={date.toString()}
                  className={isSelectedDate ? 'is-selected' : ''}
                  aria-pressed={isSelectedDate}
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
            <h2 id="mobile-availability-title" className="sr-only">
              {koreanDateFormatter.format(toLocalDate(activeDate))}
            </h2>
            <div className="mobile-time-slot-list mobile-availability-list">
              {slotMinutes.map((startMinutes) => {
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
                    aria-label={`${formatTimeOfDay(startMinutes)}–${formatTimeOfDay(startMinutes + 30)}, 현재 ${selectedWindow != null ? '포함' : '제외'}, ${selectedWindow != null ? '제외하기' : '추가하기'}`}
                    onClick={() => chooseBoundary(activeDate, startMinutes)}
                  >
                    <span>
                      {formatTimeOfDay(startMinutes)}–{formatTimeOfDay(startMinutes + 30)}
                      <small>{selectedWindow != null ? '포함' : '제외'}</small>
                    </span>
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
            aria-label={`${weekLabel} 물어볼 시간 선택`}
            aria-describedby={helpId}
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
                <div
                  key={date.toString()}
                  role="columnheader"
                  data-disabled={isOutsideWindow(date)}
                >
                  <span>{koreanWeekdayFormatter.format(toLocalDate(date))}</span>
                  <strong>{date.day}</strong>
                </div>
              ))}
            </div>

            {slotMinutes.map((startMinutes, timeIndex) => (
              <div className="week-time-grid__row" role="row" key={startMinutes}>
                <span role="rowheader">{formatTimeOfDay(startMinutes)}</span>
                {displayDays.map((date, dayIndex) => {
                  const selectedWindow = windowOccupyingSlot(date, startMinutes)
                  const previewStartsHere =
                    preview != null &&
                    preview.dates.includes(date.toString()) &&
                    preview.startMinutes === startMinutes
                  const isPreviewSlot =
                    preview != null &&
                    preview.dates.includes(date.toString()) &&
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
                        data-range-start={
                          selectedWindow != null &&
                          (timeIndex === 0 ||
                            windowOccupyingSlot(date, startMinutes - TIME_QUANTUM_MINUTES) == null)
                        }
                        data-range-end={
                          selectedWindow != null &&
                          (timeIndex === slotMinutes.length - 1 ||
                            windowOccupyingSlot(date, startMinutes + TIME_QUANTUM_MINUTES) == null)
                        }
                        type="button"
                        data-availability-index={`${timeIndex}-${dayIndex}`}
                        data-availability-date={date.toString()}
                        data-start-minutes={startMinutes}
                        tabIndex={
                          (isOutsideWindow(displayDays[focusedSlot.dayIndex])
                            ? displayDays.findIndex((day) => !isOutsideWindow(day))
                            : focusedSlot.dayIndex) === dayIndex &&
                          Math.min(focusedSlot.timeIndex, slotMinutes.length - 1) === timeIndex
                            ? 0
                            : -1
                        }
                        aria-pressed={selectedWindow != null}
                        aria-label={`${koreanDateFormatter.format(toLocalDate(date))} ${formatTimeOfDay(startMinutes)}–${formatTimeOfDay(startMinutes + 30)}${selectedWindow != null ? `, ${formatAvailabilityWindow(selectedWindow)}에 포함됨` : ', 제외됨'}, ${selectedWindow != null ? '제외하기' : '추가하기'}`}
                        disabled={isOutsideWindow(date)}
                        onFocus={() => {
                          setFocusedSlot({ dayIndex, timeIndex })
                        }}
                        onMouseEnter={() => previewFrom(date, startMinutes)}
                        onBlur={() => {
                          if (!dragSelectionRef.current) setPreview(null)
                        }}
                        onKeyDown={(event) => handleGridKeyDown(event, dayIndex, timeIndex)}
                        onPointerDown={(event) => beginDragSelection(event, date, startMinutes)}
                        onClick={() => chooseBoundary(date, startMinutes)}
                      >
                        {selectedWindow != null &&
                        (timeIndex === 0 ||
                          windowOccupyingSlot(date, startMinutes - TIME_QUANTUM_MINUTES) ==
                            null) ? (
                          <Check className="availability-range-mark" size={13} aria-hidden="true" />
                        ) : null}
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="availability-feedback" role="status" aria-atomic="true">
        {announcement}
      </p>
      <p id={helpId} className="sr-only">
        방향키로 이동, Enter 또는 Space로 선택과 해제, Ctrl 또는 Command Z로 되돌리기.
      </p>
    </div>
  )
}
