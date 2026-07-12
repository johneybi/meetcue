import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultHostAvailabilityWindows,
  deriveCandidatesFromAvailabilityWindows,
  deriveParticipantResponses,
  removeAvailabilityRange,
  replaceAvailabilitySlot,
} from '../src/domain/availability.ts'
import type { AvailabilityWindow, Candidate } from '../src/domain/meeting.ts'

const baseWindow: AvailabilityWindow = {
  id: 'window',
  meetingId: 'meeting',
  ownerId: 'participant',
  startAt: '2030-01-02T00:00:00.000Z',
  endAt: '2030-01-02T02:00:00.000Z',
  state: 'available',
}

test('creates a weekday default host scope in Asia/Seoul', () => {
  const result = createDefaultHostAvailabilityWindows({
    meetingId: 'meeting',
    hostId: 'host',
    startDate: '2030-01-07',
    endDate: '2030-01-11',
  })

  assert.equal(result.length, 5)
  assert.deepEqual(
    { startAt: result[0]?.startAt, endAt: result[0]?.endAt },
    {
      startAt: '2030-01-07T00:00:00.000Z',
      endAt: '2030-01-07T09:00:00.000Z',
    },
  )
})

test('removing a range splits a host window around the excluded time', () => {
  const result = removeAvailabilityRange([baseWindow], 'participant', {
    startAt: '2030-01-02T00:30:00.000Z',
    endAt: '2030-01-02T01:00:00.000Z',
  })

  assert.deepEqual(
    result.map(({ startAt, endAt }) => ({ startAt, endAt })),
    [
      {
        startAt: '2030-01-02T00:00:00.000Z',
        endAt: '2030-01-02T00:30:00.000Z',
      },
      {
        startAt: '2030-01-02T01:00:00.000Z',
        endAt: '2030-01-02T02:00:00.000Z',
      },
    ],
  )
})

test('derives stable 30-minute candidates only from the host windows', () => {
  const hostWindow: AvailabilityWindow = {
    ...baseWindow,
    id: 'host-window',
    ownerId: 'host',
    startAt: '2030-01-02T00:10:00.000Z',
    endAt: '2030-01-02T02:00:00.000Z',
  }
  const participantWindow: AvailabilityWindow = {
    ...baseWindow,
    id: 'participant-window',
    startAt: '2030-01-02T02:00:00.000Z',
    endAt: '2030-01-02T04:00:00.000Z',
  }

  const result = deriveCandidatesFromAvailabilityWindows(
    'meeting',
    'host',
    [hostWindow, participantWindow],
    60,
  )

  assert.deepEqual(
    result.map(({ id, startAt, endAt }) => ({ id, startAt, endAt })),
    [
      {
        id: 'c-meeting-1893544200000-1893547800000',
        startAt: '2030-01-02T00:30:00.000Z',
        endAt: '2030-01-02T01:30:00.000Z',
      },
      {
        id: 'c-meeting-1893546000000-1893549600000',
        startAt: '2030-01-02T01:00:00.000Z',
        endAt: '2030-01-02T02:00:00.000Z',
      },
    ],
  )
})

test('does not derive candidates that cross an Asia/Seoul date boundary', () => {
  const result = deriveCandidatesFromAvailabilityWindows(
    'meeting',
    'host',
    [
      {
        ...baseWindow,
        ownerId: 'host',
        startAt: '2030-01-02T14:30:00.000Z',
        endAt: '2030-01-02T15:30:00.000Z',
      },
    ],
    60,
  )

  assert.deepEqual(result, [])
})

test('replacing one slot preserves the selected range before and after it', () => {
  const result = replaceAvailabilitySlot(
    [baseWindow],
    'participant',
    {
      startAt: '2030-01-02T00:30:00.000Z',
      endAt: '2030-01-02T01:00:00.000Z',
    },
    'unavailable',
  )

  assert.deepEqual(
    result.map(({ startAt, endAt, state }) => ({ startAt, endAt, state })),
    [
      {
        startAt: '2030-01-02T00:00:00.000Z',
        endAt: '2030-01-02T00:30:00.000Z',
        state: 'available',
      },
      {
        startAt: '2030-01-02T00:30:00.000Z',
        endAt: '2030-01-02T01:00:00.000Z',
        state: 'unavailable',
      },
      {
        startAt: '2030-01-02T01:00:00.000Z',
        endAt: '2030-01-02T02:00:00.000Z',
        state: 'available',
      },
    ],
  )
})

test('derived responses use the strictest slot state and carry avoidance preference', () => {
  const candidate: Candidate = {
    id: 'candidate',
    meetingId: 'meeting',
    startAt: baseWindow.startAt,
    endAt: '2030-01-02T01:00:00.000Z',
  }
  const withUnavailableSlot = replaceAvailabilitySlot(
    [baseWindow],
    'participant',
    {
      startAt: '2030-01-02T00:30:00.000Z',
      endAt: '2030-01-02T01:00:00.000Z',
    },
    'unavailable',
  )

  assert.equal(
    deriveParticipantResponses(
      'participant',
      [candidate],
      withUnavailableSlot,
      '2030-01-01T00:00:00.000Z',
    )[0]?.value,
    'unavailable',
  )

  const preferredWindows = replaceAvailabilitySlot(
    [baseWindow],
    'participant',
    {
      startAt: '2030-01-02T00:00:00.000Z',
      endAt: '2030-01-02T00:30:00.000Z',
    },
    'available',
    true,
  )
  assert.deepEqual(
    deriveParticipantResponses(
      'participant',
      [candidate],
      preferredWindows,
      '2030-01-01T00:00:00.000Z',
    )[0]?.preferenceTags,
    ['avoid_if_possible'],
  )
})
