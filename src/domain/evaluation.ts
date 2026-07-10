import {
  type Candidate,
  type CandidateSetStatus,
  type CandidateStatus,
  type Meeting,
  type Participant,
  type Response,
  formatMeetingDuration,
  isAttendableResponse,
} from './meeting'

export interface CandidateEvaluation {
  candidate: Candidate
  status: CandidateStatus
  reasons: string[]
  actionLabel?: string
  availableCount: number
  adjustableCount: number
  preferenceTagCount: number
  unavailableCount: number
  optionalUnavailableCount: number
  respondedCount: number
  responseTargetCount: number
  missingRequired: Participant[]
  missingOptional: Participant[]
  requiredUnavailable: Participant[]
  requiredAdjustable: Participant[]
  responseDetails: CandidateResponseDetail[]
}

export interface CandidateResponseDetail {
  participant: Participant
  response?: Response
  isImplicitHostAvailable?: boolean
}

export function evaluateCandidates(meeting: Meeting, now = new Date()) {
  return meeting.candidates
    .map((candidate) => evaluateCandidate(meeting, candidate, now))
    .sort(compareEvaluations)
}

export function evaluateCandidate(
  meeting: Meeting,
  candidate: Candidate,
  now = new Date(),
): CandidateEvaluation {
  const responses = meeting.responses.filter((response) => response.candidateId === candidate.id)
  const responseByParticipantId = new Map(
    responses.map((response) => [response.participantId, response]),
  )
  const host = meeting.participants.find((participant) => participant.id === meeting.hostId)
  const respondingParticipants = meeting.participants.filter(
    (participant) => participant.id !== meeting.hostId,
  )
  const requiredParticipants = respondingParticipants.filter(
    (participant) => participant.role === 'required',
  )
  const optionalParticipants = respondingParticipants.filter(
    (participant) => participant.role === 'optional',
  )
  const missingRequired = requiredParticipants.filter(
    (participant) => responseByParticipantId.get(participant.id) == null,
  )
  const missingOptional = optionalParticipants.filter(
    (participant) => responseByParticipantId.get(participant.id) == null,
  )
  const requiredUnavailable = participantsWithResponse(
    requiredParticipants,
    responseByParticipantId,
    (response) => response.value === 'unavailable',
  )
  const requiredAdjustable = participantsWithResponse(
    requiredParticipants,
    responseByParticipantId,
    (response) => response.value === 'adjustable',
  )
  const availableCount =
    (host == null ? 0 : 1) +
    respondingParticipants.filter((participant) => {
      const response = responseByParticipantId.get(participant.id)
      return response != null && isAttendableResponse(response.value)
    }).length
  const adjustableCount = respondingParticipants.filter((participant) => {
    const response = responseByParticipantId.get(participant.id)
    return response?.value === 'adjustable'
  }).length
  const preferenceTagCount = responses.reduce(
    (count, response) => count + (response.preferenceTags?.length ?? 0),
    0,
  )
  const unavailableCount = respondingParticipants.filter((participant) => {
    const response = responseByParticipantId.get(participant.id)
    return response?.value === 'unavailable'
  }).length
  const optionalUnavailableCount = optionalParticipants.filter((participant) => {
    const response = responseByParticipantId.get(participant.id)
    return response?.value === 'unavailable'
  }).length
  const respondedCount = respondingParticipants.filter((participant) =>
    responseByParticipantId.has(participant.id),
  ).length
  const responseTargetCount = respondingParticipants.length
  const deadlinePassed = new Date(meeting.responseDeadline).getTime() <= now.getTime()
  const durationMinutes =
    (new Date(candidate.endAt).getTime() - new Date(candidate.startAt).getTime()) / 60_000
  const responseDetails = meeting.participants.map((participant) => ({
    participant,
    response: responseByParticipantId.get(participant.id),
    isImplicitHostAvailable: participant.id === meeting.hostId,
  }))
  const reasons: string[] = []

  let status: CandidateStatus = 'confirmable'
  let actionLabel: string | undefined = '이 시간으로 정하기'

  if (durationMinutes !== meeting.durationMinutes) {
    status = 'excluded'
    reasons.push(`${formatMeetingDuration(meeting.durationMinutes)} 회의 길이와 맞지 않아요.`)
    actionLabel = undefined
  } else if (new Date(candidate.startAt).getTime() <= now.getTime()) {
    status = 'excluded'
    reasons.push('이미 지난 시간이에요.')
    actionLabel = undefined
  } else if (requiredUnavailable.length > 0) {
    status = 'excluded'
    reasons.push(`${names(requiredUnavailable)}님이 참석하기 어려워 이 시간은 정하기 어렵습니다.`)
    actionLabel = undefined
  } else if (missingRequired.length > 0) {
    status = 'waiting_required'
    reasons.push(`${names(missingRequired)}님의 답변을 받으면 정할 수 있어요.`)
    actionLabel = '요청 문구 복사하기'
  } else if (deadlinePassed && availableCount < meeting.minAttendeeCount) {
    status = 'excluded'
    reasons.push(
      `응답 마감이 지났고, 참석 가능한 사람이 ${availableCount}명이라 필요한 ${meeting.minAttendeeCount}명보다 적어요.`,
    )
    actionLabel = undefined
  } else {
    reasons.push(`꼭 와야 하는 ${requiredParticipants.length}명이 모두 가능해요.`)
    reasons.push(`현재 ${availableCount}명이 참석할 수 있어요.`)

    if (availableCount >= meeting.minAttendeeCount) {
      reasons.push(`필요한 ${meeting.minAttendeeCount}명이 모였어요.`)
    } else if (!deadlinePassed) {
      status = 'needs_adjustment'
      reasons.push('아직 답하지 않은 사람이 있어 참석 인원이 달라질 수 있어요.')
      actionLabel = '확인하고 정하기'
    }

    if (status === 'confirmable' && requiredAdjustable.length > 0) {
      status = 'needs_adjustment'
      reasons.push(`${names(requiredAdjustable)}님은 일정을 조정하면 참석할 수 있어요.`)
      actionLabel = '확인하고 정하기'
    } else if (status === 'confirmable' && adjustableCount >= 2) {
      status = 'needs_adjustment'
      reasons.push(`일정 조정이 필요한 사람이 ${adjustableCount}명 있어요.`)
      actionLabel = '확인하고 정하기'
    } else if (status === 'confirmable' && missingOptional.length > 0 && !deadlinePassed) {
      reasons.push('아직 답하지 않은 사람이 있지만 현재 답변만으로도 필요한 인원이 모였어요.')
    } else if (status === 'confirmable' && missingOptional.length > 0 && deadlinePassed) {
      reasons.push('마감이 지나, 아직 답하지 않은 사람은 제외하고 봅니다.')
    } else if (status === 'confirmable' && adjustableCount === 1) {
      reasons.push('일정 조정이 필요한 사람이 1명 있어요.')
    }

    if (preferenceTagCount > 0) {
      reasons.push(`참석은 가능하지만 피하고 싶은 조건이 ${preferenceTagCount}개 있어요.`)
    }
  }

  return {
    candidate,
    status,
    reasons,
    actionLabel,
    availableCount,
    adjustableCount,
    preferenceTagCount,
    unavailableCount,
    optionalUnavailableCount,
    respondedCount,
    responseTargetCount,
    missingRequired,
    missingOptional,
    requiredUnavailable,
    requiredAdjustable,
    responseDetails,
  }
}

