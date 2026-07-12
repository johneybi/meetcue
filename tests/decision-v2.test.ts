import assert from 'node:assert/strict'
import test from 'node:test'
import {
  aggregateCandidateAttendeeState,
  decisionSignature,
  evaluateDecisionCandidate,
  groupDecisionEvaluations,
  normalizeMeetingCriteria,
  type CandidateAttendeeInput,
  type DecisionCandidateInput,
  type DecisionMeetingInput,
  type DecisionParticipant,
} from '../src/domain/decision-v2.ts'

const futureDeadline = '2030-01-10T09:00:00.000Z'
const pastDeadline = '2020-01-10T09:00:00.000Z'

test('normalizes everyone meetings and includes the host once', () => {
  assert.deepEqual(
    normalizeMeetingCriteria({
      participantIds: ['host', 'a', 'b'],
      hostId: 'host',
      mode: 'everyone',
    }),
    { requiredIds: ['a', 'b', 'host'], minimumAttendeeCount: 3 },
  )
})

test('normalizes required-only and clamps minimum-count meetings', () => {
  assert.deepEqual(
    normalizeMeetingCriteria({
      participantIds: ['host', 'a', 'b'],
      hostId: 'host',
      mode: 'required_only',
      selectedRequiredIds: ['a', 'host'],
    }),
    { requiredIds: ['a', 'host'], minimumAttendeeCount: 2 },
  )
  assert.equal(
    normalizeMeetingCriteria({
      participantIds: ['host', 'a', 'b'],
      hostId: 'host',
      mode: 'minimum_count',
      selectedRequiredIds: ['a'],
      requestedMinimumAttendeeCount: 99,
    }).minimumAttendeeCount,
    3,
  )
})

test('rejects a meeting where the host is not required', () => {
  assert.throws(
    () =>
      evaluateDecisionCandidate(
        meeting([{ ...host(), required: false }, person('a')], 1),
        candidate([attendee('a', 'available')]),
      ),
    /Host must be a required attendee/,
  )
})

test('aggregates slot states with the documented conservative priority', () => {
  assert.equal(
    aggregateCandidateAttendeeState('submitted', ['available', 'available']),
    'available',
  )
  assert.equal(
    aggregateCandidateAttendeeState('submitted', ['available', 'adjustment_commit']),
    'adjustment_commit',
  )
  assert.equal(
    aggregateCandidateAttendeeState('submitted', ['available', 'unavailable']),
    'unavailable',
  )
  assert.equal(aggregateCandidateAttendeeState('submitted', ['available', 'unset']), 'unknown')
  assert.equal(aggregateCandidateAttendeeState('draft', ['available', 'available']), 'unknown')
})

test('marks a candidate impossible when a required attendee is unavailable', () => {
  const result = evaluateDecisionCandidate(
    meeting([host(), person('required', true), person('optional')], 2),
    candidate([attendee('required', 'unavailable'), attendee('optional', 'available')]),
  )

  assert.equal(result.status, 'impossible')
  assert.deepEqual(result.requiredUnavailableIds, ['required'])
})

test('marks a candidate ready despite optional unknown attendees', () => {
  const result = evaluateDecisionCandidate(
    meeting([host(), person('required', true), person('optional', false, 'not_started')], 2),
    candidate([attendee('required', 'available')]),
  )

  assert.equal(result.status, 'ready')
  assert.deepEqual(result.unknownIds, ['optional'])
})

test('keeps required pending separate from the interchangeable optional pool', () => {
  const result = evaluateDecisionCandidate(
    meeting(
      [
        host(),
        person('required', true, 'not_started'),
        person('optional-a', false, 'not_started'),
        person('optional-b', false, 'not_started'),
      ],
      3,
    ),
    candidate([]),
  )

  assert.equal(result.status, 'pending')
  assert.deepEqual(result.requiredPendingIds, ['required'])
  assert.deepEqual(result.optionalPendingPoolIds, ['optional-a', 'optional-b'])
  assert.equal(result.positiveResponsesNeededAfterRequiredYes, 1)
})

test('does not double-count a positive required response toward the minimum', () => {
  const result = evaluateDecisionCandidate(
    meeting(
      [host(), person('required', true, 'not_started'), person('optional', false, 'not_started')],
      2,
    ),
    candidate([]),
  )

  assert.equal(result.positiveResponsesNeededAfterRequiredYes, 0)
})

