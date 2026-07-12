export const DECISION_TIME_ZONE = 'Asia/Seoul'
export const TIME_QUANTUM_MINUTES = 30
export const PROTOTYPE_DURATION_MINUTES = 60

export type DecisionStatus = 'ready' | 'pending' | 'impossible'
export type SubmissionStatus = 'not_started' | 'draft' | 'submitted'
export type SlotState = 'unset' | 'available' | 'adjustment_commit' | 'unavailable'
export type CandidateAttendeeState = 'available' | 'adjustment_commit' | 'unavailable' | 'unknown'

export interface DecisionParticipant {
  id: string
  name: string
  required: boolean
  isHost?: boolean
  submissionStatus: SubmissionStatus
}

export interface CandidateAttendeeInput {
  participantId: string
  state: CandidateAttendeeState
  avoidPreferred?: boolean
}

export interface DecisionCandidateInput {
  id: string
  startAt: string
  endAt: string
  attendees: CandidateAttendeeInput[]
}

export interface DecisionMeetingInput {
  participants: DecisionParticipant[]
  minimumAttendeeCount: number
  responseDeadline: string
}

export interface NormalizedMeetingCriteria {
  requiredIds: string[]
  minimumAttendeeCount: number
}

export interface NormalizeMeetingCriteriaInput {
  participantIds: string[]
  hostId: string
  mode: 'everyone' | 'required_only' | 'minimum_count'
  selectedRequiredIds?: string[]
  requestedMinimumAttendeeCount?: number
}

export type DecisionReason =
  | 'required_unavailable'
  | 'maximum_below_minimum'
  | 'criteria_satisfied'
  | 'required_pending'
  | 'optional_positive_needed'

export interface DecisionCandidateEvaluation {
  candidate: DecisionCandidateInput
  status: DecisionStatus
  primaryReason: DecisionReason
  attendeeStateById: Record<string, CandidateAttendeeState>
  committedIds: string[]
  unknownIds: string[]
  unavailableIds: string[]
  adjustmentCommitIds: string[]
  avoidPreferredIds: string[]
  requiredUnavailableIds: string[]
  requiredPendingIds: string[]
  optionalPendingPoolIds: string[]
  positiveResponsesNeededAfterRequiredYes: number
  deadlinePassed: boolean
}

export interface DecisionCandidateGroup {
  id: string
  status: DecisionStatus
  evaluations: DecisionCandidateEvaluation[]
}

export function normalizeMeetingCriteria(
  input: NormalizeMeetingCriteriaInput,
): NormalizedMeetingCriteria {
  const participantIds = uniqueSorted(input.participantIds)

  if (!participantIds.includes(input.hostId)) {
    throw new Error('Host must be included in participants.')
  }

  if (input.mode === 'everyone') {
    return {
      requiredIds: participantIds,
      minimumAttendeeCount: participantIds.length,
    }
  }

  const requiredIds = uniqueSorted([
    input.hostId,
    ...(input.selectedRequiredIds ?? []).filter((id) => participantIds.includes(id)),
  ])
  const requestedMinimum =
    input.mode === 'required_only'
      ? requiredIds.length
      : (input.requestedMinimumAttendeeCount ?? requiredIds.length)

  return {
    requiredIds,
    minimumAttendeeCount: clamp(requestedMinimum, requiredIds.length, participantIds.length),
  }
}

export function aggregateCandidateAttendeeState(
  submissionStatus: SubmissionStatus,
  slotStates: SlotState[],
): CandidateAttendeeState {
  if (submissionStatus !== 'submitted' || slotStates.length === 0) {
    return 'unknown'
  }

  if (slotStates.includes('unavailable')) return 'unavailable'
  if (slotStates.includes('unset')) return 'unknown'
  if (slotStates.includes('adjustment_commit')) return 'adjustment_commit'
  return 'available'
}

