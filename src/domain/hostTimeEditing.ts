import { mergeAvailabilityWindows, removeAvailabilityRange } from './availability.ts'
import type { AvailabilityWindow, SchedulingWindow } from './meeting.ts'

export type TimeEditMode = 'exclude' | 'add'
export const TIME_STEP = 30
export const DAY_MINUTES = 24 * 60
const zone = 'Asia/Seoul'
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: zone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: zone,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export const koreanDateKey = (date: Date) => dateFormatter.format(date)
export const clockLabel = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
export const koreanDateTime = (date: string, minutes = 0) =>
  new Date(new Date(`${date}T00:00:00+09:00`).getTime() + minutes * 60_000)

/** One transaction across dates; unrelated dates and attendees are preserved. */
export function applyHostTimeRange({
  windows,
  meetingId,
  hostId,
  dates,
  startMinutes,
  endMinutes,
  mode,
  schedulingWindow,
}: {
  windows: AvailabilityWindow[]
  meetingId: string
  hostId: string
  dates: string[]
  startMinutes: number
  endMinutes: number
  mode: TimeEditMode
  schedulingWindow: SchedulingWindow
}): AvailabilityWindow[] {
  if (
    !Number.isInteger(startMinutes) ||
    !Number.isInteger(endMinutes) ||
    startMinutes < 0 ||
    endMinutes > DAY_MINUTES ||
    startMinutes >= endMinutes ||
    startMinutes % TIME_STEP !== 0 ||
    endMinutes % TIME_STEP !== 0
  ) {
    throw new RangeError('같은 날의 시작·종료 시간을 30분 단위로 입력해 주세요.')
  }
  const uniqueDates = [...new Set(dates)]
  if (
    uniqueDates.some((date) => {
      const parsed = koreanDateTime(date)
      return (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(parsed.getTime()) ||
        koreanDateKey(parsed) !== date ||
        date < schedulingWindow.startDate ||
        date > schedulingWindow.endDate
      )
    })
  )
    throw new RangeError('회의 날짜 범위 안에서 선택해 주세요.')

  let own = windows.filter((w) => w.ownerId === hostId)
  for (const date of uniqueDates) {
    const startAt = koreanDateTime(date, startMinutes).toISOString()
    const endAt = koreanDateTime(date, endMinutes).toISOString()
    if (
      mode === 'add' &&
      own.some(
        (w) =>
          w.state === 'available' && !w.avoidPreferred && w.startAt <= startAt && w.endAt >= endAt,
      )
    )
      continue
    own = removeAvailabilityRange(own, hostId, { startAt, endAt })
    if (mode === 'add')
      own.push({
        id: `aw-${hostId}-${new Date(startAt).getTime()}`,
        meetingId,
        ownerId: hostId,
        startAt,
        endAt,
        state: 'available',
      })
  }
  return [...windows.filter((w) => w.ownerId !== hostId), ...mergeAvailabilityWindows(own)]
}

export function hostTimeBounds(windows: AvailabilityWindow[], hostId: string) {
  let start = 9 * 60
  let end = 18 * 60
  for (const w of windows.filter((w) => w.ownerId === hostId && w.state === 'available')) {
    const first = new Date(w.startAt)
    const last = new Date(new Date(w.endAt).getTime() - 1)
    if (koreanDateKey(first) !== koreanDateKey(last)) return { start: 0, end: DAY_MINUTES }
    const minute = (d: Date) => {
      const [h, m] = timeFormatter.format(d).split(':').map(Number)
      return h * 60 + m
    }
    start = Math.min(start, Math.floor(minute(first) / TIME_STEP) * TIME_STEP)
    end = Math.max(end, Math.ceil((minute(last) + 1) / TIME_STEP) * TIME_STEP)
  }
  return { start, end }
}