test('marks a candidate impossible when even every unknown cannot meet the minimum', () => {
  const result = evaluateDecisionCandidate(
    meeting([host(), person('a'), person('b')], 3),
    candidate([attendee('a', 'unavailable'), attendee('b', 'unavailable')]),
  )

  assert.equal(result.status, 'impossible')
  assert.equal(result.primaryReason, 'maximum_below_minimum')
})

test('treats adjustment commitment as committed while preserving its burden', () => {
  const result = evaluateDecisionCandidate(
    meeting([host(), person('required', true)], 2),
    candidate([attendee('required', 'adjustment_commit')]),
  )

  assert.equal(result.status, 'ready')
  assert.deepEqual(result.adjustmentCommitIds, ['required'])
})

test('keeps unknown status after the deadline and exposes deadlinePassed separately', () => {
  const result = evaluateDecisionCandidate(
    meeting([host(), person('required', true, 'not_started')], 2, pastDeadline),
    candidate([]),
    new Date('2026-01-01T00:00:00.000Z'),
  )

  assert.equal(result.status, 'pending')
  assert.equal(result.deadlinePassed, true)
  assert.deepEqual(result.requiredPendingIds, ['required'])
})

test('recalculates pending conditions after an attendee responds', () => {
  const inputMeeting = meeting(
    [host(), person('a', false, 'not_started'), person('b', false, 'not_started')],
    2,
  )
  const before = evaluateDecisionCandidate(inputMeeting, candidate([]))
  const after = evaluateDecisionCandidate(
    {
      ...inputMeeting,
      participants: inputMeeting.participants.map((participant) =>
        participant.id === 'a' ? { ...participant, submissionStatus: 'submitted' } : participant,
      ),
    },
    candidate([attendee('a', 'available')]),
  )

  assert.equal(before.status, 'pending')
  assert.equal(after.status, 'ready')
})

test('groups only adjacent candidates with identical decision signatures', () => {
  const inputMeeting = meeting([host(), person('a')], 2)
  const first = evaluateDecisionCandidate(
    inputMeeting,
    candidate([attendee('a', 'available')], 'c1', '2030-01-02T01:00:00.000Z'),
  )
  const second = evaluateDecisionCandidate(
    inputMeeting,
    candidate([attendee('a', 'available')], 'c2', '2030-01-02T01:30:00.000Z'),
  )
  const differentPersonState = evaluateDecisionCandidate(
    inputMeeting,
    candidate([attendee('a', 'adjustment_commit')], 'c3', '2030-01-02T02:00:00.000Z'),
  )

  assert.equal(decisionSignature(first), decisionSignature(second))
  assert.notEqual(decisionSignature(second), decisionSignature(differentPersonState))
  assert.deepEqual(
    groupDecisionEvaluations([differentPersonState, second, first]).map((group) =>
      group.evaluations.map((evaluation) => evaluation.candidate.id),
    ),
    [['c1', 'c2'], ['c3']],
  )
})

test('returns the same evaluation for the same input', () => {
  const inputMeeting = meeting([host(), person('a', true), person('b')], 2)
  const inputCandidate = candidate([
    attendee('a', 'available'),
    attendee('b', 'adjustment_commit', true),
  ])
  const now = new Date('2029-01-01T00:00:00.000Z')

  assert.deepEqual(
    evaluateDecisionCandidate(inputMeeting, inputCandidate, now),
    evaluateDecisionCandidate(inputMeeting, inputCandidate, now),
  )
})

function host(): DecisionParticipant {
  return {
    id: 'host',
    name: 'Host',
    required: true,
    isHost: true,
    submissionStatus: 'submitted',
  }
}

function person(
  id: string,
  required = false,
  submissionStatus: DecisionParticipant['submissionStatus'] = 'submitted',
): DecisionParticipant {
  return { id, name: id, required, submissionStatus }
}

function attendee(
  participantId: string,
  state: CandidateAttendeeInput['state'],
  avoidPreferred = false,
): CandidateAttendeeInput {
  return { participantId, state, avoidPreferred }
}

function meeting(
  participants: DecisionParticipant[],
  minimumAttendeeCount: number,
  responseDeadline = futureDeadline,
): DecisionMeetingInput {
  return { participants, minimumAttendeeCount, responseDeadline }
}

function candidate(
  attendees: CandidateAttendeeInput[],
  id = 'candidate',
  startAt = '2030-01-02T01:00:00.000Z',
): DecisionCandidateInput {
  return {
    id,
    startAt,
    endAt: new Date(new Date(startAt).getTime() + 60 * 60 * 1000).toISOString(),
    attendees,
  }
}
