import assert from 'node:assert/strict'
import test from 'node:test'
import {
  evaluateCandidates,
  generateResponseRequestMessage,
  groupCandidateEvaluations,
  hasSameRecommendationPriority,
  selectCandidateShortlist,
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

test('shortlists diverse dates and collapses adjacent equivalent candidates', () => {
  const source = evaluateCandidates(createPrototypeMeeting(), new Date())[0]
  assert.ok(source)

  const starts = [
    '2026-07-13T00:00:00.000Z',
    '2026-07-13T00:30:00.000Z',
    '2026-07-14T00:00:00.000Z',
    '2026-07-14T00:30:00.000Z',
    '2026-07-15T00:00:00.000Z',
    '2026-07-15T00:30:00.000Z',
  ]
  const evaluations = starts.map((startAt, index) => ({
    ...source,
    candidate: {
      ...source.candidate,
      id: `candidate-${index}`,
      startAt,
      endAt: new Date(new Date(startAt).getTime() + 60 * 60 * 1000).toISOString(),
    },
  }))

  const shortlist = selectCandidateShortlist(evaluations, 6)

  assert.deepEqual(
    shortlist.map((evaluation) => evaluation.candidate.id),
    ['candidate-0', 'candidate-2', 'candidate-4'],
  )
})

test('treats time-only differences as the same recommendation priority', () => {
  const source = evaluateCandidates(createPrototypeMeeting(), new Date()).find(
    (evaluation) => evaluation.status === 'ready',
  )
  assert.ok(source)

  const later = {
    ...source,
    candidate: {
      ...source.candidate,
      id: 'same-priority-later',
      startAt: new Date(
        new Date(source.candidate.startAt).getTime() + 60 * 60 * 1000,
      ).toISOString(),
      endAt: new Date(new Date(source.candidate.endAt).getTime() + 60 * 60 * 1000).toISOString(),
    },
  }
  const moreAdjustment = {
    ...later,
    adjustableCount: source.adjustableCount + 1,
  }

  assert.equal(hasSameRecommendationPriority(source, later), true)
  assert.equal(hasSameRecommendationPriority(source, moreAdjustment), false)
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
