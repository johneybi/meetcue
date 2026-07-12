import assert from 'node:assert/strict'
import test from 'node:test'
import {
  evaluateCandidates,
  generateResponseRequestMessage,
  groupCandidateEvaluations,
} from '../src/domain/evaluation.ts'
import { createPrototypeMeeting } from '../src/domain/mockMeeting.ts'

test('keeps unsubmitted draft data hidden from candidate evidence', () => {
  const meeting = createPrototypeMeeting()
  meeting.participants = meeting.participants.map((participant) =>
    participant.id === 'p-minsu' ? { ...participant, responseStatus: 'draft' } : participant,
  )

  const evaluation = evaluateCandidates(meeting, new Date()).find(
    (item) => item.candidate.id === 'c-thu-1500',
  )
  const minsuDetail = evaluation?.responseDetails.find(
    (detail) => detail.participant.id === 'p-minsu',
  )

  assert.equal(minsuDetail?.response?.value, 'available')
  assert.equal(minsuDetail?.state, 'unknown')
})

test('creates a response request only for recipients selected by the host', () => {
  const meeting = createPrototypeMeeting()
  const pendingEvaluation = evaluateCandidates(meeting, new Date()).find(
    (evaluation) =>
      evaluation.status === 'pending' &&
      evaluation.requiredPending.some((participant) => participant.id === 'p-minsu'),
  )

  assert.ok(pendingEvaluation)
  const message = generateResponseRequestMessage(meeting, pendingEvaluation, ['p-minsu'])

  assert.match(message, /^민수님, /)
  assert.doesNotMatch(message, /수진님/)
})

test('prototype data exposes required, optional-pool, combined, ready, and impossible results', () => {
  const evaluations = evaluateCandidates(createPrototypeMeeting(), new Date())
  const groups = groupCandidateEvaluations(evaluations)

  assert.ok(evaluations.some((evaluation) => evaluation.status === 'ready'))
  assert.ok(evaluations.some((evaluation) => evaluation.status === 'impossible'))
  assert.ok(
    evaluations.some(
      (evaluation) =>
        evaluation.status === 'pending' &&
        evaluation.requiredPending.length === 0 &&
        evaluation.positiveResponsesNeededAfterRequiredYes > 0,
    ),
  )
  assert.ok(
    evaluations.some(
      (evaluation) =>
        evaluation.status === 'pending' &&
        evaluation.requiredPending.length > 0 &&
        evaluation.positiveResponsesNeededAfterRequiredYes > 0,
    ),
  )
  assert.ok(
    groups.some(
      (group) =>
        group.evaluations.some((evaluation) => evaluation.candidate.id === 'c-thu-1000') &&
        group.evaluations.some((evaluation) => evaluation.candidate.id === 'c-thu-1030'),
    ),
  )
})

test('representative P0 candidate changes from pending to ready after Sujin responds', () => {
  const meeting = createPrototypeMeeting()
  const before = evaluateCandidates(meeting, new Date()).find(
    (evaluation) =>
      evaluation.status === 'pending' &&
      evaluation.positiveResponsesNeededAfterRequiredYes === 1 &&
      evaluation.optionalPendingPool.some((participant) => participant.id === 'p-sujin'),
  )

  assert.ok(before)

  meeting.participants = meeting.participants.map((participant) =>
    participant.id === 'p-sujin'
      ? { ...participant, responseStatus: 'submitted' as const }
      : participant,
  )
  meeting.responses = [
    ...meeting.responses,
    {
      id: `response-p-sujin-${before.candidate.id}`,
      participantId: 'p-sujin',
      candidateId: before.candidate.id,
      value: 'available',
      updatedAt: new Date().toISOString(),
      updateSource: 'participant_edit',
    },
  ]

  const after = evaluateCandidates(meeting, new Date()).find(
    (evaluation) => evaluation.candidate.id === before.candidate.id,
  )

  assert.equal(after?.status, 'ready')
})
