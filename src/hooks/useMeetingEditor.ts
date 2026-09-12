import { applyParticipantSubmission, type ResponseSubmission } from '../domain/participantResponse'
import { useState } from 'react'
import {
  deriveCandidatesFromAvailabilityWindows,
  mergeAvailabilityWindows,
} from '../domain/availability'
import type {
  AvailabilityWindow,
  Meeting,
  MeetingDuration,
  ParticipantRole,
  SchedulingWindow,
} from '../domain/meeting'
import { createChangeLog } from '../domain/meetingChanges'
import type {
  AttendeeDecisionMode,
  AttendanceThresholdMode,
} from '../components/AttendanceCriteriaStep'
import type { AttendanceCriteriaUpdate } from '../components/MeetingCriteriaReviewScreen'

export function useMeetingEditor(initialMeeting: () => Meeting) {
  const [meeting, setMeeting] = useState<Meeting>(initialMeeting)

  function updateTitle(title: string) {
    setMeeting((current) => ({ ...current, title }))
  }

  function updatePurpose(purpose: string) {
    setMeeting((current) => ({ ...current, purpose }))
  }

  function updateReferenceMaterial(referenceMaterial: string) {
    setMeeting((current) => ({ ...current, referenceMaterial }))
  }

  function updateSchedulingWindow(schedulingWindow: SchedulingWindow) {
    setMeeting((current) => {
      const availabilityWindows = current.availabilityWindows.filter((window) => {
        const date = formatDateInput(new Date(window.startAt))
        return date >= schedulingWindow.startDate && date <= schedulingWindow.endDate
      })
      return {
        ...current,
        schedulingWindow,
        responseProposalIds: undefined,
        availabilityWindows,
        candidates: deriveCandidatesFromAvailabilityWindows(
          current.id,
          current.hostId,
          availabilityWindows,
          current.durationMinutes,
        ),
      }
    })
  }

  function updateDuration(durationMinutes: MeetingDuration | null) {
    setMeeting((current) => ({
      ...current,
      durationMinutes,
      responseProposalIds: undefined,
      candidates: deriveCandidatesFromAvailabilityWindows(
        current.id,
        current.hostId,
        current.availabilityWindows,
        durationMinutes,
      ),
    }))
  }

  function updateResponseDeadline(responseDeadline: string) {
    setMeeting((current) => ({ ...current, responseDeadline }))
  }

  function updateAvailabilityWindows(availabilityWindows: AvailabilityWindow[]) {
    setMeeting((current) => {
      const mergedHostWindows = mergeAvailabilityWindows(
        availabilityWindows.filter((window) => window.ownerId === current.hostId),
      )
      const mergedWindows = [
        ...current.availabilityWindows.filter((window) => window.ownerId !== current.hostId),
        ...mergedHostWindows,
      ]
      const candidates = deriveCandidatesFromAvailabilityWindows(
        current.id,
        current.hostId,
        mergedHostWindows,
        current.durationMinutes,
      )
      const candidateIds = new Set(candidates.map((candidate) => candidate.id))
      return {
        ...current,
        availabilityWindows: mergedWindows,
        candidates,
        responseProposalIds: undefined,
        responses: current.responses.filter((response) => candidateIds.has(response.candidateId)),
        confirmedCandidateId:
          current.confirmedCandidateId != null && candidateIds.has(current.confirmedCandidateId)
            ? current.confirmedCandidateId
            : undefined,
      }
    })
  }

  function updateParticipantRole(participantId: string, role: ParticipantRole) {
    setMeeting((current) => {
      const participants = current.participants.map((participant) =>
        participant.id === participantId ? { ...participant, role } : participant,
      )
      const requiredCount = participants.filter(
        (participant) => participant.role === 'required',
      ).length
      return {
        ...current,
        participants,
        minAttendeeCount: Math.max(current.minAttendeeCount, Math.max(1, requiredCount)),
      }
    })
  }

  function updateAttendanceMode(mode: AttendeeDecisionMode) {
    setMeeting((current) => {
      if (mode === 'everyone') {
        return {
          ...current,
          preset: 'all_hands',
          minAttendeeCount: current.participants.length,
          participants: current.participants.map((participant) => ({
            ...participant,
            role: 'required',
          })),
        }
      }
      const participants = current.participants.map((participant) => ({
        ...participant,
        role: participant.id === current.hostId ? ('required' as const) : ('optional' as const),
      }))
      return { ...current, preset: 'core_attendees', minAttendeeCount: 1, participants }
    })
  }

  function updateMinAttendeeCount(minAttendeeCount: number) {
    setMeeting((current) => {
      const requiredCount = current.participants.filter(
        (participant) => participant.role === 'required',
      ).length
      return {
        ...current,
        minAttendeeCount: Math.min(
          current.participants.length,
          Math.max(requiredCount, minAttendeeCount),
        ),
      }
    })
  }

  function updateAttendanceThresholdMode(mode: AttendanceThresholdMode) {
    setMeeting((current) => {
      const requiredCount = current.participants.filter(
        (participant) => participant.role === 'required',
      ).length
      return {
        ...current,
        preset: mode === 'required_only' ? 'core_attendees' : 'quorum',
        minAttendeeCount:
          mode === 'required_only'
            ? requiredCount
            : Math.max(requiredCount, current.minAttendeeCount),
      }
    })
  }

  function applyAttendanceCriteria(criteria: AttendanceCriteriaUpdate) {
    setMeeting((current) => ({
      ...current,
      preset: criteria.preset,
      minAttendeeCount: criteria.minAttendeeCount,
      participants: current.participants.map((participant) => ({
        ...participant,
        role: criteria.participantRoles[participant.id] ?? participant.role,
      })),
    }))
  }

  function addParticipant(name?: string) {
    setMeeting((current) => {
      const nextIndex =
        current.participants.filter((participant) => participant.id !== current.hostId).length + 1
      const participantId = `p-added-${Date.now()}`
      const participantName = name?.trim() || `참석자 ${nextIndex}`
      if (
        current.participants.some(
          (participant) =>
            participant.name.toLocaleLowerCase() === participantName.toLocaleLowerCase(),
        )
      )
        return current
      const role: ParticipantRole = current.preset === 'all_hands' ? 'required' : 'optional'
      const participants = [
        ...current.participants,
        {
          id: participantId,
          meetingId: current.id,
          name: participantName,
          role,
          responseToken: `token-${participantId}`,
          responseStatus: 'not_started' as const,
        },
      ]
      return {
        ...current,
        participants,
        minAttendeeCount:
          current.preset === 'all_hands' ? participants.length : current.minAttendeeCount,
      }
    })
  }

  function removeParticipant(participantId: string) {
    setMeeting((current) => {
      if (participantId === current.hostId || current.participants.length <= 1) return current
      const participants = current.participants.filter(
        (participant) => participant.id !== participantId,
      )
      return {
        ...current,
        participants,
        minAttendeeCount: Math.min(current.minAttendeeCount, participants.length),
        availabilityWindows: current.availabilityWindows.filter(
          (window) => window.ownerId !== participantId,
        ),
        responses: current.responses.filter((response) => response.participantId !== participantId),
      }
    })
  }

  function submitParticipantAvailability(
    participantId: string,
    draftWindows: AvailabilityWindow[],
    submission: ResponseSubmission = { scope: 'range' },
  ) {
    setMeeting((current) => {
      const next = applyParticipantSubmission(current, participantId, draftWindows, submission)
      const participant = current.participants.find((item) => item.id === participantId)!
      const changeLog = createChangeLog(current, {
        type: 'response_updated',
        participantId,
        description: `${participant.name}님이 ${submission.scope === 'candidates' ? '확인한 후보에' : '전체 시간에'} 응답했어요.`,
      })
      return { ...next, changeLogs: [changeLog, ...current.changeLogs].slice(0, 6) }
    })
  }

  return {
    meeting,
    setMeeting,
    updateTitle,
    updatePurpose,
    updateReferenceMaterial,
    updateSchedulingWindow,
    updateDuration,
    updateResponseDeadline,
    updateAvailabilityWindows,
    updateParticipantRole,
    updateAttendanceMode,
    updateMinAttendeeCount,
    updateAttendanceThresholdMode,
    applyAttendanceCriteria,
    addParticipant,
    removeParticipant,
    submitParticipantAvailability,
  }
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
