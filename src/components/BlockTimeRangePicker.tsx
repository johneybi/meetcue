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
    }
  }

  function canUseRange(candidate: BlockTimeRange, ignoredId?: string) {
    return !ranges.some((range) => range.id !== ignoredId && overlaps(candidate, range))
  }

  function slotFromPointer(event: ReactPointerEvent) {
    const root = rootRef.current
    if (root == null || days.length === 0) return null
    const rect = root.getBoundingClientRect()
    const columnWidth = (rect.width - 56) / days.length
    const dayIndex = Math.floor((event.clientX - rect.left - 56) / columnWidth)
    const rowIndex = Math.floor((event.clientY - rect.top - 56) / 48)
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
      if (candidate.endMinutes > candidate.startMinutes && canUseRange(candidate)) {
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
      <span className="block-time-range-picker__corner" aria-hidden="true" />
      {days.map((day) => (
        <strong className="block-time-range-picker__day" role="columnheader" key={day.key}>
          {day.label}
        </strong>
      ))}

      {slots.map((minutes) => (
        <div className="block-time-range-picker__row" role="row" key={minutes}>
          <span role="rowheader">{formatMinutes(minutes)}</span>
          {days.map((day) => (
            <button
              key={day.key}
              type="button"
              className="block-time-range-picker__slot"
              data-block-day={day.key}
              data-block-minutes={minutes}
              aria-label={`${day.label} ${formatMinutes(minutes)}에 블록 추가`}
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
              className={`block-time-range-picker__block${isPreview ? ' is-preview' : ''}`}
              style={{
                gridColumn: dayIndex + 2,
                gridRow: `${startRow} / span ${rowSpan}`,
              }}
              aria-label={`${formatMinutes(range.startMinutes)}부터 ${formatMinutes(range.endMinutes)}`}
            >
              {isPreview ? null : (
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
                    {formatMinutes(range.startMinutes)}–{formatMinutes(range.endMinutes)}
                  </span>
                  <button
                    type="button"
                    className="block-time-range-picker__remove"
                    aria-label="시간 블록 삭제"
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
