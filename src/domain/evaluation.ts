import {
  compareDecisionEvaluations,
  decisionSignature,
  evaluateDecisionCandidate,
  type CandidateAttendeeState,
  type DecisionCandidateEvaluation,
  type DecisionCandidateInput,
  type DecisionMeetingInput,
} from './decision-v2.ts'
import {
  type Candidate,
  type CandidateStatus,
  type Meeting,
  type Participant,
  type Response,
} from './meeting.ts'

export interface CandidateEvaluation {
  candidate: Candidate
  status: CandidateStatus
  reasons: string[]
  firmAvailableCount: number
  availableCount: number
  adjustableCount: number
  preferenceTagCount: number
  unavailableCount: number
  requiredUnavailable: Participant[]
  requiredPending: Participant[]
  optionalPendingPool: Participant[]
  positiveResponsesNeededAfterRequiredYes: number
  adjustmentCommitParticipants: Participant[]
  deadlinePassed: boolean
  responseDetails: CandidateResponseDetail[]
}

export interface CandidateResponseDetail {
  participant: Participant
  response?: Response
  state: CandidateAttendeeState
  isImplicitHostAvailable?: boolean
}

export interface CandidateEvaluationGroup {
  id: string
  status: CandidateStatus
  evaluations: CandidateEvaluation[]
}

export function evaluateCandidates(meeting: Meeting, now = new Date()) {
  const decisionMeeting = toDecisionMeeting(meeting)

  return meeting.candidates
    .map((candidate) => {
      const decisionCandidate = toDecisionCandidate(meeting, candidate)
      const decision = evaluateDecisionCandidate(decisionMeeting, decisionCandidate, now)
      return toCandidateEvaluation(meeting, candidate, decision)
    })
    .sort((left, right) =>
      compareDecisionEvaluations(
        toComparableDecisionEvaluation(left),
        toComparableDecisionEvaluation(right),
      ),
    )
}

export function groupCandidateEvaluations(
  evaluations: CandidateEvaluation[],
): CandidateEvaluationGroup[] {
  const chronological = [...evaluations].sort(
    (left, right) =>
      new Date(left.candidate.startAt).getTime() - new Date(right.candidate.startAt).getTime(),
  )
  const groups: CandidateEvaluationGroup[] = []

  for (const evaluation of chronological) {
    const previousGroup = groups.at(-1)
    const previousEvaluation = previousGroup?.evaluations.at(-1)
    const adjacent =
      previousEvaluation != null &&
      new Date(evaluation.candidate.startAt).getTime() -
        new Date(previousEvaluation.candidate.startAt).getTime() ===
        30 * 60 * 1000

    if (
      previousGroup != null &&
      previousEvaluation != null &&
      adjacent &&
      decisionSignature(toComparableDecisionEvaluation(previousEvaluation)) ===
        decisionSignature(toComparableDecisionEvaluation(evaluation))
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
    compareDecisionEvaluations(
      toComparableDecisionEvaluation(left.evaluations[0]),
      toComparableDecisionEvaluation(right.evaluations[0]),
    ),
  )
}

export function generateConfirmationMessage(meeting: Meeting, evaluation: CandidateEvaluation) {
  const time = formatShortTime(evaluation.candidate)
  const adjustmentNotice =
    evaluation.adjustmentCommitParticipants.length > 0
      ? `\n${names(evaluation.adjustmentCommitParticipants)}님은 조정해서 참석 가능하다고 표시한 시간이에요.`
      : ''

  return `${meeting.title}은 ${time}에 진행할게요.${adjustmentNotice}`
}

export function generateResponseRequestMessage(
  meeting: Meeting,
  evaluation: CandidateEvaluation,
  recipientIds?: string[],
) {
  if (evaluation.status === 'pending') {
    const selectableParticipants = [
      ...evaluation.requiredPending,
      ...evaluation.optionalPendingPool,
    ]
    const recipients =
      recipientIds == null
        ? selectableParticipants
        : selectableParticipants.filter((participant) => recipientIds.includes(participant.id))
    const recipientCopy = recipients.length > 0 ? `${names(recipients)}님, ` : ''

    return `${recipientCopy}${meeting.title} 시간을 정하려고 해요.\n${formatShortTime(evaluation.candidate)}\n이 시간에 참석할 수 있는지 기존 링크에서 알려주세요.`
  }

  if (evaluation.status === 'impossible') {
    return `${meeting.title}은 현재 조건으로 ${formatShortTime(evaluation.candidate)}에 정하기 어려워요.\n다른 시간을 검토해 주세요.`
  }

  return `${meeting.title}은 ${formatShortTime(evaluation.candidate)}에 지금 정할 수 있어요.`
}

function toDecisionMeeting(meeting: Meeting): DecisionMeetingInput {
  return {
    participants: meeting.participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      required: participant.role === 'required',
      isHost: participant.id === meeting.hostId,
      submissionStatus: participant.responseStatus,
    })),
    minimumAttendeeCount: meeting.minAttendeeCount,
    responseDeadline: meeting.responseDeadline,
  }
}

