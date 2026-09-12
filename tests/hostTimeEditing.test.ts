import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultHostAvailabilityWindows,
  deriveCandidatesFromAvailabilityWindows,
} from '../src/domain/availability.ts'
import {
  applyHostTimeRange,
  hostTimeBounds,
  koreanDateKey,
  koreanDateTime,
} from '../src/domain/hostTimeEditing.ts'

const scope = { startDate: '2026-09-14', endDate: '2026-09-20' }
const defaults = () =>
  createDefaultHostAvailabilityWindows({ meetingId: 'm', hostId: 'host', ...scope })
const dates = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18']
const options = {
  meetingId: 'm',
  hostId: 'host',
  schedulingWindow: scope,
  dates,
  startMinutes: 720,
  endMinutes: 780,
  mode: 'exclude' as const,
}
const minutes = (windows: ReturnType<typeof defaults>) =>
  windows
    .filter((w) => w.ownerId === 'host')
    .reduce((sum, w) => sum + (Date.parse(w.endAt) - Date.parse(w.startAt)) / 60000, 0)

test('lunch exclusion applies across weekdays without mutating the original or another attendee', () => {
  const windows = [...defaults(), { ...defaults()[0], id: 'attendee', ownerId: 'guest' }]
  const snapshot = structuredClone(windows)
  const result = applyHostTimeRange({ ...options, windows })
  assert.equal(minutes(result), 40 * 60)
  assert.equal(result.filter((w) => w.ownerId === 'host').length, 10)
  assert.deepEqual(
    result.find((w) => w.ownerId === 'guest'),
    snapshot.find((w) => w.ownerId === 'guest'),
  )
  assert.deepEqual(windows, snapshot)
  const candidates = deriveCandidatesFromAvailabilityWindows('m', 'host', result, 60)
  for (const c of candidates) {
    const noon = koreanDateTime(koreanDateKey(new Date(c.startAt)), 720).getTime()
    assert.ok(Date.parse(c.endAt) <= noon || Date.parse(c.startAt) >= noon + 3600000)
  }
})

test('adding an overlapping range is idempotent and selected dates do not alter other days', () => {
  const windows = defaults()
  const next = applyHostTimeRange({
    ...options,
    windows,
    dates: [dates[0], dates[0]],
    mode: 'add',
    startMinutes: 1020,
    endMinutes: 1200,
  })
  assert.equal(minutes(next), 47 * 60)
  assert.deepEqual(
    next.filter((w) => koreanDateKey(new Date(w.startAt)) !== dates[0]),
    windows.slice(1),
  )
  assert.deepEqual(
    applyHostTimeRange({
      ...options,
      windows: next,
      dates: [dates[0]],
      mode: 'add',
      startMinutes: 1020,
      endMinutes: 1200,
    }),
    next,
  )
  assert.deepEqual(hostTimeBounds(next, 'host'), { start: 540, end: 1200 })
})

test('weekend and late hours ending at midnight are selectable in Korean time', () => {
  const next = applyHostTimeRange({
    ...options,
    windows: [],
    dates: ['2026-09-19'],
    startMinutes: 1380,
    endMinutes: 1440,
    mode: 'add',
  })
  assert.equal(next[0].startAt, '2026-09-19T14:00:00.000Z')
  assert.equal(next[0].endAt, '2026-09-19T15:00:00.000Z')
  assert.deepEqual(hostTimeBounds(next, 'host'), { start: 540, end: 1440 })
  assert.equal(deriveCandidatesFromAvailabilityWindows('m', 'host', next, 60).length, 1)
})

test('empty or fragmented time cannot fit a meeting even when the total duration is sufficient', () => {
  const first = applyHostTimeRange({
    ...options,
    windows: [],
    dates: [dates[0]],
    startMinutes: 540,
    endMinutes: 570,
    mode: 'add',
  })
  const separated = applyHostTimeRange({
    ...options,
    windows: first,
    dates: [dates[0]],
    startMinutes: 600,
    endMinutes: 630,
    mode: 'add',
  })
  assert.equal(minutes(separated), 60)
  assert.equal(deriveCandidatesFromAvailabilityWindows('m', 'host', separated, 60).length, 0)
  assert.equal(deriveCandidatesFromAvailabilityWindows('m', 'host', [], 60).length, 0)
  const bridged = applyHostTimeRange({
    ...options,
    windows: separated,
    dates: [dates[0]],
    startMinutes: 570,
    endMinutes: 600,
    mode: 'add',
  })
  assert.equal(deriveCandidatesFromAvailabilityWindows('m', 'host', bridged, 60).length, 2)
})

test('invalid, overnight, off-grid and out-of-scope entries cannot change availability', () => {
  const windows = defaults()
  for (const range of [
    { startMinutes: 780, endMinutes: 720 },
    { startMinutes: 720, endMinutes: 720 },
    { startMinutes: 725, endMinutes: 780 },
    { startMinutes: 1380, endMinutes: 1470 },
  ]) {
    assert.throws(() => applyHostTimeRange({ ...options, windows, ...range }), RangeError)
  }
  for (const invalidDate of ['2026-09-21', '2026-09-13', '2026-09-31', ''])
    assert.throws(
      () => applyHostTimeRange({ ...options, windows, dates: [invalidDate] }),
      RangeError,
    )
  assert.deepEqual(windows, defaults())
})
