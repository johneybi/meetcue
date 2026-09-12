import assert from 'node:assert/strict'
import test from 'node:test'
import { assessTimeEntry } from '../src/domain/timeEntryComparison.ts'
import { applyHostTimeRange } from '../src/domain/hostTimeEditing.ts'
import { createDefaultHostAvailabilityWindows } from '../src/domain/availability.ts'
import type { AvailabilityWindow } from '../src/domain/meeting.ts'

const dates = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18']
const scope = { startDate: dates[0], endDate: dates[4] }
function edit(
  windows: AvailabilityWindow[],
  dayIndices: number[],
  start: number,
  end: number,
  mode: 'add' | 'exclude' = 'add',
) {
  return applyHostTimeRange({
    windows,
    meetingId: 'm',
    hostId: 'host',
    schedulingWindow: scope,
    dates: dayIndices.map((i) => dates[i]),
    startMinutes: start,
    endMinutes: end,
    mode,
  })
}
test('detects dangerous extra time even when all desired time is included', () => {
  const windows = createDefaultHostAvailabilityWindows({ meetingId: 'm', hostId: 'host', ...scope })
  assert.deepEqual(assessTimeEntry(windows, 'host', dates, 0), {
    extraMinutes: 420,
    missingMinutes: 0,
    exact: false,
  })
  const lunch = edit(windows, [0, 1, 2, 3, 4], 720, 780, 'exclude')
  const correct = edit(lunch, [1], 900, 1020, 'exclude')
  assert.equal(assessTimeEntry(correct, 'host', dates, 0).exact, true)
  assert.equal(assessTimeEntry(edit(correct, [4], 1380, 1440), 'host', dates, 0).extraMinutes, 60)
})
test('empty and sparse selections are not mistaken for success; other attendees do not count', () => {
  assert.equal(assessTimeEntry([], 'host', dates, 1).missingMinutes, 240)
  const monday = edit([], [0], 600, 720)
  assert.equal(assessTimeEntry(monday, 'host', dates, 1).missingMinutes, 120)
  const correct = edit(monday, [3], 840, 960)
  const guest = { ...correct[0], id: 'guest', ownerId: 'guest' }
  assert.equal(assessTimeEntry([...correct, guest], 'host', dates, 1).exact, true)
})
test('different daily ranges remain exact after merging adjacent inputs', () => {
  const morning = edit(edit([], [0, 2], 540, 630), [0, 2], 630, 720)
  const afternoon = edit(morning, [1, 3], 840, 1080)
  const correct = edit(afternoon, [4], 540, 660)
  assert.equal(assessTimeEntry(correct, 'host', dates, 2).exact, true)
  assert.equal(
    assessTimeEntry(edit(correct, [4], 630, 660, 'exclude'), 'host', dates, 2).missingMinutes,
    30,
  )
  assert.throws(() => assessTimeEntry(correct, 'host', dates, 3), RangeError)
})