function toDecisionCandidate(meeting: Meeting, candidate: Candidate): DecisionCandidateInput {
  const responses = meeting.responses.filter((response) => response.candidateId === candidate.id)

  return {
    id: candidate.id,
    startAt: candidate.startAt,
    endAt: candidate.endAt,
    attendees: responses.map((response) => ({
      participantId: response.participantId,
      state: toDecisionState(response.value),
      avoidPreferred: (response.preferenceTags?.length ?? 0) > 0,
    })),
  }
}

function toCandidateEvaluation(
  meeting: Meeting,
  candidate: Candidate,
  decision: DecisionCandidateEvaluation,
): CandidateEvaluation {
  const participantById = new Map(
    meeting.participants.map((participant) => [participant.id, participant]),
  )
  const responseByParticipantId = new Map(
    meeting.responses
      .filter((response) => response.candidateId === candidate.id)
      .map((response) => [response.participantId, response]),
  )
  const participants = (ids: string[]) =>
    ids.map((id) => participantById.get(id)).filter(isParticipant)
  const requiredPending = participants(decision.requiredPendingIds)
  const optionalPendingPool = participants(decision.optionalPendingPoolIds)
  const requiredUnavailable = participants(decision.requiredUnavailableIds)
  const adjustmentCommitParticipants = participants(decision.adjustmentCommitIds)
  const availableAsIsCount = Object.values(decision.attendeeStateById).filter(
    (state) => state === 'available',
  ).length
  const reasons = buildReasons(meeting, decision, participantById)

  return {
    candidate,
    status: decision.status,
    reasons,
    firmAvailableCount: availableAsIsCount,
    availableCount: decision.committedIds.length,
    adjustableCount: decision.adjustmentCommitIds.length,
    preferenceTagCount: decision.avoidPreferredIds.length,
    unavailableCount: decision.unavailableIds.length,
    requiredUnavailable,
    requiredPending,
    optionalPendingPool,
    positiveResponsesNeededAfterRequiredYes: decision.positiveResponsesNeededAfterRequiredYes,
    adjustmentCommitParticipants,
    deadlinePassed: decision.deadlinePassed,
    responseDetails: meeting.participants.map((participant) => ({
      participant,
      response: responseByParticipantId.get(participant.id),
      state: decision.attendeeStateById[participant.id],
      isImplicitHostAvailable: participant.id === meeting.hostId,
    })),
  }
}

