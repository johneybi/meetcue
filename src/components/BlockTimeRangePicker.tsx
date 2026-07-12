import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useMemo,
  useRef,
  useState,
} from 'react'
import { GripHorizontal, X } from 'lucide-react'
import './BlockTimeRangePicker.css'

export type BlockTimeRange = {
  id: string
  dayKey: string
  startMinutes: number
  endMinutes: number
  tone?: 'available' | 'adjustable' | 'unavailable' | 'calendar'
  label?: string
  description?: string
  readOnly?: boolean
}

export type BlockTimeRangeDay = {
  key: string
  label: string
}

type DraftSelection = {
  dayKey: string
  anchorMinutes: number
  edgeMinutes: number
  moved: boolean
  sourceRangeId?: string
}

type ResizeSelection = {
  rangeId: string
  edge: 'start' | 'end'
}

export type BlockTimeRangePickerProps = {
  days: BlockTimeRangeDay[]
  ranges: BlockTimeRange[]
  onChange: (ranges: BlockTimeRange[]) => void
  startMinutes?: number
  endMinutes?: number
  stepMinutes?: number
  defaultDurationMinutes?: number
  ariaLabel?: string
  newRangeTone?: BlockTimeRange['tone']
  newRangeLabel?: string
  onReadOnlyRangeClick?: (range: BlockTimeRange) => void
  isSlotDisabled?: (dayKey: string, minutes: number) => boolean
  onRangeSelect?: (range: BlockTimeRange) => void
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function overlaps(left: BlockTimeRange, right: BlockTimeRange) {
  return (
    left.dayKey === right.dayKey &&
    left.startMinutes < right.endMinutes &&
    right.startMinutes < left.endMinutes
  )
}

export function BlockTimeRangePicker({
  days,
  ranges,
  onChange,
  startMinutes = 9 * 60,
  endMinutes = 18 * 60,
  stepMinutes = 30,
  defaultDurationMinutes = 60,
  ariaLabel = '블록형 시간 범위 선택',
  newRangeTone = 'available',
  newRangeLabel = '가능해요',
  onReadOnlyRangeClick,
  isSlotDisabled,
  onRangeSelect,
}: BlockTimeRangePickerProps) {
  const [draft, setDraft] = useState<DraftSelection | null>(null)
  const [resize, setResize] = useState<ResizeSelection | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const slots = useMemo(() => {
    const result: number[] = []
    for (let value = startMinutes; value < endMinutes; value += stepMinutes) result.push(value)
    return result
  }, [endMinutes, startMinutes, stepMinutes])

  function rangeFromDraft(selection: DraftSelection): BlockTimeRange {
    const sourceRange = selection.sourceRangeId
      ? ranges.find((range) => range.id === selection.sourceRangeId)
      : null
    if (sourceRange && !selection.moved) return { ...sourceRange }
    const draggedStart = Math.min(selection.anchorMinutes, selection.edgeMinutes)
    const draggedEnd = Math.max(selection.anchorMinutes, selection.edgeMinutes) + stepMinutes
    const requestedEnd = selection.moved
      ? draggedEnd
      : draggedStart + Math.max(stepMinutes, defaultDurationMinutes)

    return {
      id: `block-${selection.dayKey}-${draggedStart}`,
      dayKey: selection.dayKey,
      startMinutes: draggedStart,
      endMinutes: Math.min(endMinutes, requestedEnd),
      tone: newRangeTone,
      label: newRangeLabel,
    }
  }

  function canUseRange(candidate: BlockTimeRange, ignoredId?: string) {
    for (let minutes = candidate.startMinutes; minutes < candidate.endMinutes; minutes += stepMinutes) {
      if (isSlotDisabled?.(candidate.dayKey, minutes)) return false
    }
    return !ranges.some((range) => range.id !== ignoredId && overlaps(candidate, range))
  }

  function slotFromPointer(event: ReactPointerEvent) {
    const root = rootRef.current
    if (root == null || days.length === 0) return null
    const rect = root.getBoundingClientRect()
    const columnWidth = (rect.width - 52) / days.length
    const dayIndex = Math.floor((event.clientX - rect.left - 52) / columnWidth)
    const rowIndex = Math.floor((event.clientY - rect.top - 60) / 48)
    if (dayIndex < 0 || dayIndex >= days.length || rowIndex < 0 || rowIndex >= slots.length) {
      return null
    }
    return { dayKey: days[dayIndex].key, minutes: slots[rowIndex] }
  }

  function beginBlock(event: ReactPointerEvent, dayKey: string, minutes: number) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDraft({ dayKey, anchorMinutes: minutes, edgeMinutes: minutes, moved: false })
  }

  function beginRangeSelection(event: ReactPointerEvent, range: BlockTimeRange) {
    if (event.button !== 0 || resize != null) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const slot = slotFromPointer(event)
    const minutes = slot?.minutes ?? range.startMinutes
    setDraft({
      dayKey: range.dayKey,
      anchorMinutes: minutes,
      edgeMinutes: minutes,
      moved: false,
      sourceRangeId: range.id,
    })
  }

  function updatePointer(event: ReactPointerEvent) {
    const slot = slotFromPointer(event)
    if (slot == null) return

    if (draft != null && slot.dayKey === draft.dayKey) {
      setDraft((current) =>
        current == null
          ? null
          : {
              ...current,
              edgeMinutes: slot.minutes,
              moved: current.moved || slot.minutes !== current.anchorMinutes,
            },
      )
      return
    }

    if (resize != null) {
      const current = ranges.find((range) => range.id === resize.rangeId)
      if (current == null || current.dayKey !== slot.dayKey) return
      const next =
        resize.edge === 'start'
          ? { ...current, startMinutes: Math.min(slot.minutes, current.endMinutes - stepMinutes) }
          : {
              ...current,
              endMinutes: Math.max(slot.minutes + stepMinutes, current.startMinutes + stepMinutes),
            }
      if (canUseRange(next, current.id)) {
        onChange(ranges.map((range) => (range.id === current.id ? next : range)))
      }
    }
  }

  function finishPointer() {
    if (draft != null) {
      const candidate = rangeFromDraft(draft)
      if (onRangeSelect && candidate.endMinutes > candidate.startMinutes) {
        onRangeSelect(candidate)
      } else if (candidate.endMinutes > candidate.startMinutes && canUseRange(candidate)) {
        onChange([...ranges, candidate])
      }
    }
    setDraft(null)
    setResize(null)
  }

  function addWithKeyboard(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    dayKey: string,
    minutes: number,
  ) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    const candidate = rangeFromDraft({
      dayKey,
      anchorMinutes: minutes,
      edgeMinutes: minutes,
      moved: false,
    })
    if (canUseRange(candidate)) onChange([...ranges, candidate])
  }

  function beginResize(event: ReactPointerEvent, rangeId: string, edge: 'start' | 'end') {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setResize({ rangeId, edge })
  }

  const preview = draft == null ? null : rangeFromDraft(draft)

  return (
    <div
      ref={rootRef}
      className="block-time-range-picker"
      style={{ '--block-day-count': days.length } as CSSProperties}
      role="grid"
      aria-label={ariaLabel}
      onPointerMove={updatePointer}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
    >
      <span
        className="block-time-range-picker__corner"
        style={{ gridColumn: 1, gridRow: 1 }}
        aria-hidden="true"
      />
      {days.map((day, dayIndex) => (
        <strong
          className="block-time-range-picker__day"
          style={{ gridColumn: dayIndex + 2, gridRow: 1 }}
          role="columnheader"
          key={day.key}
        >
          {day.label}
        </strong>
      ))}

      {slots.map((minutes, rowIndex) => (
        <div className="block-time-range-picker__row" role="row" key={minutes}>
          <span role="rowheader" style={{ gridColumn: 1, gridRow: rowIndex + 2 }}>
            {formatMinutes(minutes)}
          </span>
          {days.map((day, dayIndex) => (
            <button
              key={day.key}
              type="button"
              className="block-time-range-picker__slot"
              style={{ gridColumn: dayIndex + 2, gridRow: rowIndex + 2 }}
              data-block-day={day.key}
              data-block-minutes={minutes}
              aria-label={`${day.label} ${formatMinutes(minutes)}에 블록 추가`}
              disabled={isSlotDisabled?.(day.key, minutes)}
              onPointerDown={(event) => beginBlock(event, day.key, minutes)}
              onKeyDown={(event) => addWithKeyboard(event, day.key, minutes)}
            />
          ))}
        </div>
      ))}

      {[...ranges, ...(preview == null ? [] : [{ ...preview, id: 'block-preview' }])].map(
        (range) => {
          const dayIndex = days.findIndex((day) => day.key === range.dayKey)
          if (dayIndex < 0) return null
          const startRow = Math.floor((range.startMinutes - startMinutes) / stepMinutes) + 2
          const rowSpan = Math.max(1, (range.endMinutes - range.startMinutes) / stepMinutes)
          const isPreview = range.id === 'block-preview'

          return (
            <div
              key={range.id}
              className={`block-time-range-picker__block is-${range.tone ?? 'available'}${
                isPreview ? ' is-preview' : ''
              }${range.readOnly ? ' is-read-only' : ''}`}
              style={{
                gridColumn: dayIndex + 2,
                gridRow: `${startRow} / span ${rowSpan}`,
              }}
              aria-label={`${formatMinutes(range.startMinutes)}부터 ${formatMinutes(range.endMinutes)}`}
              onPointerDown={(event) => beginRangeSelection(event, range)}
            >
              {isPreview ? null : range.readOnly ? (
                <button
                  type="button"
                  className="block-time-range-picker__override"
                  aria-label={`${range.label ?? '캘린더 일정'} 응답 변경`}
                  onClick={() => {
                    if (!onRangeSelect) onReadOnlyRangeClick?.(range)
                  }}
                >
                  <strong>{range.label}</strong>
                  {range.description ? <small>{range.description}</small> : null}
                  <span>이번 회의 응답 변경</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="block-time-range-picker__handle is-start"
                    aria-label="시작 시간 조절"
                    onPointerDown={(event) => beginResize(event, range.id, 'start')}
                  >
                    <GripHorizontal size={14} aria-hidden="true" />
                  </button>
                  <span>
                    <strong>{range.label}</strong>
                    <small>{formatMinutes(range.startMinutes)}–{formatMinutes(range.endMinutes)}</small>
                  </span>
                  <button
                    type="button"
                    className="block-time-range-picker__remove"
                    aria-label="시간 블록 삭제"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => onChange(ranges.filter((item) => item.id !== range.id))}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="block-time-range-picker__handle is-end"
                    aria-label="종료 시간 조절"
                    onPointerDown={(event) => beginResize(event, range.id, 'end')}
                  >
                    <GripHorizontal size={14} aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          )
        },
      )}
    </div>
  )
}
