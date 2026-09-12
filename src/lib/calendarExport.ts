import type { Candidate, Meeting } from '../domain/meeting'

function escapeCalendarText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}
export function buildCalendarEvent(meeting: Meeting, candidate: Candidate, now = new Date()) {
  const stamp = (value: string | Date) =>
    new Date(value)
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')
  return (
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MeetCue//Meeting//KO',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${meeting.id}-${candidate.id}@meetcue.local`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(candidate.startAt)}`,
      `DTEND:${stamp(candidate.endAt)}`,
      `SUMMARY:${escapeCalendarText(meeting.title)}`,
      `DESCRIPTION:${escapeCalendarText(meeting.purpose)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .map((line) => {
        // RFC 5545 content lines are folded at 75 octets, without splitting UTF-8 characters.
        let folded = ''
        let size = 0
        for (const char of line) {
          const bytes = new TextEncoder().encode(char).length
          if (size + bytes > 75) {
            folded += '\r\n '
            size = 1
          }
          folded += char
          size += bytes
        }
        return folded
      })
      .join('\r\n') + '\r\n'
  )
}
export function downloadCalendarEvent(meeting: Meeting, candidate: Candidate) {
  const url = URL.createObjectURL(
    new Blob([buildCalendarEvent(meeting, candidate)], { type: 'text/calendar;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `${meeting.title.replace(/[/\\:*?"<>|]/g, '-') || 'meeting'}.ics`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