export function evaluateDecisionCandidate(
  meeting: DecisionMeetingInput,
  candidate: DecisionCandidateInput,
  now = new Date(),
): DecisionCandidateEvaluation {
  validateMeeting(meeting)

  const attendeeInputById = new Map(
    candidate.attendees.map((attendee) => [attendee.participantId, attendee]),
  )
  const attendeeStateById: Record<string, CandidateAttendeeState> = {}
  const avoidPreferredIds: string[] = []

  for (const participant of meeting.participants) {
    const attendeeInput = attendeeInputById.get(participant.id)
    const state = participant.isHost
      ? 'available'
      : participant.submissionStatus === 'submitted'
        ? (attendeeInput?.state ?? 'unknown')
        : 'unknown'

    attendeeStateById[participant.id] = state

    if (attendeeInput?.avoidPreferred && isCommittedState(state)) {
      avoidPreferredIds.push(participant.id)
    }
  }

  const committedIds = idsWithState(attendeeStateById, ['available', 'adjustment_commit'])
  const unknownIds = idsWithState(attendeeStateById, ['unknown'])
  const unavailableIds = idsWithState(attendeeStateById, ['unavailable'])
  const adjustmentCommitIds = idsWithState(attendeeStateById, ['adjustment_commit'])
  const requiredIds = meeting.participants.filter((participant) => participant.required).map(idOf)
  const requiredIdSet = new Set(requiredIds)
  const requiredUnavailableIds = unavailableIds.filter((id) => requiredIdSet.has(id))
  const requiredPendingIds = unknownIds.filter((id) => requiredIdSet.has(id))
  const optionalPendingPoolIds = unknownIds.filter((id) => !requiredIdSet.has(id))
  const positiveResponsesNeededAfterRequiredYes = Math.max(
    0,
    meeting.minimumAttendeeCount - (committedIds.length + requiredPendingIds.length),
  )
  const maximumPossibleCount = committedIds.length + unknownIds.length
  const requiredSatisfied = requiredIds.every((id) => committedIds.includes(id))

  let status: DecisionStatus
  let primaryReason: DecisionReason

  if (requiredUnavailableIds.length > 0) {
    status = 'impossible'
    primaryReason = 'required_unavailable'
  } else if (maximumPossibleCount < meeting.minimumAttendeeCount) {
    status = 'impossible'
    primaryReason = 'maximum_below_minimum'
  } else if (requiredSatisfied && committedIds.length >= meeting.minimumAttendeeCount) {
    status = 'ready'
    primaryReason = 'criteria_satisfied'
  } else {
    status = 'pending'
    primaryReason = requiredPendingIds.length > 0 ? 'required_pending' : 'optional_positive_needed'
  }

  return {
    candidate,
    status,
    primaryReason,
    attendeeStateById,
    committedIds,
    unknownIds,
    unavailableIds,
    adjustmentCommitIds,
    avoidPreferredIds: uniqueSorted(avoidPreferredIds),
    requiredUnavailableIds,
    requiredPendingIds,
    optionalPendingPoolIds,
    positiveResponsesNeededAfterRequiredYes,
    deadlinePassed: new Date(meeting.responseDeadline).getTime() <= now.getTime(),
  }
}

export function compareDecisionEvaluations(
  left: DecisionCandidateEvaluation,
  right: DecisionCandidateEvaluation,
) {
  const statusRank: Record<DecisionStatus, number> = {
    ready: 0,
    pending: 1,
    impossible: 2,
  }
  const leftRank = evaluationRank(left, statusRank)
  const rightRank = evaluationRank(right, statusRank)

  for (let index = 0; index < leftRank.length; index += 1) {
    if (leftRank[index] !== rightRank[index]) {
      return leftRank[index] - rightRank[index]
    }
  }

  return 0
}

