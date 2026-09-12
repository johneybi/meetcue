import { cn } from '../../lib/utils'

const zone = 'Asia/Seoul'
const monthFormat = new Intl.DateTimeFormat('ko-KR', { timeZone: zone, month: 'short' })
const dayFormat = new Intl.DateTimeFormat('en-GB', { timeZone: zone, day: '2-digit' })
const weekdayFormat = new Intl.DateTimeFormat('ko-KR', { timeZone: zone, weekday: 'short' })
const dateFormat = new Intl.DateTimeFormat('ko-KR', { timeZone: zone, month: 'long', day: 'numeric', weekday: 'long' })
const timeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** Calendar typography uses the meeting's display timezone, never the device timezone. */
export function CalendarDate({ value, compact = false, className }: {
  value: string
  compact?: boolean
  className?: string
}) {
  const date = new Date(value)
  return compact ? (
    <time dateTime={value} className={cn('mc-calendar-date', className)} aria-label={dateFormat.format(date)}>
      <small>{monthFormat.format(date)}</small>
      <strong>{dayFormat.format(date)}</strong>
      <small>{weekdayFormat.format(date)}</small>
    </time>
  ) : <time dateTime={value} className={className}>{dateFormat.format(date)}</time>
}

export function TimeRange({ start, end, className }: { start: string; end: string; className?: string }) {
  return (
    <span className={cn('mc-time-range', className)}>
      <time dateTime={start}>{timeFormat.format(new Date(start))}</time>
      <span className="mc-time-range__separator" aria-hidden="true">—</span>
      <span className="sr-only">부터 </span>
      <time dateTime={end}>{timeFormat.format(new Date(end))}</time>
      <span className="sr-only">까지</span>
    </span>
  )
}
