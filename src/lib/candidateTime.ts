const candidateDateFormat = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Asia/Seoul',
})

const candidateTimePartsFormat = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Seoul',
})

export function getCandidateDateKey(value: string) {
  return candidateDateFormat.format(new Date(value))
}

export function getCandidateMinuteOfDay(value: string) {
  const parts = candidateTimePartsFormat.formatToParts(new Date(value))
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

export function formatCandidateMinutes(minutes: number) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  const period = hour < 12 ? '오전' : '오후'
  const displayHour = hour % 12 || 12
  return `${period} ${displayHour}:${String(minute).padStart(2, '0')}`
}

function candidateDateFromKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00+09:00`)
}

export function formatCandidateWeekday(dateKey: string) {
  return new Intl.DateTimeFormat('ko-KR', { weekday: 'short', timeZone: 'Asia/Seoul' }).format(
    candidateDateFromKey(dateKey),
  )
}

export function formatCandidateDay(dateKey: string) {
  return new Intl.DateTimeFormat('ko-KR', { day: 'numeric', timeZone: 'Asia/Seoul' }).format(
    candidateDateFromKey(dateKey),
  )
}

export function formatCandidateFullDate(dateKey: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'Asia/Seoul',
  }).format(candidateDateFromKey(dateKey))
}

export function formatCandidateStartTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Seoul',
  }).format(new Date(value))
}
