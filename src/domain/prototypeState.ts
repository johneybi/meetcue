import type { AvailabilityWindow, Meeting, Response, ResponseValue } from './meeting'

export function createPendingPrototypeState(meeting: Meeting) {
  const invitees = meeting.participants.filter((participant) => participant.id !== meeting.hostId)
  const requiredCount = meeting.participants.filter(
    (participant) => participant.role === 'required',
  ).length
  const optionalTarget =
    invitees.find(
      (participant) =>
        participant.role === 'optional' &&
        participant.responseStatus !== 'submitted' &&
        meeting.minAttendeeCount > requiredCount,
    ) ??
    invitees.find(
      (participant) => participant.role === 'optional' && meeting.minAttendeeCount > requiredCount,
    )
  const target =
    optionalTarget ??
    invitees.find((participant) => participant.role === 'required') ??
    invitees.at(-1)
  const pendingTarget = invitees.length > 1 ? target : undefined
  const pendingCandidate = meeting.candidates[0]

  if (target == null || pendingCandidate == null) {
    return { meeting, target: undefined, pendingCandidateId: undefined }
  }

  const requiredUnavailableId = invitees.find(
    (participant) => participant.role === 'required' && participant.id !== target.id,
  )?.id
  const responses: Response[] = []
  const responseWindows: AvailabilityWindow[] = []

  meeting.candidates.forEach((candidate, candidateIndex) => {
    const candidateResponses = new Map<string, ResponseValue>()
    if (candidateIndex === 0) {
      let committedCount = 1
      invitees.forEach((participant) => {
        if (participant.id === pendingTarget?.id) return
        if (participant.role === 'required') {
          candidateResponses.set(participant.id, 'available')
          committedCount += 1
        }
      })
      invitees.forEach((participant) => {
        if (participant.id === pendingTarget?.id || participant.role === 'required') return
        const shouldCommit = committedCount < meeting.minAttendeeCount - 1
        candidateResponses.set(participant.id, shouldCommit ? 'available' : 'unavailable')
        if (shouldCommit) committedCount += 1
      })
    } else if (candidateIndex === 2) {
      invitees.forEach((participant) => {
        candidateResponses.set(
          participant.id,
          requiredUnavailableId == null || participant.id === requiredUnavailableId
            ? 'unavailable'
            : 'available',
        )
      })
    } else {
      invitees.forEach((participant) => {
        if (participant.id === pendingTarget?.id && candidateIndex % 2 === 0) return
        candidateResponses.set(
          participant.id,
          participant.role === 'required' || candidateIndex % 3 !== 0 ? 'available' : 'adjustable',
        )
      })
    }

    candidateResponses.forEach((value, participantId) => {
      responses.push({
        id: `response-${participantId}-${candidate.id}`,
        participantId,
        candidateId: candidate.id,
        value,
        updatedAt: new Date().toISOString(),
        updateSource: 'initial',
      })
      responseWindows.push({
        id: `aw-${participantId}-${candidate.id}`,
        meetingId: meeting.id,
        ownerId: participantId,
        startAt: candidate.startAt,
        endAt: candidate.endAt,
        state: value,
      })
    })
  })

  return {
    meeting: {
      ...meeting,
      status: 'collecting' as const,
      participants: meeting.participants.map((participant) =>
        participant.id === meeting.hostId
          ? participant
          : {
              ...participant,
              responseStatus:
                participant.id === pendingTarget?.id
                  ? ('not_started' as const)
                  : ('submitted' as const),
            },
      ),
      availabilityWindows: [
        ...meeting.availabilityWindows.filter((window) => window.ownerId === meeting.hostId),
        ...responseWindows,
      ],
      responses,
    },
    target: pendingTarget,
    pendingCandidateId: pendingCandidate.id,
  }
}

export function createRespondedPrototypeState(meeting: Meeting) {
  const pendingState = createPendingPrototypeState(meeting)
  const target = pendingState.target
  const candidate = pendingState.meeting.candidates.find(
    (item) => item.id === pendingState.pendingCandidateId,
  )

  if (target == null || candidate == null) return pendingState

  return {
    ...pendingState,
    meeting: {
      ...pendingState.meeting,
      participants: pendingState.meeting.participants.map((participant) =>
        participant.id === target.id
          ? { ...participant, responseStatus: 'submitted' as const }
          : participant,
      ),
      availabilityWindows: [
        ...pendingState.meeting.availabilityWindows,
        {
          id: `aw-${target.id}-${candidate.id}-demo-response`,
          meetingId: pendingState.meeting.id,
          ownerId: target.id,
          startAt: candidate.startAt,
          endAt: candidate.endAt,
          state: 'available' as const,
        },
      ],
      responses: [
        ...pendingState.meeting.responses,
        {
          id: `response-${target.id}-${candidate.id}-demo-response`,
          participantId: target.id,
          candidateId: candidate.id,
          value: 'available' as const,
          updatedAt: new Date().toISOString(),
          updateSource: 'participant_edit' as const,
        },
      ],
    },
  }
}
