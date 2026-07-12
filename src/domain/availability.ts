import type {
  AvailabilityWindow,
  Candidate,
  MeetingDuration,
  Response,
  ResponseUpdateSource,
  ResponseValue,
} from './meeting.ts'

const TIME_QUANTUM_MINUTES = 30
const DECISION_TIME_ZONE = 'Asia/Seoul'
const kstDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: DECISION_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export interface AvailabilitySlot {
  startAt: string
  endAt: string
}

export function createDefaultHostAvailabilityWindows({
  meetingId,
  hostId,
  startDate,
  endDate,
  startMinutes = 9 * 60,
  endMinutes = 18 * 60,
}: {
  meetingId: string
  hostId: string
  startDate: string
  endDate: string
  startMinutes?: number
  endMinutes?: number
}) {
  if (startDate === '' || endDate === '' || startDate > endDate || startMinutes >= endMinutes) {
    return []
  }

  const cursor = new Date(`${startDate}T00:00:00.000Z`)
  const lastDate = new Date(`${endDate}T00:00:00.000Z`)
  const windows: AvailabilityWindow[] = []

  while (cursor <= lastDate) {
    const day = cursor.getUTCDay()
    const date = cursor.toISOString().slice(0, 10)

    if (day >= 1 && day <= 5) {
      const startAt = decisionDateTime(date, startMinutes)
      const endAt = decisionDateTime(date, endMinutes)
      windows.push({
        id: `aw-${hostId}-default-${startAt.getTime()}`,
        meetingId,
        ownerId: hostId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        state: 'available',
      })
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return windows
}

export function deriveCandidatesFromAvailabilityWindows(
  meetingId: string,
  hostId: string,
  windows: AvailabilityWindow[],
  durationMinutes: MeetingDuration | null,
): Candidate[] {
  if (
    durationMinutes == null ||
    durationMinutes <= 0 ||
    durationMinutes % TIME_QUANTUM_MINUTES !== 0
  ) {
    return []
  }

  const durationMs = durationMinutes * 60 * 1000
  const quantumMs = TIME_QUANTUM_MINUTES * 60 * 1000
  const candidates = new Map<number, Candidate>()

  windows
    .filter((window) => window.ownerId === hostId && window.state === 'available')
    .forEach((window) => {
      const windowStart = new Date(window.startAt).getTime()
      const windowEnd = new Date(window.endAt).getTime()
      const firstAlignedStart = Math.ceil(windowStart / quantumMs) * quantumMs

      for (let start = firstAlignedStart; start + durationMs <= windowEnd; start += quantumMs) {
        const end = start + durationMs
        if (!isSameDecisionDate(new Date(start), new Date(end - 1))) continue

        candidates.set(start, {
          id: `c-${meetingId}-${start}-${end}`,
          meetingId,
          startAt: new Date(start).toISOString(),
          endAt: new Date(end).toISOString(),
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
      Boolean(previous.avoidPreferred) === Boolean(window.avoidPreferred) &&
      isSameDecisionDate(new Date(previous.startAt), new Date(window.startAt)) &&
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

export function replaceAvailabilitySlot(
  windows: AvailabilityWindow[],
  ownerId: string,
  slot: AvailabilitySlot,
  state: ResponseValue,
  avoidPreferred = false,
  fallbackMeetingId = '',
) {
  const slotStart = new Date(slot.startAt).getTime()
  const slotEnd = new Date(slot.endAt).getTime()
  const meetingId =
    windows.find((window) => window.ownerId === ownerId)?.meetingId ??
    windows[0]?.meetingId ??
    fallbackMeetingId
  const retained: AvailabilityWindow[] = []

  for (const window of windows) {
    const windowStart = new Date(window.startAt).getTime()
    const windowEnd = new Date(window.endAt).getTime()
    const overlaps = window.ownerId === ownerId && windowStart < slotEnd && windowEnd > slotStart

    if (!overlaps) {
      retained.push(window)
      continue
    }

    if (windowStart < slotStart) {
      retained.push({
        ...window,
        id: `${window.id}-before-${slotStart}`,
        endAt: slot.startAt,
      })
    }

    if (windowEnd > slotEnd) {
      retained.push({
        ...window,
        id: `${window.id}-after-${slotEnd}`,
        startAt: slot.endAt,
      })
    }
  }

  return mergeAvailabilityWindows([
    ...retained,
    {
      id: `aw-${ownerId}-${slotStart}`,
      meetingId,
      ownerId,
      startAt: slot.startAt,
      endAt: slot.endAt,
      state,
      avoidPreferred: avoidPreferred || undefined,
    },
  ])
}

export function removeAvailabilityRange(
  windows: AvailabilityWindow[],
  ownerId: string,
  range: AvailabilitySlot,
) {
  const rangeStart = new Date(range.startAt).getTime()
  const rangeEnd = new Date(range.endAt).getTime()

  if (rangeStart >= rangeEnd) return windows

  const retained: AvailabilityWindow[] = []

  for (const window of windows) {
    const windowStart = new Date(window.startAt).getTime()
    const windowEnd = new Date(window.endAt).getTime()
    const overlaps = window.ownerId === ownerId && windowStart < rangeEnd && windowEnd > rangeStart

    if (!overlaps) {
      retained.push(window)
      continue
    }

    if (windowStart < rangeStart) {
      retained.push({
        ...window,
        id: `${window.id}-before-${rangeStart}`,
        endAt: range.startAt,
      })
    }

    if (windowEnd > rangeEnd) {
      retained.push({
        ...window,
        id: `${window.id}-after-${rangeEnd}`,
        startAt: range.endAt,
      })
    }
  }

  return mergeAvailabilityWindows(retained)
}

export function fillAvailabilitySlots(
  windows: AvailabilityWindow[],
  ownerId: string,
  slots: AvailabilitySlot[],
  state: ResponseValue,
  meetingId: string,
) {
  return slots.reduce(
    (current, slot) => replaceAvailabilitySlot(current, ownerId, slot, state, false, meetingId),
    windows,
  )
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
  return getAvailabilityWindowForSlot(windows, ownerId, slot)?.state
}

export function getAvailabilityWindowForSlot(
  windows: AvailabilityWindow[],
  ownerId: string,
  slot: AvailabilitySlot,
) {
  const slotStart = new Date(slot.startAt).getTime()
  const slotEnd = new Date(slot.endAt).getTime()

  return windows.find((window) => {
    if (window.ownerId !== ownerId) return false

    return (
      new Date(window.startAt).getTime() <= slotStart && new Date(window.endAt).getTime() >= slotEnd
    )
  })
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
    let avoidPreferred = false
    const candidateStart = new Date(candidate.startAt).getTime()
    const candidateEnd = new Date(candidate.endAt).getTime()

    for (let slotStart = candidateStart; slotStart < candidateEnd; slotStart += quantumMs) {
      const slot = {
        startAt: new Date(slotStart).toISOString(),
        endAt: new Date(Math.min(slotStart + quantumMs, candidateEnd)).toISOString(),
      }
      const window = getAvailabilityWindowForSlot(windows, participantId, slot)
      states.push(window?.state)
      avoidPreferred ||= Boolean(window?.avoidPreferred)
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
        preferenceTags: avoidPreferred ? ['avoid_if_possible'] : undefined,
        updatedAt,
        updateSource,
      },
    ]
  })
}

function isSameDecisionDate(left: Date, right: Date) {
  return kstDateFormatter.format(left) === kstDateFormatter.format(right)
}

function decisionDateTime(date: string, minutes: number) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0')
  const minute = String(minutes % 60).padStart(2, '0')
  return new Date(`${date}T${hours}:${minute}:00+09:00`)
}
