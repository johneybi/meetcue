import type { AvailabilityWindow, Candidate, MeetingDuration } from './meeting'

const TIME_QUANTUM_MINUTES = 30

export function deriveCandidatesFromAvailabilityWindows(
  meetingId: string,
  windows: AvailabilityWindow[],
  durationMinutes: MeetingDuration | null,
): Candidate[] {
  if (durationMinutes == null) {
    return []
  }

  const durationMs = durationMinutes * 60 * 1000
  const quantumMs = TIME_QUANTUM_MINUTES * 60 * 1000
  const candidates = new Map<number, Candidate>()

  windows
    .filter((window) => window.state === 'available')
    .forEach((window) => {
      const windowStart = new Date(window.startAt).getTime()
      const windowEnd = new Date(window.endAt).getTime()

      for (let start = windowStart; start + durationMs <= windowEnd; start += quantumMs) {
        candidates.set(start, {
          id: `c-derived-${start}-${durationMinutes}`,
          meetingId,
          startAt: new Date(start).toISOString(),
          endAt: new Date(start + durationMs).toISOString(),
        })
      }
    })

  return [...candidates.values()].sort(
    (left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
  )
}

export function mergeAvailabilityWindows(windows: AvailabilityWindow[]) {
  const sorted = [...windows].sort(
    (left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
  )
  const merged: AvailabilityWindow[] = []

  sorted.forEach((window) => {
    const previous = merged[merged.length - 1]

    if (
      previous != null &&
      previous.ownerId === window.ownerId &&
      previous.state === window.state &&
      isSameLocalDate(previous.startAt, window.startAt) &&
      new Date(window.startAt).getTime() <= new Date(previous.endAt).getTime()
    ) {
      previous.endAt = new Date(
        Math.max(new Date(previous.endAt).getTime(), new Date(window.endAt).getTime()),
      ).toISOString()
      return
    }

    merged.push({ ...window })
  })

  return merged
}

function isSameLocalDate(left: string, right: string) {
  const leftDate = new Date(left)
  const rightDate = new Date(right)

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  )
}
