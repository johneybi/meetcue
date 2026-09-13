import assert from 'node:assert/strict'
import test from 'node:test'
import {
  evaluateDecisionCandidate,
  aggregateCandidateAttendeeState,
  type CandidateAttendeeState,
} from '../src/domain/decision-v2.ts'
import { createWorkspace, decodeWorkspace } from '../src/domain/workspace.ts'
import { evaluateCandidates, confirmMeetingCandidate } from '../src/domain/evaluation.ts'
import { createConstraintExample, describePath } from '../src/domain/constraintRecovery.ts'

function evaluate(state: CandidateAttendeeState, optional = false, minimum = 2) {
  return evaluateDecisionCandidate(
    {
      participants: [
        { id: 'host', name: '주최자', required: true, isHost: true, submissionStatus: 'submitted' },
        { id: 'a', name: '참석자', required: !optional, submissionStatus: 'submitted' },
      ],
      minimumAttendeeCount: minimum,
      responseDeadline: '2030-01-01T00:00:00Z',
    },
    {
      id: 'c',
      startAt: '2030-01-02T00:00:00Z',
      endAt: '2030-01-02T01:00:00Z',
      attendees: [{ participantId: 'a', state }],
    },
  )
}
test('intent is an answered constraint, not unknown, unavailable, or consent', () => {
  const result = evaluate('adjustment_intent')
  assert.equal(result.status, 'recovery')
  assert.deepEqual(result.committedIds, ['host'])
  assert.deepEqual(result.unknownIds, [])
  assert.deepEqual(result.requiredPendingIds, [])
  assert.deepEqual(result.adjustmentIntentIds, ['a'])
  assert.equal(evaluate('unknown').status, 'pending')
  assert.equal(evaluate('unavailable').status, 'impossible')
  assert.equal(evaluate('adjustment_commit').status, 'ready')
  assert.equal(evaluate('adjustment_intent', true, 1).status, 'ready')
  assert.equal(evaluate('adjustment_intent', true, 2).status, 'recovery')
  assert.equal(
    aggregateCandidateAttendeeState('submitted', ['adjustment_commit', 'adjustment_intent']),
    'adjustment_intent',
  )
})
test('stored old commitment and new intent retain distinct meanings after reload', () => {
  const snapshot = createWorkspace()
  const meeting = snapshot.entries[0].meeting
  const c = meeting.candidates[0]
  meeting.participants.forEach((p) => {
    p.responseStatus = 'submitted'
    p.role = 'required'
  })
  meeting.minAttendeeCount = meeting.participants.length
  meeting.responses = meeting.participants.map((p) => ({
    id: p.id,
    participantId: p.id,
    candidateId: c.id,
    value: 'available',
    updatedAt: '2026-09-13T00:00:00Z',
    updateSource: 'initial',
  }))
  const respondent = meeting.responses.find((r) => r.participantId !== meeting.hostId)!
  respondent.value = 'adjustable'
  const old = decodeWorkspace(JSON.stringify(snapshot))!
  assert.equal(
    evaluateCandidates(old.entries[0].meeting).find((e) => e.candidate.id === c.id)!.status,
    'ready',
  )
  assert.ok(confirmMeetingCandidate(old.entries[0].meeting, c.id))
  respondent.value = 'adjustment_intent'
  const current = decodeWorkspace(JSON.stringify(snapshot))!
  const result = evaluateCandidates(current.entries[0].meeting).find(
    (e) => e.candidate.id === c.id,
  )!
  assert.equal(confirmMeetingCandidate(current.entries[0].meeting, c.id), null)
  assert.equal(result.status, 'recovery')
  assert.equal(result.adjustmentIntentParticipants.length, 1)
  assert.equal(result.requiredPending.length, 0)
  assert.equal(result.availableCount, meeting.participants.length - 1)
  assert.equal(
    old.entries[0].meeting.responses.find((r) => r.id === respondent.id)!.value,
    'adjustable',
  )
})
test('undisclosed conflict details do not claim zero required changes', () => {
  const s = createConstraintExample('2030-01-07')
  s.slots[0].answers.minsu.conflicts = []
  const path = describePath(s, s.slots[0])
  assert.equal(path.changes.length, 1)
  assert.equal(path.unknownChangeCount, 1)
  assert.equal(path.ready, false)
})
