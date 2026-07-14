import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { createAccountScenarioMeeting, type AccountScenarioId } from '../domain/accountScenarios'
import { evaluateCandidates, type CandidateEvaluation } from '../domain/evaluation'
import { createChangeLog } from '../domain/meetingChanges'
import { createDraftMeeting, createPrototypeMeeting } from '../domain/mockMeeting'
import { createPendingPrototypeState } from '../domain/prototypeState'
import { formatCandidateTime, type Meeting, type Participant } from '../domain/meeting'
import type { DevScreen } from '../components/DevScreenSwitcher'
import type { HostCoordinationState } from '../components/HostShell'
import type { ParticipantCoordinationState } from '../components/ParticipantShell'
import {
  getAudience,
  getInviteTokenFromHash,
  parseRouteHash,
  updateRouteHash,
  type AppRoute,
} from '../lib/appRoutes'
import { useMeetingEditor } from './useMeetingEditor'

export function useMeetCueController() {
  const [route, setRoute] = useState<AppRoute>(() => parseRouteHash())
  const [inviteToken, setInviteToken] = useState<string | undefined>(() => getInviteTokenFromHash())
  const editor = useMeetingEditor(() =>
    parseRouteHash() === 'create' ? createDraftMeeting() : createPrototypeMeeting(),
  )
  const { meeting, setMeeting } = editor
  const [evaluationNow, setEvaluationNow] = useState(() => new Date())
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | undefined>()
  const [requestedParticipantId, setRequestedParticipantId] = useState<string | undefined>()

  const evaluations = useMemo(
    () => evaluateCandidates(meeting, evaluationNow),
    [evaluationNow, meeting],
  )
  const hostState = getHostCoordinationState(meeting, route)
  const audience = getAudience(route)
  const selectedEvaluation = getSelectedEvaluation(
    evaluations,
    selectedCandidateId,
    meeting.confirmedCandidateId,
  )
  const selectedParticipant = meeting.participants.find(
    (participant) => participant.responseToken === inviteToken && participant.id !== meeting.hostId,
  )
  const participantState = selectedParticipant
    ? getParticipantState(meeting, route, selectedParticipant)
    : 'PARTICIPANT_NEW'
  const createMeeting = useMemo(() => getCreateMeeting(meeting, route), [meeting, route])
  const accountMeeting = useMemo(
    () => (meeting.status === 'draft' ? createPrototypeMeeting() : meeting),
    [meeting],
  )

  useEffect(() => {
    if (!window.location.hash) updateRouteHash('create', true)
    function handleRouteChange() {
      setRoute(parseRouteHash())
      setInviteToken(getInviteTokenFromHash())
    }
    window.addEventListener('hashchange', handleRouteChange)
    window.addEventListener('popstate', handleRouteChange)
    return () => {
      window.removeEventListener('hashchange', handleRouteChange)
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setEvaluationNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (route === 'criteria' && meeting.status === 'confirmed') navigateTo('host', true)
  }, [hostState, meeting.status, route])

  function navigateTo(nextRoute: AppRoute, replace = false, participantToken?: string) {
    setRoute(nextRoute)
    setInviteToken(participantToken)
    updateRouteHash(nextRoute, replace, participantToken)
  }

  function remindParticipant(participant: Participant) {
    toast.success(`${participant.name}님에게 응답을 다시 요청했어요`, {
      id: `participant-reminder-${participant.id}`,
    })
  }

  function sendResponseReminder(evaluation: CandidateEvaluation, recipientIds: string[]) {
    toast.success(`${recipientIds.length}명에게 응답을 다시 요청했어요`, {
      id: `candidate-reminder-${evaluation.candidate.id}`,
    })
    setMeeting((current) => ({
      ...current,
      changeLogs: [
        createChangeLog(current, {
          type: 'request_copied',
          candidateId: evaluation.candidate.id,
          description: `${formatCandidateTime(evaluation.candidate)} 응답을 ${recipientIds.length}명에게 다시 요청했어요.`,
        }),
        ...current.changeLogs,
      ].slice(0, 6),
    }))
    setRequestedParticipantId(recipientIds[0])
  }

  function confirmCandidate(candidateId: string) {
    setSelectedCandidateId(candidateId)
    navigateTo('message')
  }

  function completeConfirmation(candidateId: string) {
    setMeeting((current) => ({
      ...current,
      status: 'confirmed',
      confirmedCandidateId: candidateId,
    }))
    setSelectedCandidateId(candidateId)
    toast.success('회의를 확정하고 참석자에게 알렸어요', {
      id: 'confirmation-notification',
    })
  }

  function startNewMeeting() {
    toast.dismiss()
    setMeeting(createDraftMeeting())
    setSelectedCandidateId(undefined)
    setRequestedParticipantId(undefined)
    navigateTo('create')
  }

  function openAccountMeeting(scenarioId: AccountScenarioId = 'product-review') {
    const scenarioMeeting =
      scenarioId === 'product-review' && meeting.title === accountMeeting.title
        ? accountMeeting
        : createAccountScenarioMeeting(scenarioId)
    setMeeting(scenarioMeeting)
    setSelectedCandidateId(scenarioMeeting.confirmedCandidateId)
    navigateTo('host')
  }

  function openAccountRequest(
    scenarioId: AccountScenarioId = 'onboarding',
    responseState: 'new' | 'done' = 'new',
  ) {
    const scenarioMeeting = createAccountScenarioMeeting(scenarioId)
    const participantToken = responseState === 'done' ? 'token-p-minsu' : 'token-p-sujin'
    setMeeting(scenarioMeeting)
    navigateTo(responseState === 'done' ? 'invite-done' : 'invite', false, participantToken)
  }

  function sendResponseRequest() {
    setMeeting((current) => ({ ...current, status: 'collecting' }))
    navigateTo('share')
  }

  function advancePrototypeToPending() {
    const nextState = createPendingPrototypeState(meeting)
    setMeeting(nextState.meeting)
    setSelectedCandidateId(nextState.pendingCandidateId)
    setRequestedParticipantId(undefined)
    toast.dismiss()
    navigateTo('host', true)
  }

  function openDevScreen(screen: DevScreen) {
    if (screen.fixture === 'current') {
      if (meeting.status === 'draft') {
        const fixture = createPrototypeMeeting()
        setMeeting(fixture)
        setSelectedCandidateId(findSujinPendingCandidate(fixture)?.candidate.id)
      }
      toast.dismiss()
      navigateTo(screen.route, false, screen.participantToken)
      return
    }

    const fixture = createFixtureForScreen(screen)
    const pendingEvaluation =
      screen.route === 'host' && screen.fixture === 'collecting'
        ? findSujinPendingCandidate(fixture)
        : undefined
    setMeeting(fixture)
    setSelectedCandidateId(pendingEvaluation?.candidate.id ?? fixture.confirmedCandidateId)
    toast.dismiss()
    navigateTo(screen.route, false, screen.participantToken)
  }

  return {
    ...editor,
    route,
    inviteToken,
    evaluationNow,
    evaluations,
    hostState,
    audience,
    selectedEvaluation,
    selectedParticipant,
    participantState,
    createMeeting,
    accountMeeting,
    selectedCandidateId,
    setSelectedCandidateId,
    requestedParticipantId,
    navigateTo,
    remindParticipant,
    sendResponseReminder,
    confirmCandidate,
    completeConfirmation,
    startNewMeeting,
    openAccountMeeting,
    openAccountRequest,
    sendResponseRequest,
    advancePrototypeToPending,
    openDevScreen,
  }
}

function getCreateMeeting(meeting: Meeting, route: AppRoute) {
  if (route !== 'create' || meeting.status !== 'draft') return meeting
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const candidates = meeting.candidates.filter(
    (candidate) => new Date(candidate.startAt).getTime() >= startOfToday.getTime(),
  )
  return candidates.length === meeting.candidates.length ? meeting : { ...meeting, candidates }
}

function getHostCoordinationState(meeting: Meeting, route: AppRoute): HostCoordinationState {
  if (route === 'create') return 'HOST_DRAFT'
  if (route === 'share') return 'HOST_SHARE_READY'
  if (meeting.status === 'confirmed') return 'HOST_CONFIRMED'
  const completedCount = meeting.participants.filter(
    (participant) =>
      participant.id !== meeting.hostId && participant.responseStatus === 'submitted',
  ).length
  return completedCount === 0 ? 'HOST_WAITING_EMPTY' : 'HOST_DECISION'
}

function getParticipantState(
  meeting: Meeting,
  route: AppRoute,
  participant: Participant,
): ParticipantCoordinationState {
  if (meeting.status === 'confirmed') return 'PARTICIPANT_CONFIRMED'
  if (route === 'invite-done') return 'PARTICIPANT_DONE'
  if (route === 'invite-edit' || participant.responseStatus === 'submitted')
    return 'PARTICIPANT_EDITING'
  return 'PARTICIPANT_NEW'
}

function getSelectedEvaluation(
  evaluations: CandidateEvaluation[],
  selectedCandidateId?: string,
  confirmedCandidateId?: string,
) {
  return (
    evaluations.find((evaluation) => evaluation.candidate.id === confirmedCandidateId) ??
    evaluations.find((evaluation) => evaluation.candidate.id === selectedCandidateId) ??
    evaluations.find((evaluation) => evaluation.status === 'ready') ??
    evaluations.find((evaluation) => evaluation.status === 'pending') ??
    evaluations[0]
  )
}

function findSujinPendingCandidate(meeting: Meeting) {
  return evaluateCandidates(meeting, new Date()).find(
    (evaluation) =>
      evaluation.status === 'pending' &&
      [...evaluation.requiredPending, ...evaluation.optionalPendingPool].some(
        (participant) => participant.id === 'p-sujin',
      ),
  )
}

function createFixtureForScreen(screen: DevScreen) {
  const fixture = screen.fixture === 'draft' ? createDraftMeeting() : createPrototypeMeeting()
  if (screen.fixture === 'waiting') {
    fixture.participants = fixture.participants.map((participant) =>
      participant.id === fixture.hostId
        ? participant
        : { ...participant, responseStatus: 'not_started' },
    )
    fixture.availabilityWindows = fixture.availabilityWindows.filter(
      (window) => window.ownerId === fixture.hostId,
    )
    fixture.responses = []
  }
  if (screen.fixture === 'confirmed') {
    fixture.status = 'confirmed'
    fixture.confirmedCandidateId = fixture.candidates[0]?.id
  }
  return fixture
}
