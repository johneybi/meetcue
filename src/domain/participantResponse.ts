import {
  deriveAvailabilitySlots,
  deriveCandidatesFromAvailabilityWindows,
  deriveParticipantResponses,
  getAvailabilityStateForSlot,
  mergeAvailabilityWindows,
  replaceAvailabilitySlot,
} from './availability.ts'
import type { AvailabilityWindow, Candidate, Meeting } from './meeting.ts'

export type ResponseSubmission =
  { scope: 'candidates'; candidateIds: string[] } | { scope: 'range' }

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** A stable, shared starting set. No participant's private calendar ranks these choices. */
export function selectResponseCandidates(candidates: Candidate[], preferredId?: string) {
  const sorted = [...candidates].sort((a, b) => a.startAt.localeCompare(b.startAt))
  const preferred = candidates.find((candidate) => candidate.id === preferredId)
  const selected: Candidate[] = preferred ? [preferred] : []
  const hasOverlap = (candidate: Candidate) =>
    selected.some((item) => item.startAt < candidate.endAt && item.endAt > candidate.startAt)
  for (const differentDateOnly of [true, false]) {
    for (const candidate of sorted) {
      if (selected.length >= 3) return selected
      if (hasOverlap(candidate)) continue
      const date = dayFormatter.format(new Date(candidate.startAt))
      if (
        differentDateOnly &&
        selected.some((item) => dayFormatter.format(new Date(item.startAt)) === date)
      )
        continue
      selected.push(candidate)
    }
  }
  return selected
}

/** Only deliberate candidate answers are shared; calendar defaults outside them stay private. */
export function applyParticipantSubmission(
  meeting: Meeting,
  participantId: string,
  draftWindows: AvailabilityWindow[],
  submission: ResponseSubmission,
  updatedAt = new Date().toISOString(),
): Meeting {
  if (
    participantId === meeting.hostId ||
    !meeting.participants.some((p) => p.id === participantId)
  ) {
    throw new Error('응답할 참석자를 찾을 수 없어요.')
  }
  const previousParticipant = meeting.participants.find((p) => p.id === participantId)!
  const ownDraft = draftWindows.filter((window) => window.ownerId === participantId)
  let ownWindows: AvailabilityWindow[]
  let candidates = meeting.candidates

  if (submission.scope === 'candidates') {
    const ids = new Set(submission.candidateIds)
    const answeredCandidates = candidates.filter((candidate) => ids.has(candidate.id))
    if (ids.size === 0 || ids.size !== answeredCandidates.length)
      throw new Error('응답할 후보를 확인해 주세요.')
    const responses = deriveParticipantResponses(
      participantId,
      answeredCandidates,
      ownDraft,
      updatedAt,
    )
    if (responses.length !== answeredCandidates.length)
      throw new Error('각 후보의 응답을 선택해 주세요.')
    ownWindows = meeting.availabilityWindows.filter((window) => window.ownerId === participantId)
    for (const candidate of answeredCandidates) {
      // Clip the submitted draft to the selected candidates, retaining slot-level differences.
      const slots = deriveAvailabilitySlots(
        [{ ...candidate, ownerId: participantId, state: 'available' }],
        participantId,
      )
      for (const slot of slots) {
        ownWindows = replaceAvailabilitySlot(
          ownWindows,
          participantId,
          slot,
          getAvailabilityStateForSlot(ownDraft, participantId, slot)!,
          false,
          meeting.id,
        )
      }
    }
  } else {
    const slots = deriveAvailabilitySlots(meeting.availabilityWindows, meeting.hostId)
    ownWindows = slots.map((slot) => ({
      ...slot,
      id: `aw-${participantId}-${slot.startAt}`,
      meetingId: meeting.id,
      ownerId: participantId,
      state: getAvailabilityStateForSlot(ownDraft, participantId, slot) ?? 'unavailable',
      avoidPreferred: ownDraft.find(
        (window) => window.startAt <= slot.startAt && window.endAt >= slot.endAt,
      )?.avoidPreferred,
    }))
    const existingTimes = new Set(candidates.map((c) => `${c.startAt}/${c.endAt}`))
    candidates = [
      ...candidates,
      ...deriveCandidatesFromAvailabilityWindows(
        meeting.id,
        meeting.hostId,
        meeting.availabilityWindows,
        meeting.durationMinutes,
      ).filter((candidate) => !existingTimes.has(`${candidate.startAt}/${candidate.endAt}`)),
    ]
  }

  const availabilityWindows = [
    ...meeting.availabilityWindows.filter((window) => window.ownerId !== participantId),
    ...mergeAvailabilityWindows(ownWindows),
  ]
  const reviewedIds =
    submission.scope === 'candidates'
      ? [
          ...new Set([
            ...(previousParticipant.responseCandidateIds ?? []),
            ...submission.candidateIds,
          ]),
        ]
      : undefined
  const ownResponseCandidates =
    reviewedIds == null ? candidates : candidates.filter((c) => reviewedIds.includes(c.id))
  const newCandidates = candidates.filter(
    (candidate) => !meeting.candidates.some((old) => old.id === candidate.id),
  )
  return {
    ...meeting,
    candidates,
    availabilityWindows,
    responseProposalIds:
      meeting.responseProposalIds ?? selectResponseCandidates(meeting.candidates).map((c) => c.id),
    participants: meeting.participants.map((participant) =>
      participant.id === participantId
        ? {
            ...participant,
            responseStatus: 'submitted',
            responseScope: submission.scope,
            responseCandidateIds: reviewedIds,
          }
        : participant,
    ),
    responses: [
      ...meeting.responses.filter((response) => response.participantId !== participantId),
      ...deriveParticipantResponses(
        participantId,
        ownResponseCandidates,
        availabilityWindows,
        updatedAt,
      ),
      ...meeting.participants.flatMap((participant) =>
        participant.id !== participantId &&
        participant.responseStatus === 'submitted' &&
        participant.responseScope !== 'candidates'
          ? deriveParticipantResponses(
              participant.id,
              newCandidates,
              availabilityWindows,
              updatedAt,
            )
          : [],
      ),
    ],
  }
}