function buildReasons(
  meeting: Meeting,
  decision: DecisionCandidateEvaluation,
  participantById: Map<string, Participant>,
) {
  const participantNames = (ids: string[]) =>
    ids
      .map((id) => participantById.get(id)?.name)
      .filter(isString)
      .join(', ')

  if (decision.status === 'ready') {
    const reasons = [`설정한 필수 참석자와 최소 ${meeting.minAttendeeCount}명 기준을 충족해요.`]
    if (decision.adjustmentCommitIds.length > 0) {
      reasons.push(`${decision.adjustmentCommitIds.length}명은 다른 일정을 조정해 참석해요.`)
    }
    if (decision.unknownIds.length > 0) {
      reasons.push('미응답자가 있지만 현재 응답만으로 기준을 충족해요.')
    }
    return reasons
  }

  if (decision.status === 'impossible') {
    if (decision.requiredUnavailableIds.length > 0) {
      return [
        `필수 참석자인 ${participantNames(decision.requiredUnavailableIds)}님이 참석하기 어려워요.`,
      ]
    }
    return [`남은 사람이 모두 가능해도 최소 ${meeting.minAttendeeCount}명을 채울 수 없어요.`]
  }

  const reasons: string[] = []
  if (decision.requiredPendingIds.length > 0) {
    reasons.push(
      `${participantNames(decision.requiredPendingIds)}님의 가능 응답이 반드시 필요해요.`,
    )
  }
  if (decision.positiveResponsesNeededAfterRequiredYes > 0) {
    reasons.push(
      `${participantNames(decision.optionalPendingPoolIds)}님 중 ${decision.positiveResponsesNeededAfterRequiredYes}명 이상도 가능해야 해요.`,
    )
  }
  if (decision.deadlinePassed) {
    reasons.push('응답 마감이 지났지만 미응답은 어려움으로 처리하지 않아요.')
  }
  return reasons
}

function toDecisionState(value: Response['value']): CandidateAttendeeState {
  if (value === 'adjustable') return 'adjustment_commit'
  return value
}

function toComparableDecisionEvaluation(
  evaluation: CandidateEvaluation,
): DecisionCandidateEvaluation {
  return {
    candidate: {
      id: evaluation.candidate.id,
      startAt: evaluation.candidate.startAt,
      endAt: evaluation.candidate.endAt,
      attendees: [],
    },
    status: evaluation.status,
    primaryReason:
      evaluation.status === 'ready'
        ? 'criteria_satisfied'
        : evaluation.status === 'impossible'
          ? evaluation.requiredUnavailable.length > 0
            ? 'required_unavailable'
            : 'maximum_below_minimum'
          : evaluation.requiredPending.length > 0
            ? 'required_pending'
            : 'optional_positive_needed',
    attendeeStateById: Object.fromEntries(
      evaluation.responseDetails.map((detail) => [detail.participant.id, detail.state]),
    ),
    committedIds: evaluation.responseDetails
      .filter((detail) => detail.state === 'available' || detail.state === 'adjustment_commit')
      .map((detail) => detail.participant.id),
    unknownIds: [...evaluation.requiredPending, ...evaluation.optionalPendingPool].map(
      (participant) => participant.id,
    ),
    unavailableIds: evaluation.responseDetails
      .filter((detail) => detail.state === 'unavailable')
      .map((detail) => detail.participant.id),
    adjustmentCommitIds: evaluation.adjustmentCommitParticipants.map(
      (participant) => participant.id,
    ),
    avoidPreferredIds: evaluation.responseDetails
      .filter((detail) => (detail.response?.preferenceTags?.length ?? 0) > 0)
      .map((detail) => detail.participant.id),
    requiredUnavailableIds: evaluation.requiredUnavailable.map((participant) => participant.id),
    requiredPendingIds: evaluation.requiredPending.map((participant) => participant.id),
    optionalPendingPoolIds: evaluation.optionalPendingPool.map((participant) => participant.id),
    positiveResponsesNeededAfterRequiredYes: evaluation.positiveResponsesNeededAfterRequiredYes,
    deadlinePassed: evaluation.deadlinePassed,
  }
}

function names(participants: Participant[]) {
  return participants.map((participant) => participant.name).join(', ')
}

function formatShortTime(candidate: Candidate) {
  const start = new Date(candidate.startAt)
  const end = new Date(candidate.endAt)
  const date = new Intl.DateTimeFormat('ko-KR', {
    weekday: 'long',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  }).format(start)
  const endTime = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  }).format(end)

  return `${date}-${endTime}`
}

function isParticipant(participant: Participant | undefined): participant is Participant {
  return participant != null
}

function isString(value: string | undefined): value is string {
  return value != null
}
