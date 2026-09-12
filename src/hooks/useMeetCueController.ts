import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  createWorkspace,
  createWorkspaceDraft,
  decodeWorkspace,
  upsertEntry,
  WORKSPACE_STORAGE_KEY,
} from '../domain/workspace'
import { evaluateCandidates, type CandidateEvaluation } from '../domain/evaluation'
import { createChangeLog } from '../domain/meetingChanges'
import { createPrototypeMeeting } from '../domain/mockMeeting'
import {
  createPendingPrototypeState,
  createRespondedPrototypeState,
} from '../domain/prototypeState'
import { formatCandidateTime, type Meeting, type Participant } from '../domain/meeting'
import type { DevScreen } from '../components/DevScreenSwitcher'
import type { HostCoordinationState } from '../components/HostShell'
import type { ParticipantCoordinationState } from '../components/ParticipantShell'
import {
  getAudience,
  getMeetingIdFromHash,
  getInviteTokenFromHash,
  parseRouteHash,
  updateRouteHash,
  type AppRoute,
} from '../lib/appRoutes'
import { useMeetingEditor } from './useMeetingEditor'

export function useMeetCueController() {
  const [rawRoute, setRoute] = useState<AppRoute>(() => parseRouteHash())
  const [routeMeetingId, setRouteMeetingId] = useState(() => getMeetingIdFromHash())
  const [inviteToken, setInviteToken] = useState<string | undefined>(() => getInviteTokenFromHash())
  const [initialWorkspace] = useState(() => {
    try {
      return decodeWorkspace(localStorage.getItem(WORKSPACE_STORAGE_KEY)) ?? createWorkspace()
    } catch {
      return createWorkspace()
    }
  })
  const [entries, setEntries] = useState(initialWorkspace.entries)
  const [readNotificationIds, setReadNotificationIds] = useState(
    initialWorkspace.readNotificationIds,
  )
  const editor = useMeetingEditor(() => {
    const id = getMeetingIdFromHash()
    const token = getInviteTokenFromHash()
    const match = initialWorkspace.entries.find((e) =>
      id
        ? e.meeting.id === id
        : token
          ? e.meeting.participants.some((p) => p.responseToken === token)
          : e.meeting.id === initialWorkspace.activeMeetingId,
    )
    if (parseRouteHash() === 'create')
      return (
        (match?.meeting.status === 'draft'
          ? match.meeting
          : initialWorkspace.entries.find((e) => e.meeting.status === 'draft')?.meeting) ??
        createWorkspaceDraft(`meeting-${crypto.randomUUID()}`)
      )
    return match?.meeting ?? initialWorkspace.entries[0].meeting
  })
  const { meeting, setMeeting } = editor
  const route =
    (rawRoute === 'criteria' && meeting.status === 'confirmed') ||
    (rawRoute === 'create' && meeting.status !== 'draft')
      ? 'host'
      : rawRoute
  const [evaluationNow, setEvaluationNow] = useState(() => new Date())
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | undefined>(
    initialWorkspace.selectedCandidateId,
  )
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
  const accountEntries = useMemo(() => upsertEntry(entries, meeting), [entries, meeting])

  const missingMeeting =
    getAudience(route) !== 'account' &&
    routeMeetingId != null &&
    !accountEntries.some((entry) => entry.meeting.id === routeMeetingId)

  useEffect(() => {
    try {
      localStorage.setItem(
        WORKSPACE_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          entries: accountEntries,
          activeMeetingId: meeting.id,
          selectedCandidateId,
          readNotificationIds,
        }),
      )
    } catch {
      toast.error('이 브라우저에 저장할 공간이 부족해요. 현재 탭에서는 계속 사용할 수 있어요.', {
        id: 'storage-error',
      })
    }
  }, [accountEntries, meeting.id, readNotificationIds, selectedCandidateId])

  const switchMeeting = useCallback(
    (next: Meeting) => {
      setEntries((current) => upsertEntry(current, meeting))
      setMeeting(next)
      setSelectedCandidateId(next.confirmedCandidateId)
      setRequestedParticipantId(undefined)
    },
    [meeting, setMeeting],
  )

  useEffect(() => {
    if (!window.location.hash) updateRouteHash('home', true)
    function handleRouteChange() {
      const nextRoute = parseRouteHash()
      const nextId = getMeetingIdFromHash()
      setRouteMeetingId(nextId)
      const token = getInviteTokenFromHash()
      const target = accountEntries.find((entry) =>
        nextId
          ? entry.meeting.id === nextId
          : token
            ? entry.meeting.participants.some((p) => p.responseToken === token)
            : nextRoute === 'create' && entry.meeting.status === 'draft',
      )
      if (target && target.meeting.id !== meeting.id) switchMeeting(target.meeting)
      setRoute(nextRoute)
      setInviteToken(getInviteTokenFromHash())
    }
    window.addEventListener('hashchange', handleRouteChange)
    window.addEventListener('popstate', handleRouteChange)
    return () => {
      window.removeEventListener('hashchange', handleRouteChange)
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [accountEntries, meeting.id, switchMeeting])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    const titles: Partial<Record<AppRoute, string>> = {
      home: '홈',
      meetings: '내 회의',
      requests: '받은 요청',
      notifications: '알림',
      create: '새 회의',
      host: '회의 결과',
      share: '응답 현황',
      message: '회의 확정',
      criteria: '참석 기준',
      invite: '시간 응답',
      'invite-edit': '응답 수정',
      'invite-done': '응답 완료',
    }
    document.title = `${titles[route] ?? '홈'} · MeetCue`
    const frame = requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('main h1')
      if (heading && document.activeElement?.tagName !== 'INPUT') {
        heading.tabIndex = -1
        heading.focus({ preventScroll: true })
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [inviteToken, route])

  useEffect(() => {
    const timer = window.setInterval(() => setEvaluationNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const navigateTo = useCallback(
    (nextRoute: AppRoute, replace = false, participantToken?: string, meetingId = meeting.id) => {
      setRoute(nextRoute)
      setRouteMeetingId(meetingId)
      setInviteToken(participantToken)
      updateRouteHash(nextRoute, replace, participantToken, meetingId)
    },
    [meeting.id],
  )

  useEffect(() => {
    if (rawRoute !== route && route === 'host') updateRouteHash('host', true, undefined, meeting.id)
  }, [rawRoute, route, meeting.id])

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
    toast.success('회의 시간을 확정했어요', {
      id: 'confirmation-notification',
    })
  }

  function startNewMeeting() {
    toast.dismiss()
    const draft =
      accountEntries.find((entry) => entry.meeting.status === 'draft')?.meeting ??
      createWorkspaceDraft(`meeting-${crypto.randomUUID()}`)
    switchMeeting(draft)
    navigateTo('create', false, undefined, draft.id)
  }

  function openAccountMeeting(id: string) {
    const target = accountEntries.find((entry) => entry.meeting.id === id)
    if (!target) return
    switchMeeting(target.meeting)
    navigateTo(target.meeting.status === 'draft' ? 'create' : 'host', false, undefined, id)
  }

  function openAccountRequest(id: string) {
    const target = accountEntries.find((entry) => entry.meeting.id === id)
    if (!target) return
    const participant = target.meeting.participants.find((p) => p.id === target.participantId)
    if (!participant) return
    switchMeeting(target.meeting)
    navigateTo(
      participant.responseStatus === 'submitted' ? 'invite-done' : 'invite',
      false,
      participant.responseToken,
      id,
    )
  }

  function markNotificationsRead(ids: string[]) {
    setReadNotificationIds((current) => [...new Set([...current, ...ids])])
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
      navigateTo(
        screen.route,
        false,
        screen.participantToken,
        meeting.status === 'draft' ? 'meeting-product-review' : meeting.id,
      )
      return
    }

    const fixture = createFixtureForScreen(screen)
    const pendingEvaluation =
      (screen.route === 'host' || screen.route === 'invite') &&
      (screen.fixture === 'collecting' || screen.fixture === 'pending')
        ? findSujinPendingCandidate(fixture)
        : undefined
    const respondedCandidateId =
      screen.fixture === 'responded' ? fixture.candidates[0]?.id : undefined
    switchMeeting(fixture)
    setSelectedCandidateId(
      pendingEvaluation?.candidate.id ?? respondedCandidateId ?? fixture.confirmedCandidateId,
    )
    setRequestedParticipantId(
      screen.route === 'invite'
        ? fixture.participants.find((p) => p.responseToken === screen.participantToken)?.id
        : undefined,
    )
    toast.dismiss()
    navigateTo(screen.route, false, screen.participantToken, fixture.id)
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
    accountEntries,
    missingMeeting,
    readNotificationIds,
    markNotificationsRead,
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
  const fixture =
    screen.fixture === 'draft'
      ? createWorkspaceDraft('meeting-demo-draft')
      : createPrototypeMeeting()
  if (screen.fixture === 'pending') {
    return createPendingPrototypeState(fixture).meeting
  }
  if (screen.fixture === 'responded') {
    return createRespondedPrototypeState(fixture).meeting
  }
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