export function getCandidateSetStatus(evaluations: CandidateEvaluation[]): CandidateSetStatus {
  if (evaluations.some((evaluation) => evaluation.status === 'confirmable')) {
    return 'has_confirmable'
  }

  if (
    evaluations.length > 0 &&
    evaluations.every((evaluation) => evaluation.status === 'needs_adjustment')
  ) {
    return 'exploration_recommended'
  }

  return 'exploration_required'
}

export function generateConfirmationMessage(meeting: Meeting, evaluation: CandidateEvaluation) {
  const time = new Intl.DateTimeFormat('ko-KR', {
    weekday: 'long',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(evaluation.candidate.startAt))
  const end = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(evaluation.candidate.endAt))
  if (evaluation.adjustableCount > 0) {
    return `${meeting.title}은 ${time}-${end}에 진행할게요.\n앞뒤 일정 조정이 필요한 분은 회의 전 일정 확인 부탁드립니다.`
  }

  if (evaluation.missingOptional.length > 0) {
    return `${meeting.title}은 ${time}-${end}에 진행할게요.\n아직 응답하지 않은 분도 이 시간으로 일정 확인 부탁드립니다.`
  }

  return `${meeting.title}은 ${time}-${end}에 진행할게요.\n일정 확인 부탁드립니다.`
}

