import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluateCandidates } from '../src/domain/evaluation.ts'
import { createPrototypeMeeting } from '../src/domain/mockMeeting.ts'
import { createPendingPrototypeState } from '../src/domain/prototypeState.ts'
import {
  applyParticipantSubmission,
  selectResponseCandidates,
} from '../src/domain/participantResponse.ts'
import { deriveAvailabilitySlots, getAvailabilityStateForSlot } from '../src/domain/availability.ts'
import type { AvailabilityWindow, ResponseValue } from '../src/domain/meeting.ts'

function setup() {
  const { meeting, target } = createPendingPrototypeState(createPrototypeMeeting())
  assert.ok(target)
  const proposals = selectResponseCandidates(meeting.candidates)
  const answer = (value: ResponseValue): AvailabilityWindow[] =>
    proposals.map((c) => ({ ...c, ownerId: target.id, state: value }))
  return { meeting, target, proposals, answer }
}

test('initial proposals cover three dates, do not overlap, and include a requested time', () => {
  const { meeting } = setup()
  const proposals = selectResponseCandidates(meeting.candidates, meeting.candidates[0].id)
  assert.equal(proposals.length, 3)
  assert.equal(proposals[0].id, meeting.candidates[0].id)
  assert.equal(new Set(proposals.map((c) => c.startAt.slice(0, 10))).size, 3)
  assert.deepEqual(selectResponseCandidates([]), [])
  assert.equal(selectResponseCandidates([meeting.candidates[0]]).length, 1)
  for (const a of proposals)
    for (const b of proposals) {
      if (a.id !== b.id) assert.ok(a.endAt <= b.startAt || b.endAt <= a.startAt)
    }
})

test('quick submission shares only reviewed candidates even when the calendar draft covers the entire range', () => {
  const { meeting, target, proposals } = setup()
  const baseline = meeting.availabilityWindows
    .filter((w) => w.ownerId === meeting.hostId)
    .map((w) => ({ ...w, ownerId: target.id }))
  const result = applyParticipantSubmission(meeting, target.id, baseline, {
    scope: 'candidates',
    candidateIds: proposals.map((c) => c.id),
  })
  assert.equal(
    result.responses.filter((r) => r.participantId === target.id).length,
    proposals.length,
  )
  const outside = meeting.candidates.find((c) => !proposals.some((p) => p.id === c.id))!
  assert.equal(
    result.responses.find((r) => r.participantId === target.id && r.candidateId === outside.id),
    undefined,
  )
  const evaluation = evaluateCandidates(result, new Date())[0]
  const outsideEvaluation = evaluateCandidates(result, new Date()).find(
    (item) => item.candidate.id === outside.id,
  )!
  assert.ok(evaluation)
  assert.equal(
    outsideEvaluation.responseDetails.find((detail) => detail.participant.id === target.id)?.state,
    'unknown',
  )
  const untouchedSlot = deriveAvailabilitySlots(meeting.availabilityWindows, meeting.hostId).find(
    (slot) => proposals.every((c) => slot.startAt < c.startAt || slot.endAt > c.endAt),
  )!
  assert.equal(
    getAvailabilityStateForSlot(result.availabilityWindows, target.id, untouchedSlot),
    undefined,
  )
  assert.equal(result.participants.find((p) => p.id === target.id)?.responseScope, 'candidates')
})

test('declining every proposal does not decline unseen times; editing preserves other people and source data', () => {
  const { meeting, target, proposals, answer } = setup()
  const source = JSON.stringify(meeting)
  const result = applyParticipantSubmission(meeting, target.id, answer('unavailable'), {
    scope: 'candidates',
    candidateIds: proposals.map((c) => c.id),
  })
  const own = result.responses.filter((r) => r.participantId === target.id)
  assert.equal(own.length, 3)
  assert.ok(own.every((r) => r.value === 'unavailable'))
  const edited = applyParticipantSubmission(result, target.id, answer('available'), {
    scope: 'candidates',
    candidateIds: proposals.map((c) => c.id),
  })
  assert.ok(
    edited.responses
      .filter((r) => r.participantId === target.id)
      .every((r) => r.value === 'available'),
  )
  assert.deepEqual(
    edited.responses.filter((r) => r.participantId !== target.id),
    meeting.responses,
  )
  assert.equal(JSON.stringify(meeting), source)
})

test('expanding the range adds real candidates while preserving old IDs and unreviewed partial responses', () => {
  const { meeting, target, proposals, answer } = setup()
  const quick = applyParticipantSubmission(meeting, target.id, answer('available'), {
    scope: 'candidates',
    candidateIds: proposals.map((c) => c.id),
  })
  const other = meeting.participants.find((p) => p.id !== meeting.hostId && p.id !== target.id)!
  const baseline = meeting.availabilityWindows
    .filter((w) => w.ownerId === meeting.hostId)
    .map((w) => ({ ...w, ownerId: other.id }))
  const expanded = applyParticipantSubmission(quick, other.id, baseline, { scope: 'range' })
  assert.ok(expanded.candidates.length > meeting.candidates.length)
  assert.deepEqual(
    expanded.responseProposalIds,
    proposals.map((c) => c.id),
  )
  assert.deepEqual(expanded.candidates.slice(0, meeting.candidates.length), meeting.candidates)
  const added = expanded.candidates.filter(
    (c) => !meeting.candidates.some((old) => old.id === c.id),
  )
  assert.ok(
    added.every((c) =>
      expanded.responses.some((r) => r.candidateId === c.id && r.participantId === other.id),
    ),
  )
  assert.ok(
    added.every(
      (c) =>
        !expanded.responses.some((r) => r.candidateId === c.id && r.participantId === target.id),
    ),
  )
  const full = applyParticipantSubmission(quick, target.id, answer('available'), { scope: 'range' })
  const allSlots = deriveAvailabilitySlots(full.availabilityWindows, full.hostId)
  assert.ok(
    allSlots.every(
      (slot) => getAvailabilityStateForSlot(full.availabilityWindows, target.id, slot) != null,
    ),
  )
  assert.equal(full.participants.find((p) => p.id === target.id)?.responseScope, 'range')
})

test('rejects invalid candidates, incomplete answers, and a host responding as an invitee', () => {
  const { meeting, target, proposals, answer } = setup()
  assert.throws(() =>
    applyParticipantSubmission(meeting, target.id, [], {
      scope: 'candidates',
      candidateIds: proposals.map((c) => c.id),
    }),
  )
  assert.throws(() =>
    applyParticipantSubmission(meeting, target.id, answer('available'), {
      scope: 'candidates',
      candidateIds: ['missing'],
    }),
  )
  assert.throws(() => applyParticipantSubmission(meeting, meeting.hostId, [], { scope: 'range' }))
})
