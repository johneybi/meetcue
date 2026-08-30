import { describe, expect, it } from 'vitest'

import { deriveCandidatesFromAvailabilityWindows, mergeAvailabilityWindows } from './availability'
import { evaluateCandidate, getCandidateSetStatus } from './evaluation'
import { createPrototypeMeeting } from './mockMeeting'
import type { AvailabilityWindow } from './meeting'

const FIXED_NOW = new Date('2026-06-30T17:00:00.000Z')

describe('availability window candidate derivation', () => {
  it('returns no candidates until a meeting duration is known', () => {
    const window = availabilityWindow(
      'window-available',
      'host',
      '2026-07-01T09:00:00.000Z',
      '2026-07-01T11:00:00.000Z',
      'available',
    )

    expect(deriveCandidatesFromAvailabilityWindows('meeting-1', [window], null)).toEqual([])
  })

  it('derives half-hour candidates from available windows and de-duplicates overlaps', () => {
    const windows = [
      availabilityWindow(
        'window-first',
        'host',
        '2026-07-01T09:00:00.000Z',
        '2026-07-01T11:00:00.000Z',
        'available',
      ),
      availabilityWindow(
        'window-overlap',
        'host',
        '2026-07-01T10:00:00.000Z',
        '2026-07-01T12:00:00.000Z',
        'available',
      ),
      availabilityWindow(
        'window-adjustable',
        'host',
        '2026-07-01T13:00:00.000Z',
        '2026-07-01T15:00:00.000Z',
        'adjustable',
      ),
    ]

    const candidates = deriveCandidatesFromAvailabilityWindows('meeting-1', windows, 60)

    expect(candidates.map((candidate) => candidate.startAt)).toEqual([
      '2026-07-01T09:00:00.000Z',
      '2026-07-01T09:30:00.000Z',
      '2026-07-01T10:00:00.000Z',
      '2026-07-01T10:30:00.000Z',
      '2026-07-01T11:00:00.000Z',
    ])
    expect(candidates.every((candidate) => candidate.meetingId === 'meeting-1')).toBe(true)
    expect(candidates.map((candidate) => candidate.endAt)).toEqual([
      '2026-07-01T10:00:00.000Z',
      '2026-07-01T10:30:00.000Z',
      '2026-07-01T11:00:00.000Z',
      '2026-07-01T11:30:00.000Z',
      '2026-07-01T12:00:00.000Z',
    ])
  })
})

describe('availability window merging', () => {
  it('merges sorted, same-owner windows that overlap or touch on the same date', () => {
    const windows = [
      availabilityWindow(
        'late',
        'host',
        '2026-07-01T10:00:00.000Z',
        '2026-07-01T11:00:00.000Z',
        'available',
      ),
      availabilityWindow(
        'early',
        'host',
        '2026-07-01T08:00:00.000Z',
        '2026-07-01T09:00:00.000Z',
        'available',
      ),
      availabilityWindow(
        'middle',
        'host',
        '2026-07-01T09:00:00.000Z',
        '2026-07-01T10:00:00.000Z',
        'available',
      ),
      availabilityWindow(
        'other-owner',
        'participant',
        '2026-07-01T11:00:00.000Z',
        '2026-07-01T12:00:00.000Z',
        'available',
      ),
      availabilityWindow(
        'adjustable',
        'host',
        '2026-07-01T11:00:00.000Z',
        '2026-07-01T12:00:00.000Z',
        'adjustable',
      ),
      availabilityWindow(
        'next-day',
        'host',
        '2026-07-02T11:00:00.000Z',
        '2026-07-02T12:00:00.000Z',
        'available',
      ),
    ]

    const merged = mergeAvailabilityWindows(windows)

    expect(merged).toEqual([
      {
        ...windows[1],
        endAt: '2026-07-01T11:00:00.000Z',
      },
      windows[3],
      windows[4],
      windows[5],
    ])
    expect(windows[0].endAt).toBe('2026-07-01T11:00:00.000Z')
  })
})

describe('candidate decision evaluation', () => {
  it('covers confirmable, waiting-required, needs-adjustment, and excluded states', () => {
    const meeting = createPrototypeMeeting()

    expect(evaluateCandidate(meeting, candidate(meeting, 'c-fri-1000'), FIXED_NOW).status).toBe(
      'confirmable',
    )
    expect(evaluateCandidate(meeting, candidate(meeting, 'c-wed-1400'), FIXED_NOW).status).toBe(
      'waiting_required',
    )
    expect(evaluateCandidate(meeting, candidate(meeting, 'c-thu-1000'), FIXED_NOW).status).toBe(
      'needs_adjustment',
    )
    expect(evaluateCandidate(meeting, candidate(meeting, 'c-fri-1400'), FIXED_NOW).status).toBe(
      'excluded',
    )
  })

  it('reports the response facts that explain each decision', () => {
    const meeting = createPrototypeMeeting()
    const confirmable = evaluateCandidate(meeting, candidate(meeting, 'c-fri-1000'), FIXED_NOW)
    const waiting = evaluateCandidate(meeting, candidate(meeting, 'c-wed-1400'), FIXED_NOW)
    const adjustment = evaluateCandidate(meeting, candidate(meeting, 'c-thu-1000'), FIXED_NOW)
    const excluded = evaluateCandidate(meeting, candidate(meeting, 'c-fri-1400'), FIXED_NOW)

    expect(confirmable.availableCount).toBe(5)
    expect(confirmable.missingOptional.map((participant) => participant.id)).toEqual(['p-sujin'])
    expect(confirmable.actionLabel).toBe('이 시간으로 정하기')
    expect(waiting.missingRequired.map((participant) => participant.id)).toEqual(['p-minsu'])
    expect(waiting.actionLabel).toBe('요청 문구 복사하기')
    expect(adjustment.requiredAdjustable.map((participant) => participant.id)).toEqual([
      'p-seoyeon',
    ])
    expect(adjustment.actionLabel).toBe('확인하고 정하기')
    expect(excluded.requiredUnavailable.map((participant) => participant.id)).toEqual(['p-seoyeon'])
    expect(excluded.actionLabel).toBeUndefined()
  })

  it('summarizes a set according to its strongest available decision', () => {
    const meeting = createPrototypeMeeting()
    const evaluations = meeting.candidates.map((candidateItem) =>
      evaluateCandidate(meeting, candidateItem, FIXED_NOW),
    )

    expect(getCandidateSetStatus(evaluations)).toBe('has_confirmable')
    expect(
      getCandidateSetStatus(
        evaluations.filter((evaluation) => evaluation.status !== 'confirmable'),
      ),
    ).toBe('exploration_required')
  })
})

function availabilityWindow(
  id: string,
  ownerId: string,
  startAt: string,
  endAt: string,
  state: AvailabilityWindow['state'],
): AvailabilityWindow {
  return { id, meetingId: 'meeting-1', ownerId, startAt, endAt, state }
}

function candidate(meeting: ReturnType<typeof createPrototypeMeeting>, id: string) {
  const match = meeting.candidates.find((candidateItem) => candidateItem.id === id)
  if (match == null) {
    throw new Error(`Missing fixture candidate: ${id}`)
  }

  return match
}
