import { useState } from 'react'
import { parseDate } from '@internationalized/date'
import { Check, Minus, Plus, Undo2 } from 'lucide-react'
import {
  applyHostTimeRange,
  clockLabel,
  koreanDateTime,
  type TimeEditMode,
} from '../domain/hostTimeEditing'
import type { AvailabilityWindow } from '../domain/meeting'
import { AvailabilityWindowPicker, type MeetingWithDuration } from './AvailabilityWindowPicker'
import { TimeRangeEntry, type EditableDate } from './TimeRangeEntry'
import { Button } from './ui/button'
import './RangeFirstTimePicker.css'

const times = Array.from({ length: 49 }, (_, i) => i * 30)
const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short', timeZone: 'Asia/Seoul' })

export function RangeFirstTimePicker({
  meeting,
  onChange,
  onReady,
}: {
  meeting: MeetingWithDuration
  onChange: (windows: AvailabilityWindow[]) => void
  onReady: () => void
}) {
  const first = parseDate(meeting.schedulingWindow.startDate)
  const last = parseDate(meeting.schedulingWindow.endDate)
  const dates: EditableDate[] = []
  for (let d = first; d.compare(last) <= 0; d = d.add({ days: 1 })) {
    dates.push({
      value: d.toString(),
      label: weekday.format(koreanDateTime(d.toString())),
      day: d.day,
      weekday: true,
      disabled: false,
    })
  }
  const [selected, setSelected] = useState(dates.map((d) => d.value))
  const [start, setStart] = useState(540)
  const [end, setEnd] = useState(1080)
  const [ready, setReady] = useState(false)
  const [entry, setEntry] = useState<TimeEditMode | null>(null)
  const [history, setHistory] = useState<AvailabilityWindow[][]>([])
  const [notice, setNotice] = useState('')
  const own = meeting.availabilityWindows.filter(
    (w) => w.ownerId === meeting.hostId && w.state === 'available',
  )
  const invalid = !selected.length
    ? '날짜를 하나 이상 골라주세요.'
    : end <= start
      ? '종료 시간을 시작 시간보다 늦게 정해 주세요.'
      : ''
  function update(windows: AvailabilityWindow[]) {
    setHistory((h) => [...h, meeting.availabilityWindows])
    onChange(windows)
  }
  return (
    <section className="range-first" aria-label="범위와 예외로 시간 정하기">
      {!ready ? (
        <form
          className="range-first__base time-range-entry"
          onSubmit={(e) => {
            e.preventDefault()
            if (invalid) return
            update(
              applyHostTimeRange({
                windows: meeting.availabilityWindows.filter((w) => w.ownerId !== meeting.hostId),
                meetingId: meeting.id,
                hostId: meeting.hostId,
                schedulingWindow: meeting.schedulingWindow,
                dates: selected,
                startMinutes: start,
                endMinutes: end,
                mode: 'add',
              }),
            )
            setReady(true)
            onReady()
            setNotice('기본 범위를 정했어요. 아래에서 최종 시간을 확인하고 예외를 빼세요.')
          }}
        >
          <header>
            <h2>먼저, 넓게 잡아볼까요?</h2>
            <p>같은 시간대를 여러 날짜에 한 번에 정해요.</p>
          </header>
          <fieldset className="time-range-dates">
            <legend>물어볼 날짜</legend>
            <div className="time-range-date-options">
              {dates.map((d) => (
                <label key={d.value}>
                  <input
                    type="checkbox"
                    checked={selected.includes(d.value)}
                    aria-label={`${d.label}요일 ${d.day}일`}
                    onChange={() =>
                      setSelected((s) =>
                        s.includes(d.value) ? s.filter((v) => v !== d.value) : [...s, d.value],
                      )
                    }
                  />
                  <span>
                    <small>{d.label}</small>
                    <strong>{d.day}</strong>
                    <Check size={12} aria-hidden="true" />
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="time-range-fields">
            <label>
              시작 시간
              <select
                value={start}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  setStart(n)
                  if (n >= end) setEnd(Math.min(n + 60, 1440))
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
            <label>
              종료 시간
              <select
                value={end}
                aria-invalid={end <= start}
                aria-describedby={invalid ? 'range-base-error' : undefined}
                onChange={(e) => setEnd(Number(e.target.value))}
              >
                {times.slice(1).map((t) => (
                  <option key={t} value={t}>
                    {clockLabel(t)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {invalid && (
            <p id="range-base-error" role="status">
              {invalid}
            </p>
          )}
          <Button type="submit" disabled={Boolean(invalid)} width="full">
            이 범위로 시작하기
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              update(meeting.availabilityWindows.filter((w) => w.ownerId !== meeting.hostId))
              setReady(true)
              onReady()
              setNotice('빈 범위에서 시작해요. 물어볼 시간을 추가해 주세요.')
            }}
          >
            가능한 시간이 적어요 · 빈 범위에서 시작
          </Button>
        </form>
      ) : (
        <>
          <header className="range-first__heading">
            <div>
              <h2>{own.length ? '안 되는 시간만 빼주세요' : '물어볼 시간을 추가해 주세요'}</h2>
              <p>아래 남은 시간을 참석자에게 물어봐요.</p>
            </div>
            <Button
              variant="quiet"
              size="icon"
              aria-label="마지막 범위 수정 되돌리기"
              disabled={!history.length}
              onClick={() => {
                onChange(history.at(-1)!)
                setHistory((h) => h.slice(0, -1))
                setNotice('직전 시간 범위로 되돌렸어요.')
              }}
            >
              <Undo2 size={18} />
            </Button>
          </header>
          <div className="range-first__actions">
            <Button
              variant="secondary"
              aria-haspopup="dialog"
              disabled={!own.length}
              onClick={() => setEntry('exclude')}
            >
              <Minus size={16} />
              시간 제외
            </Button>
            <Button variant="quiet" aria-haspopup="dialog" onClick={() => setEntry('add')}>
              <Plus size={16} />
              시간 추가
            </Button>
          </div>
          <dl className="range-first__days" aria-label="참석자에게 물어볼 최종 시간">
            {dates.map((d) => {
              const dayStart = koreanDateTime(d.value).getTime()
              const rows = own.filter(
                (w) =>
                  new Date(w.startAt).getTime() < dayStart + 86400000 &&
                  new Date(w.endAt).getTime() > dayStart,
              )
              return (
                <div key={d.value}>
                  <dt>
                    <strong>{d.label}</strong>
                    <span>{d.day}일</span>
                  </dt>
                  <dd>
                    {rows.length ? (
                      rows.map((w) => (
                        <span key={w.id}>
                          {clockLabel(
                            Math.max(0, (new Date(w.startAt).getTime() - dayStart) / 60000),
                          )}
                          –
                          {clockLabel(
                            Math.min(1440, (new Date(w.endAt).getTime() - dayStart) / 60000),
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="range-first__empty">물어보지 않아요</span>
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
          <details className="range-first__grid">
            <summary>시간표에서 세밀하게 수정</summary>
            <AvailabilityWindowPicker meeting={meeting} onAvailabilityWindowsChange={update} />
          </details>
        </>
      )}
      <p className="range-first__notice" role="status" aria-atomic="true">
        {notice}
      </p>
      {entry && (
        <TimeRangeEntry
          initialMode={entry}
          dates={dates}
          weekLabel={`${first.month}월 ${first.day}–${last.day}일`}
          onClose={() => setEntry(null)}
          onApply={(days, begin, finish, mode) => {
            update(
              applyHostTimeRange({
                windows: meeting.availabilityWindows,
                meetingId: meeting.id,
                hostId: meeting.hostId,
                schedulingWindow: meeting.schedulingWindow,
                dates: days,
                startMinutes: begin,
                endMinutes: finish,
                mode,
              }),
            )
            setEntry(null)
            setNotice(
              `${days.length}개 날짜의 ${clockLabel(begin)}–${clockLabel(finish)}를 ${mode === 'add' ? '추가' : '제외'}했어요.`,
            )
          }}
        />
      )}
    </section>
  )
}