export function groupDecisionEvaluations(
  evaluations: DecisionCandidateEvaluation[],
): DecisionCandidateGroup[] {
  const chronological = [...evaluations].sort(
    (left, right) =>
      new Date(left.candidate.startAt).getTime() - new Date(right.candidate.startAt).getTime(),
  )
  const groups: DecisionCandidateGroup[] = []

  for (const evaluation of chronological) {
    const previousGroup = groups[groups.length - 1]
    const previousEvaluation = previousGroup?.evaluations.at(-1)
    const isAdjacent =
      previousEvaluation != null &&
      new Date(evaluation.candidate.startAt).getTime() -
        new Date(previousEvaluation.candidate.startAt).getTime() ===
        TIME_QUANTUM_MINUTES * 60 * 1000

    if (
      previousGroup != null &&
      previousEvaluation != null &&
      isAdjacent &&
      decisionSignature(previousEvaluation) === decisionSignature(evaluation)
    ) {
      previousGroup.evaluations.push(evaluation)
      continue
    }

    groups.push({
      id: `group-${evaluation.candidate.id}`,
      status: evaluation.status,
      evaluations: [evaluation],
    })
  }

  return groups.sort((left, right) =>
    compareDecisionEvaluations(left.evaluations[0], right.evaluations[0]),
  )
}

export function decisionSignature(evaluation: DecisionCandidateEvaluation) {
  return JSON.stringify({
    status: evaluation.status,
    attendeeStateById: sortedRecord(evaluation.attendeeStateById),
    requiredPendingIds: evaluation.requiredPendingIds,
    optionalPendingPoolIds: evaluation.optionalPendingPoolIds,
    positiveResponsesNeededAfterRequiredYes: evaluation.positiveResponsesNeededAfterRequiredYes,
    adjustmentCommitIds: evaluation.adjustmentCommitIds,
    avoidPreferredIds: evaluation.avoidPreferredIds,
  })
}

function validateMeeting(meeting: DecisionMeetingInput) {
  const participantIds = meeting.participants.map(idOf)
  const requiredCount = meeting.participants.filter((participant) => participant.required).length
  const hosts = meeting.participants.filter((participant) => participant.isHost)

  if (new Set(participantIds).size !== participantIds.length) {
    throw new Error('Participant IDs must be unique.')
  }

  if (hosts.length !== 1) {
    throw new Error('Meeting must have exactly one host.')
  }

  if (!hosts[0].required) {
    throw new Error('Host must be a required attendee.')
  }

  if (meeting.minimumAttendeeCount < 1) {
    throw new Error('Minimum attendee count must be positive.')
  }

  if (requiredCount > meeting.minimumAttendeeCount) {
    throw new Error('Minimum attendee count cannot be below required attendee count.')
  }

  if (meeting.minimumAttendeeCount > meeting.participants.length) {
    throw new Error('Minimum attendee count cannot exceed participant count.')
  }
}

function evaluationRank(
  evaluation: DecisionCandidateEvaluation,
  statusRank: Record<DecisionStatus, number>,
) {
  const optionalUnknownCount = evaluation.optionalPendingPoolIds.length
  const committedCount = evaluation.committedIds.length

  if (evaluation.status === 'ready') {
    return [
      statusRank[evaluation.status],
      evaluation.adjustmentCommitIds.length,
      evaluation.avoidPreferredIds.length,
      optionalUnknownCount,
      -committedCount,
      new Date(evaluation.candidate.startAt).getTime(),
    ]
  }

  if (evaluation.status === 'pending') {
    return [
      statusRank[evaluation.status],
      evaluation.requiredPendingIds.length,
      evaluation.positiveResponsesNeededAfterRequiredYes,
      evaluation.adjustmentCommitIds.length,
      evaluation.avoidPreferredIds.length,
      new Date(evaluation.candidate.startAt).getTime(),
    ]
  }

  return [statusRank[evaluation.status], new Date(evaluation.candidate.startAt).getTime()]
}

function idsWithState(
  attendeeStateById: Record<string, CandidateAttendeeState>,
  states: CandidateAttendeeState[],
) {
  const allowed = new Set(states)
  return Object.entries(attendeeStateById)
    .filter(([, state]) => allowed.has(state))
    .map(([id]) => id)
    .sort()
}

function isCommittedState(state: CandidateAttendeeState) {
  return state === 'available' || state === 'adjustment_commit'
}

function sortedRecord(record: Record<string, CandidateAttendeeState>) {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  )
}

function idOf(participant: DecisionParticipant) {
  return participant.id
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort()
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}
