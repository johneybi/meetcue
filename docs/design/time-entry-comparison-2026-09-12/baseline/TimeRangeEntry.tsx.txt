import { useId, useState } from 'react'
import { Check } from 'lucide-react'
import { clockLabel, DAY_MINUTES, TIME_STEP, type TimeEditMode } from '../domain/hostTimeEditing'
import { Button } from './ui/button'
import { Dialog } from './ui/dialog'
import './TimeRangeEntry.css'

export type EditableDate = {
  value: string
  label: string
  day: number
  weekday: boolean
  disabled: boolean
}
const times = Array.from({ length: DAY_MINUTES / TIME_STEP + 1 }, (_, i) => i * TIME_STEP)

export function TimeRangeEntry({
  dates,
  initialMode,
  weekLabel,
  onApply,
  onClose,
}: {
  dates: EditableDate[]
  initialMode: TimeEditMode
  weekLabel: string
  onApply: (dates: string[], start: number, end: number, mode: TimeEditMode) => void
  onClose: () => void
}) {
  const id = useId()
  const mode = initialMode
  const [selected, setSelected] = useState(() => {
    const weekdays = dates.filter((d) => d.weekday && !d.disabled)
    return (weekdays.length ? weekdays : dates.filter((d) => !d.disabled)).map((d) => d.value)
  })
  const [start, setStart] = useState(initialMode === 'exclude' ? 720 : 540)
  const [end, setEnd] = useState(initialMode === 'exclude' ? 780 : 1080)
  const chosen = dates.filter((d) => selected.includes(d.value) && !d.disabled)
  const allSelected = chosen.length === dates.filter((d) => !d.disabled).length
  const error = !chosen.length
    ? '날짜를 하나 이상 골라주세요.'
    : end <= start
      ? '종료 시간을 시작 시간보다 늦게 정해 주세요.'
      : ''
  const verb = mode === 'exclude' ? '제외' : '추가'
  return (
    <Dialog
      title={mode === 'exclude' ? '제외할 시간을 알려주세요' : '추가할 시간을 알려주세요'}
      description={
        mode === 'exclude'
          ? '선택한 후보에서 점심·부재 시간을 빼요. 나머지 시간은 유지돼요.'
          : '참석자에게 제안할 시간을 더해요. 기존 후보는 유지돼요.'
      }
      onClose={onClose}
    >
      <form
        className="time-range-entry"
        aria-label="여러 날짜에 시간 범위 입력"
        onSubmit={(event) => {
          event.preventDefault()
          if (!error)
            onApply(
              chosen.map((d) => d.value),
              start,
              end,
              mode,
            )
        }}
      >
        <fieldset
          className="time-range-dates"
          aria-describedby={!chosen.length ? `${id}-error` : undefined}
        >
          <legend>{weekLabel}</legend>
          <button
            className="time-range-select-all"
            type="button"
            onClick={() =>
              setSelected(allSelected ? [] : dates.filter((d) => !d.disabled).map((d) => d.value))
            }
          >
            {allSelected ? '전체 해제' : '전체 선택'}
          </button>
          <div className="time-range-date-options">
            {dates.map((date) => (
              <label key={date.value}>
                <input
                  type="checkbox"
                  checked={chosen.some((d) => d.value === date.value)}
                  disabled={date.disabled}
                  aria-label={`${date.value} ${date.label} 적용`}
                  onChange={() =>
                    setSelected((s) =>
                      s.includes(date.value)
                        ? s.filter((d) => d !== date.value)
                        : [...s, date.value],
                    )
                  }
                />
                <span>
                  <small>{date.label}</small>
                  <strong>{date.day}</strong>
                  <Check size={12} aria-hidden="true" />
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="time-range-fields">
          <label htmlFor={`${id}-start`}>
            시작 시간
            <select
              id={`${id}-start`}
              value={start}
              onChange={(e) => {
                const next = Number(e.target.value)
                setStart(next)
                if (next >= end) setEnd(Math.min(next + 60, DAY_MINUTES))
              }}
            >
              {times.slice(0, -1).map((t) => (
                <option key={t} value={t}>
                  {clockLabel(t)}
                </option>
              ))}
            </select>
          </label>
          <span aria-hidden="true">–</span>
          <label htmlFor={`${id}-end`}>
            종료 시간
            <select
              id={`${id}-end`}
              value={end}
              aria-invalid={end <= start}
              aria-describedby={end <= start ? `${id}-error` : undefined}
              onChange={(e) => setEnd(Number(e.target.value))}
            >
              {times.slice(1).map((t) => (
                <option key={t} value={t}>
                  {t === DAY_MINUTES ? '24:00 (자정)' : clockLabel(t)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <footer className="time-range-apply">
          <p id={`${id}-error`} className={error ? 'is-error' : ''} aria-live="polite">
            {error || `${chosen.length}개 날짜 · ${clockLabel(start)}–${clockLabel(end)} ${verb}`}
          </p>
          <Button type="submit" width="full" disabled={Boolean(error)}>
            {verb}하기
          </Button>
        </footer>
      </form>
    </Dialog>
  )
}
