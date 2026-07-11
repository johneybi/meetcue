import type {
  AvailabilityWindow,
  Candidate,
  MeetingDuration,
  Response,
  ResponseUpdateSource,
  ResponseValue,
} from './meeting'

const TIME_QUANTUM_MINUTES = 30

export interface AvailabilitySlot {
  startAt: string
  endAt: string
}

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

export function deriveAvailabilitySlots(
  windows: AvailabilityWindow[],
  ownerId: string,
): AvailabilitySlot[] {
  const quantumMs = TIME_QUANTUM_MINUTES * 60 * 1000
  const slots = new Map<number, AvailabilitySlot>()

  windows
    .filter((window) => window.ownerId === ownerId && window.state === 'available')
    .forEach((window) => {
      const start = new Date(window.startAt).getTime()
      const end = new Date(window.endAt).getTime()

      for (let slotStart = start; slotStart + quantumMs <= end; slotStart += quantumMs) {
        slots.set(slotStart, {
          startAt: new Date(slotStart).toISOString(),
          endAt: new Date(slotStart + quantumMs).toISOString(),
        })
      }
    })

  return [...slots.values()].sort(
    (left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
  )
}

export function getAvailabilityStateForSlot(
  windows: AvailabilityWindow[],
  ownerId: string,
  slot: AvailabilitySlot,
): ResponseValue | undefined {
  const slotStart = new Date(slot.startAt).getTime()
  const slotEnd = new Date(slot.endAt).getTime()

  return windows.find((window) => {
    if (window.ownerId !== ownerId) return false

    return (
      new Date(window.startAt).getTime() <= slotStart && new Date(window.endAt).getTime() >= slotEnd
    )
  })?.state
}

export function deriveParticipantResponses(
  participantId: string,
  candidates: Candidate[],
  windows: AvailabilityWindow[],
  updatedAt: string,
  updateSource: ResponseUpdateSource = 'participant_edit',
): Response[] {
  const quantumMs = TIME_QUANTUM_MINUTES * 60 * 1000

  return candidates.flatMap((candidate) => {
    const states: Array<ResponseValue | undefined> = []
    const candidateStart = new Date(candidate.startAt).getTime()
    const candidateEnd = new Date(candidate.endAt).getTime()

    for (let slotStart = candidateStart; slotStart < candidateEnd; slotStart += quantumMs) {
      states.push(
        getAvailabilityStateForSlot(windows, participantId, {
          startAt: new Date(slotStart).toISOString(),
          endAt: new Date(Math.min(slotStart + quantumMs, candidateEnd)).toISOString(),
        }),
      )
    }

    if (states.length === 0 || states.some((state) => state == null)) {
      return []
    }

    const value: ResponseValue = states.includes('unavailable')
      ? 'unavailable'
      : states.includes('adjustable')
        ? 'adjustable'
        : 'available'

    return [
      {
        id: `r-derived-${participantId}-${candidate.id}`,
        participantId,
        candidateId: candidate.id,
        value,
        updatedAt,
        updateSource,
      },
    ]
  })
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
