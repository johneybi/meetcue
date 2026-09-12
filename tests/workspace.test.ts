import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createWorkspace,
  createWorkspaceDraft,
  upsertEntry,
  decodeWorkspace,
  getEntryStatus,
  getNotificationId,
} from '../src/domain/workspace.ts'
import {
  buildRouteHash,
  parseRouteHash,
  getMeetingIdFromHash,
  getInviteTokenFromHash,
} from '../src/lib/appRoutes.ts'
import { buildCalendarEvent } from '../src/lib/calendarExport.ts'

test('scenario meetings and invite identities remain distinct across navigation', () => {
  const { entries } = createWorkspace()
  assert.equal(new Set(entries.map((e) => e.meeting.id)).size, 4)
  const tokens = entries.flatMap((e) => e.meeting.participants.map((p) => p.responseToken))
  assert.equal(new Set(tokens).size, tokens.length)
  for (const { meeting } of entries)
    assert.ok(meeting.participants.every((p) => p.meetingId === meeting.id))
})
test('submitted request and confirmed meeting survive workspace serialization without replacing other meetings', () => {
  const snapshot = createWorkspace()
  const request = snapshot.entries.find((e) => e.kind === 'request')!
  const updated = {
    ...request.meeting,
    participants: request.meeting.participants.map((p) =>
      p.id === request.participantId ? { ...p, responseStatus: 'submitted' as const } : p,
    ),
  }
  const entries = upsertEntry(snapshot.entries, updated)
  const restored = decodeWorkspace(JSON.stringify({ ...snapshot, entries }))!
  assert.equal(
    getEntryStatus(restored.entries.find((e) => e.meeting.id === updated.id)!),
    '응답 완료',
  )
  assert.equal(JSON.stringify(restored.entries[0]), JSON.stringify(snapshot.entries[0]))
  assert.notEqual(
    getNotificationId(request),
    getNotificationId(restored.entries.find((e) => e.meeting.id === updated.id)!),
  )
  assert.equal(
    restored.entries.find((e) => e.meeting.status === 'confirmed')?.meeting.confirmedCandidateId,
    snapshot.entries[2].meeting.confirmedCandidateId,
  )
})
test('new draft does not replace an existing meeting, and invalid storage recovers', () => {
  const snapshot = createWorkspace()
  const draft = createWorkspaceDraft('meeting-new')
  draft.title = '일정 검토'
  const entries = upsertEntry(snapshot.entries, draft)
  assert.equal(entries.length, 5)
  assert.deepEqual(entries[0], snapshot.entries[0])
  assert.equal(decodeWorkspace('{broken'), null)
  assert.equal(
    decodeWorkspace(JSON.stringify({ ...snapshot, entries: [{ meeting: { id: 'bad' } }] })),
    null,
  )
  assert.equal(decodeWorkspace(JSON.stringify({ ...snapshot, activeMeetingId: 'missing' })), null)
})
test('home is the default and service routes work independently of build mode', () => {
  assert.equal(parseRouteHash(''), 'home')
  for (const route of ['home', 'meetings', 'requests', 'notifications'] as const)
    assert.equal(parseRouteHash(`#/${route}`), route)
  const hash = buildRouteHash('invite-edit', 'token-p-sujin-onboarding', 'meeting-onboarding')
  assert.equal(parseRouteHash(hash), 'invite-edit')
  assert.equal(getInviteTokenFromHash(hash), 'token-p-sujin-onboarding')
  assert.equal(getMeetingIdFromHash(hash), 'meeting-onboarding')
  assert.equal(parseRouteHash('#/meetings?status=confirmed'), 'meetings')
})
test('calendar export uses exact confirmed interval, escapes text, and folds UTF-8 lines', () => {
  const m = createWorkspace().entries[2].meeting
  const c = m.candidates.find((c) => c.id === m.confirmedCandidateId)!
  const ics = buildCalendarEvent(
    { ...m, title: '일정, 검토; 확인', purpose: '긴 설명 '.repeat(50) + '\n다음 줄' },
    c,
    new Date('2026-09-07T00:00:00Z'),
  )
  assert.ok(
    ics.includes(
      'DTSTART:' + new Date(c.startAt).toISOString().replace(/[-:]/g, '').replace('.000', ''),
    ),
  )
  assert.ok(ics.includes('SUMMARY:일정\\, 검토\\; 확인'))
  assert.ok(ics.includes('DTSTAMP:20260907T000000Z'))
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75)
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'))
})