export function generateReminderMessage(meeting: Meeting, evaluation: CandidateEvaluation) {
  if (evaluation.missingRequired.length === 0) {
    return '답변을 꼭 받아야 하는 분은 모두 응답했어요.'
  }

  return `${names(evaluation.missingRequired)}님, ${meeting.title} 시간을 정하려고 해요.\n${formatShortTime(evaluation.candidate)} 가능 여부가 있어야 시간을 정할 수 있어요.\n기존 링크에서 이 시간만 확인해 주세요.`
}

export function generateRecoveryRequestMessage(meeting: Meeting, evaluation: CandidateEvaluation) {
  if (evaluation.status === 'waiting_required') {
    return generateReminderMessage(meeting, evaluation)
  }

  if (evaluation.status === 'needs_adjustment') {
    return `${meeting.title}은 ${formatShortTime(evaluation.candidate)}가 가장 유력해요.\n이 시간에 앞뒤 일정 조정이 가능한지 한 번만 확인해 주세요.\n기존 응답은 유지되고, 필요한 후보만 수정하면 됩니다.`
  }

  return `${meeting.title} 후보 시간을 다시 확인하려고 해요.\n기존 응답은 유지됩니다.\n아래 링크에서 바뀐 시간만 확인해 주세요.`
}

function compareEvaluations(a: CandidateEvaluation, b: CandidateEvaluation) {
  return compareRank(rankEvaluation(a), rankEvaluation(b))
}

function rankEvaluation(evaluation: CandidateEvaluation) {
  const statusRank: Record<CandidateStatus, number> = {
    confirmable: 0,
    needs_adjustment: 1,
    waiting_required: 2,
    excluded: 3,
  }

  return [
    statusRank[evaluation.status],
    evaluation.requiredAdjustable.length,
    evaluation.adjustableCount,
    evaluation.preferenceTagCount,
    -evaluation.availableCount,
    evaluation.optionalUnavailableCount,
    new Date(evaluation.candidate.startAt).getTime(),
    -evaluation.respondedCount,
  ]
}

function compareRank(a: number[], b: number[]) {
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return a[index] - b[index]
    }
  }

  return 0
}

function participantsWithResponse(
  participants: Participant[],
  responseByParticipantId: Map<string, Response>,
  predicate: (response: Response) => boolean,
) {
  return participants.filter((participant) => {
    const response = responseByParticipantId.get(participant.id)
    return response != null && predicate(response)
  })
}

function names(participants: Participant[]) {
  return participants.map((participant) => participant.name).join(', ')
}

function formatShortTime(candidate: Candidate) {
  const start = new Date(candidate.startAt)
  const end = new Date(candidate.endAt)
  const day = new Intl.DateTimeFormat('ko-KR', {
    weekday: 'long',
    month: 'numeric',
    day: 'numeric',
  }).format(start)
  const startTime = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(start)
  const endTime = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(end)

  return `${day} ${startTime}-${endTime}`
}
