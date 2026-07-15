import assert from 'node:assert/strict'
import test from 'node:test'
import { createPrototypeMeeting } from '../src/domain/mockMeeting.ts'
import { createPendingPrototypeState } from '../src/domain/prototypeState.ts'

test('creates a pending demo state with one actionable non-host attendee', () => {
  const source = createPrototypeMeeting()
  const result = createPendingPrototypeState(source)

  assert.equal(result.meeting.status, 'collecting')
  assert.ok(result.pendingCandidateId)
  assert.ok(result.target)
  assert.equal(result.target?.id, 'p-sujin')
  assert.notEqual(result.target?.id, source.hostId)
  assert.equal(
    result.meeting.participants.find((participant) => participant.id === result.target?.id)
      ?.responseStatus,
    'not_started',
  )
  assert.ok(
    result.meeting.participants.some(
      (participant) =>
        participant.id !== source.hostId && participant.responseStatus === 'submitted',
    ),
  )
})

test('keeps host availability and replaces attendee fixture responses', () => {
  const source = createPrototypeMeeting()
  const result = createPendingPrototypeState(source)

  assert.ok(result.meeting.availabilityWindows.some((window) => window.ownerId === source.hostId))
  assert.ok(result.meeting.responses.length > 0)
  assert.ok(result.meeting.responses.every((response) => response.updateSource === 'initial'))
})
