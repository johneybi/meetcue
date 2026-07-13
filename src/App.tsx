import {
  Fragment,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { CalendarDate, getLocalTimeZone, startOfWeek, today } from '@internationalized/date'
import { Toaster, toast } from 'sonner'
import {
  Bell,
  CalendarCheck2,
  CalendarDays,
  Check,
  Clock3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  Inbox,
  Minus,
  Paperclip,
  PanelsTopLeft,
  Plus,
  RotateCcw,
  Star,
  X,
} from 'lucide-react'
import {
  createDefaultHostAvailabilityWindows,
  deriveAvailabilitySlots,
  deriveCandidatesFromAvailabilityWindows,
  deriveParticipantResponses,
  fillAvailabilitySlots,
  getAvailabilityStateForSlot,
  mergeAvailabilityWindows,
  removeAvailabilityRange,
  replaceAvailabilitySlot,
  type AvailabilitySlot,
} from './domain/availability'
import {
  evaluateCandidates,
  generateConfirmationMessage,
  hasSameRecommendationPriority,
  selectCandidateShortlist,
  type CandidateEvaluation,
} from './domain/evaluation'
import { createDraftMeeting, createPrototypeMeeting } from './domain/mockMeeting'
import {
  candidateStatusLabels,
  formatCandidateTime,
  formatDeadline,
  formatMeetingDuration,
  formatSchedulingWindow,
  participantRoleLabels,
  type AvailabilityWindow,
  type CandidateStatus,
  type ChangeLog,
  type Meeting,
  type MeetingDuration,
  type Participant,
  type ParticipantRole,
  type Response,
  type ResponseValue,
  type SchedulingWindow,
} from './domain/meeting'
import { ParticipantTimeGrid } from './components/ParticipantTimeGrid'
import './App.css'

const meetCueEmblemUrl = `${import.meta.env.BASE_URL}brand/meetcue-emblem-64.png`
const isTossDemoPath = /(?:^|\/)toss\/?$/.test(window.location.pathname)

type AppRoute =
  | 'entry'
  | 'home'
  | 'meetings'
  | 'requests'
  | 'notifications'
  | 'create'
  | 'criteria'
  | 'share'
  | 'host'
  | 'message'
  | 'invite'
  | 'invite-edit'
  | 'invite-done'

type Audience = 'account' | 'host' | 'participant'

type HostCoordinationState =
  'HOST_DRAFT' | 'HOST_SHARE_READY' | 'HOST_WAITING_EMPTY' | 'HOST_DECISION' | 'HOST_CONFIRMED'

type ParticipantCoordinationState =
  'PARTICIPANT_NEW' | 'PARTICIPANT_EDITING' | 'PARTICIPANT_DONE' | 'PARTICIPANT_CONFIRMED'

type HostCreateStep = 'meeting' | 'attendees' | 'times' | 'review'
type TimeCreateStep = 'constraints' | 'candidates' | 'deadline'
type ScopeBrushMode = 'exclude' | 'add'
type AttendeeDecisionMode = 'everyone' | 'required'
type AttendanceThresholdMode = 'required_only' | 'minimum_count'
type ParticipantInputSource = 'calendar' | 'manual' | 'existing'
type AccountScenarioId = 'product-review' | 'onboarding' | 'quarterly-goals' | 'design-qa'

type DevScreen = {
  label: string
  route: AppRoute
  fixture: 'draft' | 'waiting' | 'collecting' | 'confirmed' | 'current'
  participantToken?: string
}

const devScreenGroups: Array<{ label: string; screens: DevScreen[] }> = [
  {
    label: '핵심 시연',
    screens: [
      { label: '1. 생성', route: 'create', fixture: 'draft' },
      { label: '2. PENDING 결과', route: 'host', fixture: 'collecting' },
      {
        label: '3. 수진 응답',
        route: 'invite',
        fixture: 'current',
        participantToken: 'token-p-sujin',
      },
      { label: '4. 재판정 결과', route: 'host', fixture: 'current' },
      { label: '5. 확정', route: 'host', fixture: 'confirmed' },
    ],
  },
  {
    label: '주최자',
    screens: [
      { label: '회의 만들기', route: 'create', fixture: 'draft' },
      { label: '요청 발송 완료', route: 'share', fixture: 'collecting' },
      { label: '응답 대기', route: 'host', fixture: 'waiting' },
      { label: '결과 확인', route: 'host', fixture: 'collecting' },
      { label: '참석 기준', route: 'criteria', fixture: 'collecting' },
      { label: '확정 안내', route: 'host', fixture: 'confirmed' },
    ],
  },
  {
    label: '참석자 fixture',
    screens: [
      {
        label: '수진 · 신규',
        route: 'invite',
        fixture: 'collecting',
        participantToken: 'token-p-sujin',
      },
      {
        label: '민수 · 수정',
        route: 'invite-edit',
        fixture: 'collecting',
        participantToken: 'token-p-minsu',
      },
      {
        label: '서연 · 수정',
        route: 'invite-edit',
        fixture: 'collecting',
        participantToken: 'token-p-seoyeon',
      },
      {
        label: '준호 · 수정',
        route: 'invite-edit',
        fixture: 'collecting',
        participantToken: 'token-p-junho',
      },
      {
        label: '하나 · 수정',
        route: 'invite-edit',
        fixture: 'collecting',
        participantToken: 'token-p-hana',
      },
      {
        label: '민수 · 완료',
        route: 'invite-done',
        fixture: 'collecting',
        participantToken: 'token-p-minsu',
      },
      { label: '잘못된 링크', route: 'invite', fixture: 'collecting' },
    ],
  },
  {
    label: '후속 제품 · P0 보류',
    screens: [
      { label: '홈', route: 'home', fixture: 'collecting' },
      { label: '내 회의', route: 'meetings', fixture: 'collecting' },
      { label: '받은 요청', route: 'requests', fixture: 'collecting' },
      { label: '알림', route: 'notifications', fixture: 'collecting' },
    ],
  },
]

const demoGuideSteps: Array<
  DevScreen & { title: string; description: string }
> = [
  {
    label: '1',
    title: '회의 만들기',
    description: '회의 정보와 참석 기준, 확인할 시간 범위를 정해요.',
    route: 'create',
    fixture: 'draft',
  },
  {
    label: '2',
    title: '응답이 필요한 상황',
    description: '현재 응답만으로 무엇을 결정할 수 있는지 확인해요.',
    route: 'host',
    fixture: 'collecting',
  },
  {
    label: '3',
    title: '참석자 응답',
    description: '캘린더를 불러오고 가능한 시간을 직접 조정해요.',
    route: 'invite',
    fixture: 'current',
    participantToken: 'token-p-sujin',
  },
  {
    label: '4',
    title: '바뀐 결과 확인',
    description: '새 응답이 후보 시간과 판단 근거에 반영된 모습을 봐요.',
    route: 'host',
    fixture: 'current',
  },
  {
    label: '5',
    title: '회의 확정',
    description: '참석 부담을 확인하고 최종 시간을 확정해요.',
    route: 'host',
    fixture: 'confirmed',
  },
]

const SHOW_DURATION_CONTROLS = true

const attendeeDecisionOptions: Array<{
  id: AttendeeDecisionMode
  label: string
  description: string
}> = [
  {
    id: 'everyone',
    label: '모두 참석해야 해요',
    description: '모두가 참석할 수 있는 시간만 보여드려요.',
  },
  {
    id: 'required',
    label: '몇 명은 빠져도 진행할 수 있어요',
    description: '꼭 참석해야 하는 사람과 최소 참석 인원을 기준으로 시간을 찾아요.',
  },
]

const attendeeDirectory = ['유진', '현우', '다은', '도윤']
const recentInviteesStorageKey = 'confirmation-board-recent-invitees'

const participantResponseLabels: Record<ResponseValue, string> = {
  available: '가능해요',
  adjustable: '조정하면 가능해요',
  unavailable: '참석하기 어려워요',
}
const candidateStatusOrder: CandidateStatus[] = ['ready', 'pending', 'impossible']

function getSimulatedCalendarEvent(slot: AvailabilitySlot) {
  const date = new Date(slot.startAt)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? 0)
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? ''
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)

  if (weekday === 'Tue' && hour === 14) {
    return {
      id: `${day}-design-review`,
      title: '디자인 리뷰',
      timeLabel: '오후 2:00-오후 3:00',
      segment: minute === 0 ? ('start' as const) : ('end' as const),
    }
  }

  if (weekday === 'Wed' && hour === 10) {
    return {
      id: `${day}-daily`,
      title: '제품팀 데일리',
      timeLabel: '오전 10:00-오전 11:00',
      segment: minute === 0 ? ('start' as const) : ('end' as const),
    }
  }

  if (weekday === 'Thu' && hour === 14) {
    return {
      id: `${day}-partner-meeting`,
      title: '파트너사 미팅',
      timeLabel: '오후 2:00-오후 3:00',
      segment: minute === 0 ? ('start' as const) : ('end' as const),
    }
  }

  return null
}

function isSimulatedCalendarBusy(slot: AvailabilitySlot) {
  return getSimulatedCalendarEvent(slot) != null
}


const createSteps: Array<{
  id: HostCreateStep
  label: string
  eyebrow: string
  title: string
  description: string
}> = [
  {
    id: 'meeting',
    label: '회의 정보',
    eyebrow: '1단계',
    title: '어떤 회의인지 알려주세요',
    description: '참석자가 요청을 열었을 때 바로 이해할 수 있도록 필요한 정보만 적어주세요.',
  },
  {
    id: 'attendees',
    label: '참석자',
    eyebrow: '2단계',
    title: '누구와 회의하나요?',
    description: '응답을 받을 사람을 고르고, 회의를 열기 위한 참석 기준을 정해요.',
  },
  {
    id: 'times',
    label: '시간 범위',
    eyebrow: '3단계',
    title: '언제 모일 수 있는지 확인해 볼까요?',
    description: '회의 길이와 확인할 날짜·시간 범위를 정해 주세요.',
  },
  {
    id: 'review',
    label: '최종 확인',
    eyebrow: '4단계',
    title: '이 내용으로 응답을 요청할까요?',
    description: '참석자에게 보일 회의 정보와 시간 범위를 확인해 주세요.',
  },
]

const routeHashes: Record<AppRoute, string> = {
  entry: '#/',
  home: '#/home',
  meetings: '#/meetings',
  requests: '#/requests',
  notifications: '#/notifications',
  create: '#/create',
  criteria: '#/criteria',
  share: '#/share',
  host: '#/host',
  message: '#/message',
  invite: '#/invite',
  'invite-edit': '#/invite/edit',
  'invite-done': '#/invite/done',
}

const hostStateCopy: Record<HostCoordinationState, { title: string; description: string }> = {
  HOST_DRAFT: {
    title: '회의 정보를 입력해 주세요',
    description: '참석자가 응답하기 전에 회의 정보와 참석 기준을 정해요.',
  },
  HOST_SHARE_READY: {
    title: '참석자에게 응답을 요청했어요',
    description: '참석자는 받은 요청에서 가능한 시간을 알려줄 수 있어요.',
  },
  HOST_WAITING_EMPTY: {
    title: '아직 받은 응답이 없어요',
    description: '첫 응답이 저장되면 정할 수 있는 시간을 확인할 수 있어요.',
  },
  HOST_DECISION: {
    title: '지금 정할 수 있는 시간을 확인해 보세요',
    description: '바로 정할 수 있는 시간과 아직 응답이 필요한 시간을 나눠서 보여드려요.',
  },
  HOST_CONFIRMED: {
    title: '회의 시간을 확정했어요',
    description: '확정 알림을 참석자에게 보낼 수 있어요.',
  },
}

function parseRouteHash(): AppRoute {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [first, second, third] = parts

  if (first == null) return 'create'
  if (import.meta.env.DEV && first === 'home') return 'home'
  if (import.meta.env.DEV && first === 'meetings') return 'meetings'
  if (import.meta.env.DEV && first === 'requests') return 'requests'
  if (import.meta.env.DEV && first === 'notifications') return 'notifications'
  if (first === 'results' || first === 'host') return 'host'
  if (first === 'explore' || first === 'recover') return 'host'
  if (first === 'create') return 'create'
  if (first === 'criteria') return 'criteria'
  if (first === 'share') return 'share'
  if (first === 'message') return 'message'

  if (first === 'respond' || first === 'invite') {
    const stateSegment = second?.startsWith('token-') ? third : second
    if (stateSegment === 'edit') return 'invite-edit'
    if (stateSegment === 'added') return 'invite'
    if (stateSegment === 'done') return 'invite-done'
    return 'invite'
  }

  return 'create'
}

function getInviteTokenFromHash() {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  return parts[0] === 'invite' && parts[1]?.startsWith('token-') ? parts[1] : undefined
}

function getAudience(route: AppRoute): Audience {
  if (
    route === 'entry' ||
    route === 'home' ||
    route === 'meetings' ||
    route === 'requests' ||
    route === 'notifications'
  ) {
    return 'account'
  }
  if (route.startsWith('invite')) return 'participant'
  return 'host'
}

function updateRouteHash(route: AppRoute, replace = false, participantToken?: string) {
  const participantSuffix = route === 'invite-edit' ? 'edit' : route === 'invite-done' ? 'done' : ''
  const nextHash =
    route.startsWith('invite') && participantToken
      ? `#/invite/${participantToken}${participantSuffix ? `/${participantSuffix}` : ''}`
      : routeHashes[route]

  if (window.location.hash === nextHash) return

  if (replace) {
    window.history.replaceState(null, '', nextHash)
    return
  }

  window.history.pushState(null, '', nextHash)
}

function createChangeLog(
  meeting: Meeting,
  input: {
    type: ChangeLog['type']
    description: string
    candidateId?: string
    participantId?: string
  },
): ChangeLog {
  return {
    id: `change-${Date.now()}-${meeting.changeLogs.length}`,
    meetingId: meeting.id,
    type: input.type,
    description: input.description,
    candidateId: input.candidateId,
    participantId: input.participantId,
    createdAt: new Date().toISOString(),
  }
}

function createPendingPrototypeState(meeting: Meeting) {
  const invitees = meeting.participants.filter((participant) => participant.id !== meeting.hostId)
  const requiredCount = meeting.participants.filter(
    (participant) => participant.role === 'required',
  ).length
  const optionalTarget = invitees.find(
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

function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRouteHash())
  const [inviteToken, setInviteToken] = useState<string | undefined>(() => getInviteTokenFromHash())
  const [meeting, setMeeting] = useState<Meeting>(() =>
    parseRouteHash() === 'create' ? createDraftMeeting() : createPrototypeMeeting(),
  )
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
  const participantState =
    selectedParticipant != null
      ? getParticipantState(meeting, route, selectedParticipant)
      : 'PARTICIPANT_NEW'
  const createMeeting = useMemo(() => {
    if (route !== 'create' || meeting.status !== 'draft') {
      return meeting
    }

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const selectableCandidates = meeting.candidates.filter(
      (candidate) => new Date(candidate.startAt).getTime() >= startOfToday.getTime(),
    )

    return selectableCandidates.length === meeting.candidates.length
      ? meeting
      : { ...meeting, candidates: selectableCandidates }
  }, [meeting, route])
  const accountMeeting = useMemo(
    () => (meeting.status === 'draft' ? createPrototypeMeeting() : meeting),
    [meeting],
  )

  useEffect(() => {
    if (!window.location.hash) {
      updateRouteHash('create', true)
    }

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
    if (route === 'message' && hostState !== 'HOST_CONFIRMED') {
      navigateTo('host', true)
      return
    }

    if (route === 'criteria' && meeting.status === 'confirmed') {
      navigateTo('host', true)
    }
  }, [hostState, meeting.status, route])

  function navigateTo(nextRoute: AppRoute, replace = false, participantToken?: string) {
    setRoute(nextRoute)
    setInviteToken(participantToken)
    updateRouteHash(nextRoute, replace, participantToken)
  }

  function updateTitle(title: string) {
    setMeeting((currentMeeting) => ({ ...currentMeeting, title }))
  }

  function updatePurpose(purpose: string) {
    setMeeting((currentMeeting) => ({ ...currentMeeting, purpose }))
  }

  function updateReferenceMaterial(referenceMaterial: string) {
    setMeeting((currentMeeting) => ({ ...currentMeeting, referenceMaterial }))
  }

  function updateSchedulingWindow(schedulingWindow: SchedulingWindow) {
    setMeeting((currentMeeting) => {
      const availabilityWindows = currentMeeting.availabilityWindows.filter((window) => {
        const date = formatDateInput(new Date(window.startAt))
        return date >= schedulingWindow.startDate && date <= schedulingWindow.endDate
      })

      return {
        ...currentMeeting,
        schedulingWindow,
        availabilityWindows,
        candidates: deriveCandidatesFromAvailabilityWindows(
          currentMeeting.id,
          currentMeeting.hostId,
          availabilityWindows,
          currentMeeting.durationMinutes,
        ),
      }
    })
  }

  function updateDuration(durationMinutes: MeetingDuration | null) {
    setMeeting((currentMeeting) => ({
      ...currentMeeting,
      durationMinutes,
      candidates: deriveCandidatesFromAvailabilityWindows(
        currentMeeting.id,
        currentMeeting.hostId,
        currentMeeting.availabilityWindows,
        durationMinutes,
      ),
    }))
  }

  function updateResponseDeadline(responseDeadline: string) {
    setMeeting((currentMeeting) => ({ ...currentMeeting, responseDeadline }))
  }

  function updateAvailabilityWindows(availabilityWindows: AvailabilityWindow[]) {
    setMeeting((currentMeeting) => {
      const mergedHostWindows = mergeAvailabilityWindows(
        availabilityWindows.filter((window) => window.ownerId === currentMeeting.hostId),
      )
      const mergedWindows = [
        ...currentMeeting.availabilityWindows.filter(
          (window) => window.ownerId !== currentMeeting.hostId,
        ),
        ...mergedHostWindows,
      ]
      const candidates = deriveCandidatesFromAvailabilityWindows(
        currentMeeting.id,
        currentMeeting.hostId,
        mergedHostWindows,
        currentMeeting.durationMinutes,
      )
      const candidateIds = new Set(candidates.map((candidate) => candidate.id))

      return {
        ...currentMeeting,
        availabilityWindows: mergedWindows,
        candidates,
        responses: currentMeeting.responses.filter((response) =>
          candidateIds.has(response.candidateId),
        ),
        confirmedCandidateId:
          currentMeeting.confirmedCandidateId != null &&
          candidateIds.has(currentMeeting.confirmedCandidateId)
            ? currentMeeting.confirmedCandidateId
            : undefined,
      }
    })
  }

  function updateParticipantRole(participantId: string, role: ParticipantRole) {
    setMeeting((currentMeeting) => {
      const participants = currentMeeting.participants.map((participant) =>
        participant.id === participantId ? { ...participant, role } : participant,
      )
      const requiredCount = participants.filter(
        (participant) => participant.role === 'required',
      ).length

      return {
        ...currentMeeting,
        participants,
        minAttendeeCount: Math.max(currentMeeting.minAttendeeCount, Math.max(1, requiredCount)),
      }
    })
  }

  function updateAttendanceMode(mode: AttendeeDecisionMode) {
    setMeeting((currentMeeting) => {
      if (mode === 'everyone') {
        return {
          ...currentMeeting,
          preset: 'all_hands',
          minAttendeeCount: currentMeeting.participants.length,
          participants: currentMeeting.participants.map((participant) => ({
            ...participant,
            role: 'required',
          })),
        }
      }

      const participants = currentMeeting.participants.map((participant) => ({
        ...participant,
        role:
          participant.id === currentMeeting.hostId ? ('required' as const) : ('optional' as const),
      }))

      return {
        ...currentMeeting,
        preset: 'core_attendees',
        minAttendeeCount: 1,
        participants,
      }
    })
  }

  function updateMinAttendeeCount(minAttendeeCount: number) {
    setMeeting((currentMeeting) => {
      const requiredCount = currentMeeting.participants.filter(
        (participant) => participant.role === 'required',
      ).length

      return {
        ...currentMeeting,
        minAttendeeCount: Math.min(
          currentMeeting.participants.length,
          Math.max(requiredCount, minAttendeeCount),
        ),
      }
    })
  }

  function updateAttendanceThresholdMode(mode: AttendanceThresholdMode) {
    setMeeting((currentMeeting) => {
      const requiredCount = currentMeeting.participants.filter(
        (participant) => participant.role === 'required',
      ).length

      return {
        ...currentMeeting,
        preset: mode === 'required_only' ? 'core_attendees' : 'quorum',
        minAttendeeCount:
          mode === 'required_only'
            ? requiredCount
            : Math.max(requiredCount, currentMeeting.minAttendeeCount),
      }
    })
  }

  function addParticipant(name?: string) {
    setMeeting((currentMeeting) => {
      const nextIndex =
        currentMeeting.participants.filter(
          (participant) => participant.id !== currentMeeting.hostId,
        ).length + 1
      const participantId = `p-added-${Date.now()}`
      const participantName = name?.trim() || `참석자 ${nextIndex}`

      if (
        currentMeeting.participants.some(
          (participant) =>
            participant.name.toLocaleLowerCase() === participantName.toLocaleLowerCase(),
        )
      ) {
        return currentMeeting
      }

      const participantRole: ParticipantRole =
        currentMeeting.preset === 'all_hands' ? 'required' : 'optional'
      const participants = [
        ...currentMeeting.participants,
        {
          id: participantId,
          meetingId: currentMeeting.id,
          name: participantName,
          role: participantRole,
          responseToken: `token-${participantId}`,
          responseStatus: 'not_started' as const,
        },
      ]

      return {
        ...currentMeeting,
        participants,
        minAttendeeCount:
          currentMeeting.preset === 'all_hands'
            ? participants.length
            : currentMeeting.minAttendeeCount,
      }
    })
  }

  function removeParticipant(participantId: string) {
    setMeeting((currentMeeting) => {
      if (participantId === currentMeeting.hostId || currentMeeting.participants.length <= 1) {
        return currentMeeting
      }

      const participants = currentMeeting.participants.filter(
        (participant) => participant.id !== participantId,
      )

      return {
        ...currentMeeting,
        participants,
        minAttendeeCount: Math.min(currentMeeting.minAttendeeCount, participants.length),
        availabilityWindows: currentMeeting.availabilityWindows.filter(
          (window) => window.ownerId !== participantId,
        ),
        responses: currentMeeting.responses.filter(
          (response) => response.participantId !== participantId,
        ),
      }
    })
  }

  function submitParticipantAvailability(
    participantId: string,
    participantDraftWindows: AvailabilityWindow[],
  ) {
    setMeeting((currentMeeting) => {
      const slots = deriveAvailabilitySlots(
        currentMeeting.availabilityWindows,
        currentMeeting.hostId,
      )
      const unansweredWindows = slots
        .filter(
          (slot) =>
            getAvailabilityStateForSlot(participantDraftWindows, participantId, slot) == null,
        )
        .map((slot) => ({
          id: `aw-${participantId}-${new Date(slot.startAt).getTime()}`,
          meetingId: currentMeeting.id,
          ownerId: participantId,
          startAt: slot.startAt,
          endAt: slot.endAt,
          state: 'unavailable' as const,
        }))
      const availabilityWindows = mergeAvailabilityWindows([
        ...currentMeeting.availabilityWindows.filter((window) => window.ownerId !== participantId),
        ...participantDraftWindows,
        ...unansweredWindows,
      ])
      const responses = deriveParticipantResponses(
        participantId,
        currentMeeting.candidates,
        availabilityWindows,
        new Date().toISOString(),
      )
      const participant = currentMeeting.participants.find((item) => item.id === participantId)
      const changeLog =
        participant == null
          ? undefined
          : createChangeLog(currentMeeting, {
              type: 'response_updated',
              participantId,
              description: `${participant.name}님이 가능한 시간대 응답을 저장했어요.`,
            })

      return {
        ...currentMeeting,
        availabilityWindows,
        participants: currentMeeting.participants.map((item) =>
          item.id === participantId ? { ...item, responseStatus: 'submitted' as const } : item,
        ),
        responses: [
          ...currentMeeting.responses.filter(
            (response) => response.participantId !== participantId,
          ),
          ...responses,
        ],
        changeLogs:
          changeLog == null
            ? currentMeeting.changeLogs
            : [changeLog, ...currentMeeting.changeLogs].slice(0, 6),
      }
    })
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
    setMeeting((currentMeeting) => ({
      ...currentMeeting,
      changeLogs: [
        createChangeLog(currentMeeting, {
          type: 'request_copied',
          candidateId: evaluation.candidate.id,
          description: `${formatCandidateTime(evaluation.candidate)} 응답을 ${recipientIds.length}명에게 다시 요청했어요.`,
        }),
        ...currentMeeting.changeLogs,
      ].slice(0, 6),
    }))
    setRequestedParticipantId(recipientIds[0])
  }

  function confirmCandidate(candidateId: string) {
    setMeeting((currentMeeting) => ({
      ...currentMeeting,
      status: 'confirmed',
      confirmedCandidateId: candidateId,
    }))
    setSelectedCandidateId(candidateId)
    navigateTo('message')
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
    setMeeting((currentMeeting) => ({ ...currentMeeting, status: 'collecting' }))
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
        const pendingEvaluation = evaluateCandidates(fixture, new Date()).find(
          (evaluation) =>
            evaluation.status === 'pending' &&
            [...evaluation.requiredPending, ...evaluation.optionalPendingPool].some(
              (participant) => participant.id === 'p-sujin',
            ),
        )
        setMeeting(fixture)
        setSelectedCandidateId(pendingEvaluation?.candidate.id)
      }
      toast.dismiss()
      navigateTo(screen.route, false, screen.participantToken)
      return
    }

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

    const pendingEvaluation =
      screen.route === 'host' && screen.fixture === 'collecting'
        ? evaluateCandidates(fixture, new Date()).find(
            (evaluation) =>
              evaluation.status === 'pending' &&
              [...evaluation.requiredPending, ...evaluation.optionalPendingPool].some(
                (participant) => participant.id === 'p-sujin',
              ),
          )
        : undefined

    setMeeting(fixture)
    setSelectedCandidateId(pendingEvaluation?.candidate.id ?? fixture.confirmedCandidateId)
    toast.dismiss()
    navigateTo(screen.route, false, screen.participantToken)
  }

  return (
    <div data-astryx-theme="neutral" data-theme="light">
      <div>
        {audience === 'account' ? (
          <AccountShell
            route={route === 'entry' ? 'home' : route}
            onNavigate={navigateTo}
            onCreate={startNewMeeting}
          >
            {route === 'entry' || route === 'home' ? (
              <AccountHomeScreen
                meeting={accountMeeting}
                onOpenRequest={() => openAccountRequest('onboarding')}
                onOpenMeeting={() => openAccountMeeting('product-review')}
                onOpenConfirmed={() => openAccountMeeting('quarterly-goals')}
                onCreate={startNewMeeting}
              />
            ) : null}
            {route === 'meetings' ? (
              <MeetingsScreen meeting={accountMeeting} onOpenMeeting={openAccountMeeting} />
            ) : null}
            {route === 'requests' ? (
              <RequestsScreen meeting={accountMeeting} onOpenRequest={openAccountRequest} />
            ) : null}
            {route === 'notifications' ? (
              <NotificationsScreen
                meeting={accountMeeting}
                onOpenRequest={openAccountRequest}
                onOpenMeeting={openAccountMeeting}
              />
            ) : null}
          </AccountShell>
        ) : null}

        {audience === 'participant' && selectedParticipant == null ? (
          <InvalidParticipantInviteScreen meeting={meeting} onExit={startNewMeeting} />
        ) : null}

        {audience === 'participant' && selectedParticipant != null ? (
          <ParticipantShell
            key={`${selectedParticipant.id}-${participantState}`}
            meeting={meeting}
            participant={selectedParticipant}
            state={participantState}
            now={evaluationNow}
            onSubmit={(participantDraftWindows) => {
              submitParticipantAvailability(selectedParticipant.id, participantDraftWindows)
              navigateTo('invite-done', false, selectedParticipant.responseToken)
            }}
            onEdit={() => navigateTo('invite-edit', false, selectedParticipant.responseToken)}
            onExit={() => navigateTo('host')}
            showPrototypeReturn={requestedParticipantId === selectedParticipant.id}
          />
        ) : null}

        {audience === 'host' ? (
          <HostShell
            meeting={meeting}
            state={hostState}
            route={route}
            onNavigate={navigateTo}
            onCreate={startNewMeeting}
          >
            {route === 'create' ? (
              <CreateScreen
                meeting={createMeeting}
                onTitleChange={updateTitle}
                onPurposeChange={updatePurpose}
                onReferenceMaterialChange={updateReferenceMaterial}
                onSchedulingWindowChange={updateSchedulingWindow}
                onDurationChange={updateDuration}
                onResponseDeadlineChange={updateResponseDeadline}
                onAttendanceModeChange={updateAttendanceMode}
                onAttendanceThresholdModeChange={updateAttendanceThresholdMode}
                onMinAttendeeCountChange={updateMinAttendeeCount}
                onParticipantRoleChange={updateParticipantRole}
                onParticipantAdd={addParticipant}
                onParticipantRemove={removeParticipant}
                onAvailabilityWindowsChange={updateAvailabilityWindows}
                onSendRequest={sendResponseRequest}
              />
            ) : null}

            {route === 'share' ? (
              <RequestSentScreen meeting={meeting} onOpenHost={() => navigateTo('host')} />
            ) : null}

            {route === 'host' && isWaitingState(hostState) ? (
              <HostWaitingScreen
                meeting={meeting}
                onRemindParticipant={remindParticipant}
                onAdvancePrototype={advancePrototypeToPending}
              />
            ) : null}

            {route === 'host' && hostState === 'HOST_DECISION' && selectedEvaluation != null ? (
              <HostDecideScreen
                meeting={meeting}
                evaluations={evaluations}
                selectedEvaluation={selectedEvaluation}
                onSelectCandidate={setSelectedCandidateId}
                onConfirm={confirmCandidate}
                onReviewCriteria={() => navigateTo('criteria')}
                onSendRequest={sendResponseReminder}
                requestedParticipant={meeting.participants.find(
                  (participant) => participant.id === requestedParticipantId,
                )}
                onOpenRequestedParticipant={(participant) =>
                  navigateTo('invite', false, participant.responseToken)
                }
              />
            ) : null}

            {route === 'criteria' ? (
              <MeetingCriteriaReviewScreen
                meeting={meeting}
                onAttendanceModeChange={updateAttendanceMode}
                onAttendanceThresholdModeChange={updateAttendanceThresholdMode}
                onMinAttendeeCountChange={updateMinAttendeeCount}
                onParticipantRoleChange={updateParticipantRole}
                onDone={() => navigateTo('host')}
              />
            ) : null}

            {route === 'message' && selectedEvaluation != null ? (
              <MessageScreen
                meeting={meeting}
                evaluation={selectedEvaluation}
                onBack={() => navigateTo('host')}
                onNotify={() =>
                  toast.success('참석자에게 확정 알림을 보냈어요', {
                    id: 'confirmation-notification',
                  })
                }
              />
            ) : null}

            {route === 'host' && hostState === 'HOST_CONFIRMED' && selectedEvaluation != null ? (
              <MessageScreen
                meeting={meeting}
                evaluation={selectedEvaluation}
                onNotify={() =>
                  toast.success('참석자에게 확정 알림을 보냈어요', {
                    id: 'confirmation-notification',
                  })
                }
              />
            ) : null}
          </HostShell>
        ) : null}
      </div>
      <Toaster
        position="bottom-center"
        duration={2600}
        visibleToasts={2}
        gap={8}
        toastOptions={{ className: 'meeting-cue-toast' }}
      />
      {isTossDemoPath ? (
        <DemoGuide route={route} meeting={meeting} onOpen={openDevScreen} />
      ) : import.meta.env.DEV ? (
        <DevScreenSwitcher route={route} onOpen={openDevScreen} />
      ) : null}
    </div>
  )
}

function DemoGuide({
  route,
  meeting,
  onOpen,
}: {
  route: AppRoute
  meeting: Meeting
  onOpen: (screen: DevScreen) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const currentStepIndex =
    route === 'create'
      ? 0
      : route === 'invite' || route === 'invite-edit' || route === 'invite-done'
        ? 2
        : route === 'host' && meeting.status === 'confirmed'
          ? 4
          : route === 'host' &&
              meeting.participants.find((participant) => participant.id === 'p-sujin')
                ?.responseStatus === 'submitted'
            ? 3
            : route === 'host'
              ? 1
              : -1

  return (
    <aside className={`demo-guide${isOpen ? ' is-open' : ''}`} aria-label="데모 가이드">
      <button
        type="button"
        className="demo-guide__toggle"
        aria-expanded={isOpen}
        aria-label={isOpen ? '데모 가이드 닫기' : '데모 가이드 열기'}
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? <X size={18} /> : <PanelsTopLeft size={18} />}
        <span>{isOpen ? '닫기' : '데모 가이드'}</span>
      </button>

      {isOpen ? (
        <div className="demo-guide__panel">
          <header className="demo-guide__header">
            <div>
              <span>약 3분</span>
              <strong>MeetCue 둘러보기</strong>
            </div>
            <p>원하는 장면부터 확인해도 흐름이 이어져요.</p>
          </header>

          <ol className="demo-guide__steps">
            {demoGuideSteps.map((step, index) => {
              const isCurrent = index === currentStepIndex

              return (
                <li key={`${step.route}-${step.label}`}>
                  <button
                    type="button"
                    className={isCurrent ? 'is-current' : ''}
                    aria-current={isCurrent ? 'step' : undefined}
                    onClick={() => {
                      onOpen(step)
                      setIsOpen(false)
                    }}
                  >
                    <span className="demo-guide__step-number">{step.label}</span>
                    <span className="demo-guide__step-copy">
                      <strong>{step.title}</strong>
                      <small>{step.description}</small>
                    </span>
                    <ChevronRight aria-hidden="true" size={17} />
                  </button>
                </li>
              )
            })}
          </ol>

          <button
            type="button"
            className="demo-guide__restart"
            onClick={() => {
              onOpen(demoGuideSteps[0])
              setIsOpen(false)
            }}
          >
            <RotateCcw aria-hidden="true" size={16} />
            처음부터 보기
          </button>
        </div>
      ) : null}
    </aside>
  )
}

function DevScreenSwitcher({
  route,
  onOpen,
}: {
  route: AppRoute
  onOpen: (screen: DevScreen) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <aside className={`dev-screen-switcher${isOpen ? ' is-open' : ''}`} aria-label="개발 화면 이동">
      <button
        type="button"
        className="dev-screen-switcher__toggle"
        aria-expanded={isOpen}
        aria-label={isOpen ? '개발 화면 이동 닫기' : '개발 화면 이동 열기'}
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? <X size={18} /> : <PanelsTopLeft size={18} />}
        <span>{isOpen ? '닫기' : '화면'}</span>
      </button>

      {isOpen ? (
        <div className="dev-screen-switcher__panel">
          <header>
            <span>DEV</span>
            <strong>화면 바로가기</strong>
          </header>
          {devScreenGroups.map((group) => (
            <section key={group.label}>
              <p>{group.label}</p>
              <div>
                {group.screens.map((screen) => {
                  const isCurrent =
                    route === screen.route &&
                    (screen.participantToken == null
                      ? getInviteTokenFromHash() == null
                      : getInviteTokenFromHash() === screen.participantToken)

                  return (
                    <button
                      key={`${screen.route}-${screen.label}`}
                      type="button"
                      className={isCurrent ? 'is-current' : ''}
                      onClick={() => {
                        onOpen(screen)
                        setIsOpen(false)
                      }}
                    >
                      {screen.label}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </aside>
  )
}

const accountNavigationItems: Array<{
  route: 'home' | 'meetings' | 'requests'
  label: string
  icon: typeof Home
}> = [
  { route: 'home', label: '홈', icon: Home },
  { route: 'meetings', label: '내 회의', icon: CalendarCheck2 },
  { route: 'requests', label: '받은 요청', icon: Inbox },
]

function createAccountScenarioMeeting(scenarioId: AccountScenarioId) {
  const fixture = createPrototypeMeeting()

  if (scenarioId === 'onboarding') {
    return {
      ...fixture,
      title: '온보딩 개선안 논의',
      hostLabel: '피플팀 지우',
      purpose: '신규 입사자의 첫 주 경험에서 우선 개선할 항목을 정합니다.',
    }
  }

  if (scenarioId === 'quarterly-goals') {
    return {
      ...fixture,
      title: '3분기 목표 점검',
      hostLabel: '프로덕트팀 민지',
      purpose: '3분기 핵심 목표의 진행 상황과 다음 우선순위를 점검합니다.',
      status: 'confirmed' as const,
      confirmedCandidateId: fixture.candidates[0]?.id,
    }
  }

  if (scenarioId === 'design-qa') {
    return {
      ...fixture,
      title: '디자인 QA 기준 정리',
      hostLabel: '디자인팀 서연',
      purpose: '출시 전 디자인 QA에서 공통으로 확인할 기준을 정리합니다.',
    }
  }

  return fixture
}

function AccountShell({
  route,
  onNavigate,
  onCreate,
  children,
}: {
  route: AppRoute
  onNavigate: (route: AppRoute) => void
  onCreate: () => void
  children: ReactNode
}) {
  return (
    <div className="account-shell">
      <GlobalAccountHeader route={route} onNavigate={onNavigate} onCreate={onCreate} />

      <main className="account-main">{children}</main>

      <nav className="account-mobile-nav" aria-label="주요 메뉴">
        {accountNavigationItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.route}
              type="button"
              className={route === item.route ? 'is-active' : ''}
              aria-current={route === item.route ? 'page' : undefined}
              onClick={() => onNavigate(item.route)}
            >
              <Icon size={21} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function GlobalAccountHeader({
  route,
  onNavigate,
  onCreate,
  mode = 'account',
}: {
  route: AppRoute
  onNavigate: (route: AppRoute) => void
  onCreate: () => void
  mode?: 'account' | 'focused'
}) {
  const isFocused = mode === 'focused'

  return (
    <header className="account-topbar">
      <div className="account-topbar__inner">
        <button
          className="account-brand"
          type="button"
          onClick={isFocused ? onCreate : () => onNavigate('home')}
        >
          <img className="brand-dot" src={meetCueEmblemUrl} alt="" />
          <strong className="brand-wordmark">MeetCue</strong>
        </button>

        {isFocused ? (
          <div className="account-focused-context">회의 시간 결정</div>
        ) : (
          <nav className="account-desktop-nav" aria-label="주요 메뉴">
            {accountNavigationItems.map((item) => (
              <button
                key={item.route}
                type="button"
                className={route === item.route ? 'is-active' : ''}
                aria-current={route === item.route ? 'page' : undefined}
                onClick={() => onNavigate(item.route)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}

        <div className="account-topbar__actions">
          {isFocused ? (
            <button className="account-restart-button" type="button" onClick={onCreate}>
              <RotateCcw size={17} aria-hidden="true" />
              <span>처음부터</span>
            </button>
          ) : (
            <>
              <button
                className={`account-icon-button${route === 'notifications' ? ' is-active' : ''}`}
                type="button"
                aria-label="알림"
                onClick={() => onNavigate('notifications')}
              >
                <Bell size={20} aria-hidden="true" />
                <span className="account-notification-dot" />
              </button>
              <button
                className={`account-create-button${route === 'create' ? ' is-current' : ''}`}
                type="button"
                aria-current={route === 'create' ? 'page' : undefined}
                onClick={onCreate}
              >
                <Plus size={18} aria-hidden="true" />
                <span>새 회의</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function AccountPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <header className="account-page-head">
      {eyebrow ? <span>{eyebrow}</span> : null}
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  )
}

function AccountHomeScreen({
  meeting,
  onOpenRequest,
  onOpenMeeting,
  onOpenConfirmed,
  onCreate,
}: {
  meeting: Meeting
  onOpenRequest: () => void
  onOpenMeeting: () => void
  onOpenConfirmed: () => void
  onCreate: () => void
}) {
  const responseTargets = meeting.participants.filter(
    (participant) => participant.id !== meeting.hostId,
  )
  const completedCount = responseTargets.filter(
    (participant) => participant.responseStatus === 'submitted',
  ).length
  const meetingActionLabel = meeting.status === 'confirmed' ? '확정 내용 보기' : '결과 확인'

  return (
    <div className="account-page account-home">
      <AccountPageHeader
        title="지금 확인할 일이 있어요"
        description="답할 요청과 내가 만든 회의의 변화를 한곳에서 확인하세요."
      />

      <section className="account-section" aria-labelledby="home-action-title">
        <div className="account-section__head">
          <h2 id="home-action-title">먼저 확인해 주세요</h2>
          <button type="button" onClick={() => (window.location.hash = routeHashes.requests)}>
            모두 보기
          </button>
        </div>
        <div className="account-task-stack">
          <button
            className="account-task-row account-task-row--primary"
            type="button"
            onClick={onOpenRequest}
          >
            <span className="account-task-icon account-task-icon--request">
              <Inbox size={20} aria-hidden="true" />
            </span>
            <span className="account-task-copy">
              <span className="account-task-kicker">오늘 18:00까지 응답</span>
              <strong>온보딩 개선안 논의</strong>
              <small>피플팀 지우 · 1시간</small>
            </span>
            <span className="account-task-action">
              응답하기
              <ChevronRight size={18} aria-hidden="true" />
            </span>
          </button>
          <button className="account-task-row" type="button" onClick={onOpenMeeting}>
            <span className="account-task-icon account-task-icon--meeting">
              <CalendarCheck2 size={20} aria-hidden="true" />
            </span>
            <span className="account-task-copy">
              <span className="account-task-kicker">
                {meeting.status === 'confirmed'
                  ? '회의 시간 확정'
                  : `새 응답 · ${completedCount}/${responseTargets.length}명 완료`}
              </span>
              <strong>{meeting.title}</strong>
              <small>현재 응답으로 정할 수 있는 시간을 확인하세요</small>
            </span>
            <span className="account-task-action">
              {meetingActionLabel}
              <ChevronRight size={18} aria-hidden="true" />
            </span>
          </button>
        </div>
      </section>

      <section className="account-section" aria-labelledby="home-upcoming-title">
        <div className="account-section__head">
          <h2 id="home-upcoming-title">다가오는 회의</h2>
          <button type="button" onClick={() => (window.location.hash = routeHashes.meetings)}>
            내 회의
          </button>
        </div>
        <button className="account-upcoming-row" type="button" onClick={onOpenConfirmed}>
          <span className="account-date-tile account-date-tile--confirmed">
            <small>7월</small>
            <strong>15</strong>
          </span>
          <span>
            <strong>3분기 목표 점검</strong>
            <small>오전 10:00 · 1시간 · 프로덕트팀</small>
          </span>
          <span className="account-status account-status--done">확정</span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </section>

      <button className="account-empty-action" type="button" onClick={onCreate}>
        <Plus size={19} aria-hidden="true" />
        다른 회의 만들기
      </button>
    </div>
  )
}

function MeetingsScreen({
  meeting,
  onOpenMeeting,
}: {
  meeting: Meeting
  onOpenMeeting: (scenarioId: AccountScenarioId) => void
}) {
  const [filter, setFilter] = useState<'all' | 'active' | 'confirmed'>('all')
  const responseTargets = meeting.participants.filter(
    (participant) => participant.id !== meeting.hostId,
  )
  const completedCount = responseTargets.filter(
    (participant) => participant.responseStatus === 'submitted',
  ).length

  return (
    <div className="account-page">
      <AccountPageHeader eyebrow="내가 만든 회의" title="진행 상황을 이어서 확인하세요" />
      <div className="account-filter-tabs" role="tablist" aria-label="내 회의 필터">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          className={filter === 'all' ? 'is-active' : ''}
          onClick={() => setFilter('all')}
        >
          전체 2
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'active'}
          className={filter === 'active' ? 'is-active' : ''}
          onClick={() => setFilter('active')}
        >
          진행 중 1
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'confirmed'}
          className={filter === 'confirmed' ? 'is-active' : ''}
          onClick={() => setFilter('confirmed')}
        >
          확정 1
        </button>
      </div>
      <section className="account-list" aria-label="내가 만든 회의 목록">
        {filter !== 'confirmed' ? (
          <button
            className="account-list-row"
            type="button"
            onClick={() => onOpenMeeting('product-review')}
          >
            <span className="account-date-tile">
              <small>7월</small>
              <strong>15</strong>
            </span>
            <span className="account-list-row__copy">
              <strong>{meeting.title}</strong>
              <span>{formatSchedulingWindow(meeting.schedulingWindow)}</span>
              <small>
                {completedCount}/{responseTargets.length}명 응답 · 새 응답이 들어왔어요
              </small>
            </span>
            <span className="account-status account-status--attention">결정 필요</span>
            <ChevronRight size={19} aria-hidden="true" />
          </button>
        ) : null}
        {filter !== 'active' ? (
          <button
            className="account-list-row"
            type="button"
            onClick={() => onOpenMeeting('quarterly-goals')}
          >
            <span className="account-date-tile account-date-tile--confirmed">
              <small>7월</small>
              <strong>15</strong>
            </span>
            <span className="account-list-row__copy">
              <strong>3분기 목표 점검</strong>
              <span>7. 15. (수) 오전 10:00</span>
              <small>참석자 6명 · 확정 알림 전송 완료</small>
            </span>
            <span className="account-status account-status--done">확정</span>
            <ChevronRight size={19} aria-hidden="true" />
          </button>
        ) : null}
      </section>
    </div>
  )
}

function RequestsScreen({
  onOpenRequest,
}: {
  meeting: Meeting
  onOpenRequest: (scenarioId: AccountScenarioId, responseState?: 'new' | 'done') => void
}) {
  const [filter, setFilter] = useState<'pending' | 'done'>('pending')

  return (
    <div className="account-page">
      <AccountPageHeader
        eyebrow="받은 요청"
        title="내 응답이 필요한 회의"
        description="마감이 가까운 요청부터 보여드려요."
      />
      <div className="account-filter-tabs" role="tablist" aria-label="받은 요청 필터">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'pending'}
          className={filter === 'pending' ? 'is-active' : ''}
          onClick={() => setFilter('pending')}
        >
          응답 필요 1
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'done'}
          className={filter === 'done' ? 'is-active' : ''}
          onClick={() => setFilter('done')}
        >
          응답 완료 1
        </button>
      </div>
      <section className="account-list" aria-label="받은 회의 요청 목록">
        {filter === 'pending' ? (
          <button
            className="account-list-row"
            type="button"
            onClick={() => onOpenRequest('onboarding')}
          >
            <span className="account-date-tile account-date-tile--request">
              <small>마감</small>
              <strong>13</strong>
            </span>
            <span className="account-list-row__copy">
              <strong>온보딩 개선안 논의</strong>
              <span>피플팀 지우</span>
              <small>7. 14. - 7. 16. · 1시간 · 오늘 18:00까지</small>
            </span>
            <span className="account-status account-status--attention">응답 필요</span>
            <ChevronRight size={19} aria-hidden="true" />
          </button>
        ) : (
          <button
            className="account-list-row"
            type="button"
            onClick={() => onOpenRequest('design-qa', 'done')}
          >
            <span className="account-date-tile account-date-tile--complete">
              <small>제출</small>
              <Check size={21} aria-hidden="true" />
            </span>
            <span className="account-list-row__copy">
              <strong>디자인 QA 기준 정리</strong>
              <span>디자인팀 서연</span>
              <small>7. 14. - 7. 16. · 응답을 수정할 수 있어요</small>
            </span>
            <span className="account-status account-status--done">응답 완료</span>
            <ChevronRight size={19} aria-hidden="true" />
          </button>
        )}
      </section>
    </div>
  )
}

function NotificationsScreen({
  meeting,
  onOpenRequest,
  onOpenMeeting,
}: {
  meeting: Meeting
  onOpenRequest: (scenarioId: AccountScenarioId, responseState?: 'new' | 'done') => void
  onOpenMeeting: (scenarioId: AccountScenarioId) => void
}) {
  return (
    <div className="account-page">
      <AccountPageHeader eyebrow="알림" title="새로 바뀐 내용을 확인하세요" />
      <section className="notification-list" aria-label="알림 목록">
        <button type="button" onClick={() => onOpenRequest('onboarding')}>
          <span className="notification-unread" />
          <span>
            <strong>온보딩 개선안 논의 응답 요청이 도착했어요</strong>
            <small>피플팀 지우 · 10분 전</small>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onOpenMeeting('product-review')}>
          <span className="notification-unread" />
          <span>
            <strong>{meeting.title}에 새 응답이 들어왔어요</strong>
            <small>현재 응답을 기준으로 결과가 다시 계산됐어요 · 1시간 전</small>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onOpenMeeting('quarterly-goals')}>
          <span className="notification-unread" />
          <span>
            <strong>3분기 목표 점검 시간이 확정됐어요</strong>
            <small>7. 15. (수) 오전 10:00 · 3시간 전</small>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <button
          className="is-read"
          type="button"
          onClick={() => onOpenRequest('design-qa', 'done')}
        >
          <span className="notification-unread" />
          <span>
            <strong>디자인 QA 기준 정리 응답이 저장됐어요</strong>
            <small>필요하면 마감 전까지 수정할 수 있어요 · 어제</small>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <button className="is-read" type="button" onClick={() => onOpenMeeting('product-review')}>
          <span className="notification-unread" />
          <span>
            <strong>제품 리뷰 회의 응답 마감이 내일이에요</strong>
            <small>아직 1명이 응답하지 않았어요 · 어제</small>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </section>
    </div>
  )
}

function HostShell({
  meeting,
  state,
  route,
  onNavigate,
  onCreate,
  children,
}: {
  meeting: Meeting
  state: HostCoordinationState
  route: AppRoute
  onNavigate: (route: AppRoute) => void
  onCreate: () => void
  children: ReactNode
}) {
  const copy = hostStateCopy[state]
  const navigationItems = getHostNavigationItems(route)
  const contextDescription =
    route === 'create'
      ? '회의 요청을 만드는 중'
      : `${meeting.participants.filter((participant) => participant.id !== meeting.hostId).length}명에게 ${formatMeetingDuration(meeting.durationMinutes)} 회의 시간을 묻는 중`

  return (
    <div className="account-shell host-account-shell">
      <GlobalAccountHeader
        route={route}
        onNavigate={onNavigate}
        onCreate={onCreate}
        mode="focused"
      />
      <div
        className={`tds-app host-shell${route === 'create' ? ' host-shell--create' : ''}${
          route === 'share' ? ' host-shell--share' : ''
        }${route === 'message' || state === 'HOST_CONFIRMED' ? ' host-shell--message' : ''}${
          route === 'host' && isWaitingState(state) ? ' host-shell--waiting' : ''
        }${route === 'host' && state === 'HOST_DECISION' ? ' host-shell--decision' : ''}`}
      >
        <header className="host-context-bar" aria-label="회의 조율 상태">
          <div className="host-context-main">
            <strong>{meeting.title || '새 회의 만들기'}</strong>
            <span>{contextDescription}</span>
          </div>
          {navigationItems.length > 0 ? (
            <div className="host-context-actions">
              {navigationItems.map((item) => (
                <button
                  key={item.route}
                  className={route === item.route ? 'is-active' : ''}
                  type="button"
                  onClick={() => onNavigate(item.route)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </header>

        <main className={`host-stage${route === 'create' ? ' host-stage--create' : ''}`}>
          {route !== 'create' &&
          route !== 'share' &&
          route !== 'message' &&
          route !== 'criteria' &&
          state !== 'HOST_CONFIRMED' &&
          !(route === 'host' && isWaitingState(state)) &&
          !(route === 'host' && state === 'HOST_DECISION') ? (
            <section className="host-stage__head">
              <span className={`state-badge state-badge--${getHostStateTone(state)}`}>
                {getHostStateLabel(state)}
              </span>
              <h1>{copy.title}</h1>
              <p>{copy.description}</p>
            </section>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  )
}

function RequestSentScreen({ meeting, onOpenHost }: { meeting: Meeting; onOpenHost: () => void }) {
  const responseTargets = meeting.participants.filter(
    (participant) => participant.id !== meeting.hostId,
  )
  const completedCount = responseTargets.filter(
    (participant) => participant.responseStatus === 'submitted',
  ).length

  return (
    <div className="share-workspace">
      <section className="share-card">
        <header className="share-card__header">
          <span className="share-card__status-icon" aria-hidden="true">
            <Check size={19} strokeWidth={2.5} />
          </span>
          <div>
            <span>요청 발송 완료</span>
            <h1>요청을 보냈어요</h1>
            <p>
              {meeting.title} · {formatDeadline(meeting.responseDeadline)} 마감
            </p>
          </div>
        </header>
        <div className="share-list-head">
          <strong>참석자</strong>
          <span>{responseTargets.length}명</span>
        </div>
        <div className="request-recipient-list" aria-label="응답 요청 대상">
          {responseTargets.map((participant) => (
            <div className="request-recipient-row" key={participant.id}>
              <div>
                <strong>{participant.name}</strong>
                <small>{participantRoleLabels[participant.role]}</small>
              </div>
              <span
                className={`request-delivery-status${
                  participant.responseStatus === 'submitted' ? ' is-complete' : ''
                }`}
              >
                {participant.responseStatus === 'submitted' ? '응답 완료' : '요청됨'}
              </span>
            </div>
          ))}
        </div>
        <footer className="share-card__footer">
          <p>
            {completedCount > 0
              ? `${completedCount}명이 이미 응답했어요.`
              : '응답이 오면 후보 시간을 바로 계산해요.'}
          </p>
          <button className="primary-button" type="button" onClick={onOpenHost}>
            응답 현황 보기
          </button>
        </footer>
      </section>
    </div>
  )
}

function MeetingCriteriaReviewScreen({
  meeting,
  onAttendanceModeChange,
  onAttendanceThresholdModeChange,
  onMinAttendeeCountChange,
  onParticipantRoleChange,
  onDone,
}: {
  meeting: Meeting
  onAttendanceModeChange: (mode: AttendeeDecisionMode) => void
  onAttendanceThresholdModeChange: (mode: AttendanceThresholdMode) => void
  onMinAttendeeCountChange: (count: number) => void
  onParticipantRoleChange: (participantId: string, role: ParticipantRole) => void
  onDone: () => void
}) {
  const invitees = meeting.participants.filter((participant) => participant.id !== meeting.hostId)
  const requiredInvitees = invitees.filter((participant) => participant.role === 'required')
  const isEveryoneRequired = meeting.preset === 'all_hands'
  const thresholdMode: AttendanceThresholdMode =
    meeting.preset === 'quorum' ? 'minimum_count' : 'required_only'
  const minimumAllowed = requiredInvitees.length + 1

  return (
    <div className="criteria-review-workspace">
      <section className="criteria-review-panel" aria-labelledby="criteria-review-title">
        <header>
          <span>참석 기준</span>
          <h1 id="criteria-review-title">어떤 조건이면 회의를 열 수 있나요?</h1>
          <p>참석자의 응답과 후보 시간은 그대로 두고, 회의를 열기 위한 조건만 다시 계산해요.</p>
        </header>

        <fieldset className="criteria-choice-group">
          <legend>이 회의는 모두 참석해야 하나요?</legend>
          <button
            className={isEveryoneRequired ? 'is-selected' : ''}
            type="button"
            aria-pressed={isEveryoneRequired}
            onClick={() => onAttendanceModeChange('everyone')}
          >
            모두 참석해야 해요
          </button>
          <button
            className={!isEveryoneRequired ? 'is-selected' : ''}
            type="button"
            aria-pressed={!isEveryoneRequired}
            onClick={() => onAttendanceModeChange('required')}
          >
            몇 명은 빠져도 진행할 수 있어요
          </button>
        </fieldset>

        {!isEveryoneRequired ? (
          <>
            <fieldset className="criteria-required-group">
              <legend>꼭 참석해야 하는 사람</legend>
              <p>주최자는 항상 포함돼요.</p>
              <div>
                {invitees.map((participant) => {
                  const isRequired = participant.role === 'required'
                  return (
                    <button
                      className={isRequired ? 'is-selected' : ''}
                      key={participant.id}
                      type="button"
                      aria-pressed={isRequired}
                      onClick={() =>
                        onParticipantRoleChange(
                          participant.id,
                          isRequired ? 'optional' : 'required',
                        )
                      }
                    >
                      <span className="avatar avatar--small">{participant.name.slice(0, 1)}</span>
                      <strong>{participant.name}</strong>
                      <small>{isRequired ? '꼭 필요' : '선택 안 함'}</small>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <fieldset className="criteria-choice-group">
              <legend>필수 참석자만 오면 진행할 수 있나요?</legend>
              <button
                className={thresholdMode === 'required_only' ? 'is-selected' : ''}
                type="button"
                aria-pressed={thresholdMode === 'required_only'}
                onClick={() => onAttendanceThresholdModeChange('required_only')}
              >
                네, 필수 참석자만 오면 돼요
              </button>
              <button
                className={thresholdMode === 'minimum_count' ? 'is-selected' : ''}
                type="button"
                aria-pressed={thresholdMode === 'minimum_count'}
                onClick={() => onAttendanceThresholdModeChange('minimum_count')}
              >
                아니요, 전체 참석 인원도 중요해요
              </button>
            </fieldset>

            {thresholdMode === 'minimum_count' ? (
              <section className="minimum-attendance" aria-labelledby="criteria-minimum-title">
                <div>
                  <strong id="criteria-minimum-title">몇 명이 모이면 진행할까요?</strong>
                  <span>주최자와 꼭 필요한 사람을 포함해요.</span>
                </div>
                <div className="minimum-attendance__stepper">
                  <button
                    type="button"
                    aria-label="최소 참석 인원 줄이기"
                    disabled={meeting.minAttendeeCount <= minimumAllowed}
                    onClick={() => onMinAttendeeCountChange(meeting.minAttendeeCount - 1)}
                  >
                    <Minus size={18} />
                  </button>
                  <output aria-live="polite">
                    <strong>{meeting.minAttendeeCount}명</strong>
                    <span>총 {meeting.participants.length}명</span>
                  </output>
                  <button
                    type="button"
                    aria-label="최소 참석 인원 늘리기"
                    disabled={meeting.minAttendeeCount >= meeting.participants.length}
                    onClick={() => onMinAttendeeCountChange(meeting.minAttendeeCount + 1)}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        <footer>
          <div>
            <span>현재 기준</span>
            <strong>
              {isEveryoneRequired
                ? `주최자 포함 ${meeting.participants.length}명 모두`
                : `필수 ${requiredInvitees.length + 1}명 · 최소 ${meeting.minAttendeeCount}명`}
            </strong>
          </div>
          <button className="primary-button" type="button" onClick={onDone}>
            이 기준으로 결과 다시 보기
          </button>
        </footer>
      </section>
    </div>
  )
}

function HostWaitingScreen({
  meeting,
  onRemindParticipant,
  onAdvancePrototype,
}: {
  meeting: Meeting
  onRemindParticipant: (participant: Participant) => void
  onAdvancePrototype?: () => void
}) {
  const [remindedParticipantIds, setRemindedParticipantIds] = useState<string[]>([])
  const responseTargets = meeting.participants.filter(
    (participant) => participant.id !== meeting.hostId,
  )
  const completedParticipants = responseTargets.filter(
    (participant) => participant.responseStatus === 'submitted',
  )
  const pendingParticipants = responseTargets.filter(
    (participant) => participant.responseStatus !== 'submitted',
  )
  const responseProgress =
    responseTargets.length === 0
      ? 0
      : Math.round((completedParticipants.length / responseTargets.length) * 100)
  const orderedParticipants = [...pendingParticipants, ...completedParticipants]
  return (
    <div className="waiting-workspace">
      <section className="waiting-card">
        <header className="waiting-header">
          <div className="waiting-header__context">
            <div>
              <span>회의</span>
              <strong>{meeting.title}</strong>
            </div>
            <span className="waiting-header__eyebrow">응답 수집 중</span>
          </div>
          <h1>{pendingParticipants.length}명의 응답을 기다리고 있어요</h1>
          <p>모든 응답을 기다리지 않아도, 조건을 충족한 시간이 생기면 바로 확인할 수 있어요.</p>
        </header>

        <section className="waiting-overview" aria-label={`응답 진행률 ${responseProgress}%`}>
          <div className="waiting-overview__count">
            <span>응답 현황</span>
            <strong>
              {completedParticipants.length}
              <small> / {responseTargets.length}명</small>
            </strong>
          </div>
          <div className="waiting-overview__progress">
            <span className="waiting-progress__track" aria-hidden="true">
              <span style={{ width: `${responseProgress}%` }} />
            </span>
            <span>{responseProgress}% 완료</span>
          </div>
          <dl className="waiting-overview__meta">
            <div>
              <dt>응답 마감</dt>
              <dd>{formatDeadline(meeting.responseDeadline)}</dd>
            </div>
            <div>
              <dt>후보 시간</dt>
              <dd>{meeting.candidates.length}개</dd>
            </div>
          </dl>
        </section>

        <section className="waiting-participants">
          <div className="waiting-participants__head">
            <div>
              <h2>참석자 응답</h2>
              <p>응답이 필요한 사람을 먼저 보여드려요.</p>
            </div>
            <span>
              대기 {pendingParticipants.length} · 완료 {completedParticipants.length}
            </span>
          </div>
          <div className="waiting-response-list">
            {orderedParticipants.map((participant) => {
              const isComplete = participant.responseStatus === 'submitted'
              return (
                <div
                  className={`waiting-response-row${isComplete ? ' is-complete' : ''}`}
                  key={participant.id}
                >
                  <div className="waiting-response-row__person">
                    <strong>{participant.name}</strong>
                    <small>{participantRoleLabels[participant.role]}</small>
                  </div>
                  <span className={`waiting-response-state${isComplete ? ' is-complete' : ''}`}>
                    {isComplete ? (
                      <Check size={15} aria-hidden="true" />
                    ) : (
                      <Clock3 size={15} aria-hidden="true" />
                    )}
                    {isComplete ? '응답 완료' : '응답 대기'}
                  </span>
                  {!isComplete ? (
                    <button
                      className="waiting-remind-button"
                      type="button"
                      aria-label={
                        remindedParticipantIds.includes(participant.id)
                          ? `${participant.name}님에게 다시 알림 보냄`
                          : `${participant.name}님에게 다시 알리기`
                      }
                      disabled={remindedParticipantIds.includes(participant.id)}
                      onClick={() => {
                        onRemindParticipant(participant)
                        setRemindedParticipantIds((currentIds) =>
                          currentIds.includes(participant.id)
                            ? currentIds
                            : [...currentIds, participant.id],
                        )
                      }}
                    >
                      <Bell size={15} aria-hidden="true" />
                      {remindedParticipantIds.includes(participant.id)
                        ? '알림 보냄'
                        : '다시 알리기'}
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      </section>
      {onAdvancePrototype ? (
        <aside className="prototype-flow-action waiting-demo-card" aria-label="데모 시연">
          <div>
            <span>
              {completedParticipants.length > 0
                ? `${completedParticipants.length}명의 응답을 반영했어요`
                : '데모 시연'}
            </span>
            <strong>
              {completedParticipants.length > 0
                ? '현재 조건으로 가능한 시간을 확인해 보세요'
                : '응답이 도착한 다음 화면을 미리 확인해 보세요'}
            </strong>
          </div>
          <button className="primary-button" type="button" onClick={onAdvancePrototype}>
            {completedParticipants.length > 0 ? '결과 확인하기' : '다음 단계 보기'}
          </button>
        </aside>
      ) : null}
    </div>
  )
}

function HostDecideScreen({
  meeting,
  evaluations,
  selectedEvaluation,
  onSelectCandidate,
  onConfirm,
  onReviewCriteria,
  onSendRequest,
  requestedParticipant,
  onOpenRequestedParticipant,
}: {
  meeting: Meeting
  evaluations: CandidateEvaluation[]
  selectedEvaluation: CandidateEvaluation
  onSelectCandidate: (candidateId: string) => void
  onConfirm: (candidateId: string) => void
  onReviewCriteria: () => void
  onSendRequest: (evaluation: CandidateEvaluation, recipientIds: string[]) => void
  requestedParticipant?: Participant
  onOpenRequestedParticipant: (participant: Participant) => void
}) {
  const [requestCandidateId, setRequestCandidateId] = useState<string | null>(null)
  const recommendedEvaluation = selectedEvaluation
  const systemRecommendedEvaluation = evaluations[0] ?? selectedEvaluation
  const recommendedDateKey = getCandidateDateKey(recommendedEvaluation.candidate.startAt)
  const isMobileDecisionMap = useMediaQuery('(max-width: 760px)')
  const [selectedDateKey, setSelectedDateKey] = useState(recommendedDateKey)
  const candidateMapRef = useRef<HTMLElement>(null)
  const readyCount = evaluations.filter((evaluation) => evaluation.status === 'ready').length
  const pendingCount = evaluations.filter((evaluation) => evaluation.status === 'pending').length
  const impossibleCount = evaluations.filter(
    (evaluation) => evaluation.status === 'impossible',
  ).length
  const dateGroups = Array.from(
    evaluations.reduce((groups, evaluation) => {
      const dateKey = getCandidateDateKey(evaluation.candidate.startAt)
      const current = groups.get(dateKey) ?? []
      current.push(evaluation)
      groups.set(dateKey, current)
      return groups
    }, new Map<string, CandidateEvaluation[]>()),
  ).sort(([left], [right]) => left.localeCompare(right))
  const visibleDateGroups = isMobileDecisionMap
    ? dateGroups.filter(([dateKey]) => dateKey === selectedDateKey)
    : dateGroups
  const candidateMinuteValues = evaluations.map((evaluation) =>
    getCandidateMinuteOfDay(evaluation.candidate.startAt),
  )
  const firstCandidateMinute = Math.min(...candidateMinuteValues)
  const lastCandidateMinute = Math.max(...candidateMinuteValues)
  const candidateMapMinutes = Array.from(
    { length: Math.floor((lastCandidateMinute - firstCandidateMinute) / 30) + 1 },
    (_, index) => firstCandidateMinute + index * 30,
  )
  const shortlistEvaluations = selectCandidateShortlist(evaluations, 6)
  const isSystemRecommendation =
    systemRecommendedEvaluation.status === 'ready' &&
    hasSameRecommendationPriority(recommendedEvaluation, systemRecommendedEvaluation)
  const canConfirm = recommendedEvaluation.status === 'ready'
  const fallbackEvaluation = evaluations.find(
    (evaluation) =>
      evaluation.candidate.id !== recommendedEvaluation.candidate.id &&
      evaluation.status === 'ready',
  )
  const requiredCount = meeting.participants.filter(
    (participant) => participant.role === 'required',
  ).length
  const criteriaSummary =
    meeting.preset === 'all_hands'
      ? `주최자 포함 ${meeting.participants.length}명 모두 참석`
      : `꼭 참석해야 하는 사람 ${requiredCount}명 · 최소 ${meeting.minAttendeeCount}명 참석`
  const selectedResponseRows = recommendedEvaluation.responseDetails
  const selectedPendingCount = selectedResponseRows.filter(
    (detail) => detail.state === 'unknown',
  ).length
  const adjustmentParticipants = recommendedEvaluation.adjustmentCommitParticipants
  const avoidPreferredParticipants = selectedResponseRows
    .filter(
      (detail) =>
        (detail.state === 'available' || detail.state === 'adjustment_commit') &&
        (detail.response?.preferenceTags?.length ?? 0) > 0,
    )
    .map((detail) => detail.participant)
  const statusTitle =
    recommendedEvaluation.status === 'ready'
      ? `${recommendedEvaluation.availableCount}명 참석 가능, 지금 확정할 수 있어요`
      : recommendedEvaluation.status === 'pending'
        ? recommendedEvaluation.requiredPending.length > 0
          ? `${recommendedEvaluation.requiredPending.map((participant) => participant.name).join(', ')}님의 가능 응답이 필요해요`
          : `아직 응답하지 않은 사람 중 ${recommendedEvaluation.positiveResponsesNeededAfterRequiredYes}명의 ‘가능해요’ 응답이 필요해요`
        : recommendedEvaluation.requiredUnavailable.length > 0
          ? `꼭 참석해야 하는 사람의 시간이 맞지 않아요`
          : `최소 ${meeting.minAttendeeCount}명을 채울 수 없어요`
  const statusDescription =
    recommendedEvaluation.status === 'ready'
      ? `필수 참석자 조건과 최소 ${meeting.minAttendeeCount}명 기준을 충족했어요.`
      : recommendedEvaluation.status === 'pending'
        ? recommendedEvaluation.reasons.join(' ')
        : recommendedEvaluation.reasons.join(' ')
  const candidateStatusSummary = `추천 ${shortlistEvaluations.length}개 · 가능한 시간 ${readyCount}개`

  return (
    <div className="decision-board">
      <section className="decision-candidate-workspace" aria-labelledby="decision-candidates-title">
        <header className="decision-candidate-head">
          <div>
            <h1 id="decision-candidates-title">{meeting.title}</h1>
            <span>{formatDeadline(meeting.responseDeadline)} 마감</span>
          </div>
          <p>{candidateStatusSummary}</p>
        </header>

        <div className="decision-reference-candidates" aria-label="후보 시간 목록">
          <header>
            <div>
              <strong>추천 후보</strong>
              <small>참석 기준을 충족한 뒤 일정 조정과 기피 표시가 적은 순이에요.</small>
            </div>
            <span>
              {shortlistEvaluations.length}개 · 전체 {evaluations.length}개
            </span>
          </header>
          {shortlistEvaluations.map((evaluation) => {
            const isSelected = evaluation.candidate.id === recommendedEvaluation.candidate.id

            return (
              <article
                className={`decision-reference-card is-${getStatusTone(evaluation.status)}${isSelected ? ' is-selected' : ''}`}
                key={evaluation.candidate.id}
              >
                <button
                  className="decision-reference-card__select"
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    onSelectCandidate(evaluation.candidate.id)
                    setSelectedDateKey(getCandidateDateKey(evaluation.candidate.startAt))
                    setRequestCandidateId(null)
                  }}
                >
                  <span className="decision-reference-card__copy">
                    <strong>{formatCandidateTime(evaluation.candidate)}</strong>
                    <span>
                      <small>{candidateStatusLabels[evaluation.status]}</small>
                    </span>
                    <em>
                      {evaluation.availableCount}/{meeting.participants.length}명 가능
                    </em>
                  </span>
                  {systemRecommendedEvaluation.status === 'ready' &&
                  hasSameRecommendationPriority(evaluation, systemRecommendedEvaluation) ? (
                    <span
                      className="decision-reference-card__recommendation"
                      aria-label="같은 우선순위의 추천 후보"
                    >
                      <Star aria-hidden="true" size={15} fill="currentColor" />
                    </span>
                  ) : null}
                </button>
                {isSelected ? (
                  canConfirm ? (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => onConfirm(evaluation.candidate.id)}
                    >
                      이 시간으로 정하기
                    </button>
                  ) : evaluation.status === 'pending' ? (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => setRequestCandidateId(evaluation.candidate.id)}
                    >
                      응답 요청하기
                    </button>
                  ) : (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() =>
                        fallbackEvaluation != null
                          ? onSelectCandidate(fallbackEvaluation.candidate.id)
                          : onReviewCriteria()
                      }
                    >
                      다른 시간 보기
                    </button>
                  )
                ) : null}
              </article>
            )
          })}
        </div>

        <section
          className={`decision-reference-detail is-${getStatusTone(recommendedEvaluation.status)}`}
          aria-labelledby="selected-time-title"
        >
          <header className="decision-focus-head">
            <div>
              <span>선택한 후보</span>
              <h2 id="selected-time-title">
                {formatCandidateTime(recommendedEvaluation.candidate)}
              </h2>
            </div>
            {isSystemRecommendation ? <strong>시스템 추천</strong> : null}
          </header>

          <div className="decision-state-panel">
            <span className="decision-state-panel__label">
              {candidateStatusLabels[recommendedEvaluation.status]}
            </span>
            <h3>{statusTitle}</h3>
            <p>{statusDescription}</p>
            {recommendedEvaluation.status === 'ready' ? (
              <div className="decision-burden-summary" aria-label="확정 전 확인할 일정 부담">
                <div className={adjustmentParticipants.length > 0 ? 'has-burden' : 'is-clear'}>
                  {adjustmentParticipants.length > 0 ? (
                    <CalendarDays aria-hidden="true" size={16} />
                  ) : (
                    <Check aria-hidden="true" size={16} />
                  )}
                  <span>
                    {adjustmentParticipants.length > 0
                      ? `${formatParticipantSummary(adjustmentParticipants)} 기존 일정을 옮겨 참석해요.`
                      : '일정 변경 없이 참석할 수 있어요.'}
                  </span>
                </div>
                <div className={avoidPreferredParticipants.length > 0 ? 'has-burden' : 'is-clear'}>
                  {avoidPreferredParticipants.length > 0 ? (
                    <Clock3 aria-hidden="true" size={16} />
                  ) : (
                    <Check aria-hidden="true" size={16} />
                  )}
                  <span>
                    {avoidPreferredParticipants.length > 0
                      ? `${formatParticipantSummary(avoidPreferredParticipants)} 가능하면 피하고 싶다고 표시했어요.`
                      : '피하고 싶은 표시가 없어요.'}
                  </span>
                </div>
              </div>
            ) : null}
            <div className="decision-state-counts" aria-label="선택한 후보 응답 현황">
              <span className="is-positive">
                <strong>{recommendedEvaluation.availableCount}명</strong> 가능
              </span>
              <span className="is-negative">
                <strong>{recommendedEvaluation.unavailableCount}명</strong> 참석 어려움
              </span>
              <span className="is-unknown">
                <strong>{selectedPendingCount}명</strong> 응답 전
              </span>
            </div>
            {canConfirm ? (
              <button
                className="primary-button"
                type="button"
                onClick={() => onConfirm(recommendedEvaluation.candidate.id)}
              >
                {formatCandidateTime(recommendedEvaluation.candidate)} 확정하기
              </button>
            ) : null}
          </div>

          {recommendedEvaluation.status === 'pending' ? (
            <div className="decision-pending-groups">
              {recommendedEvaluation.requiredPending.length > 0 ? (
                <section className="decision-pending-group is-required">
                  <header>
                    <strong>
                      응답이 꼭 필요한 사람 · {recommendedEvaluation.requiredPending.length}명
                    </strong>
                  </header>
                  {recommendedEvaluation.requiredPending.map((participant) => (
                    <div className="decision-pending-person" key={participant.id}>
                      <div>
                        <strong>{participant.name}</strong>
                        <small>꼭 참석해야 하는 사람 · 응답 전</small>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRequestCandidateId(recommendedEvaluation.candidate.id)}
                      >
                        다시 요청하기
                      </button>
                    </div>
                  ))}
                </section>
              ) : null}
              {recommendedEvaluation.optionalPendingPool.length > 0 ? (
                <section className="decision-pending-group">
                  <header>
                    <strong>
                      아직 응답하지 않은 사람 · {recommendedEvaluation.optionalPendingPool.length}명
                    </strong>
                    {recommendedEvaluation.positiveResponsesNeededAfterRequiredYes === 0 ? (
                      <span>추가 필요 없음</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRequestCandidateId(recommendedEvaluation.candidate.id)}
                      >
                        응답 요청하기
                      </button>
                    )}
                  </header>
                  <div className="decision-optional-people">
                    {recommendedEvaluation.optionalPendingPool.map((participant) => (
                      <span key={participant.id}>{participant.name}</span>
                    ))}
                  </div>
                  <p>
                    {recommendedEvaluation.positiveResponsesNeededAfterRequiredYes === 0
                      ? '필수 참석자의 응답이 가능이면 이 그룹의 응답 없이도 확정할 수 있어요.'
                      : `이 중 ${recommendedEvaluation.positiveResponsesNeededAfterRequiredYes}명에게 ‘가능해요’ 응답을 받아야 해요.`}
                  </p>
                </section>
              ) : null}
            </div>
          ) : recommendedEvaluation.status === 'impossible' ? (
            <div className="decision-impossible-guide">
              <strong>다른 후보를 검토해 보세요</strong>
              <p>왼쪽 후보 목록에서 다른 시간을 선택하면 같은 기준으로 바로 비교할 수 있어요.</p>
              <button
                type="button"
                onClick={() =>
                  fallbackEvaluation != null
                    ? onSelectCandidate(fallbackEvaluation.candidate.id)
                    : onReviewCriteria()
                }
              >
                {fallbackEvaluation != null ? '지금 정할 수 있는 시간 보기' : '참석 기준 다시 보기'}
              </button>
            </div>
          ) : null}

          <div className="decision-criteria-inline">
            <span>참석 기준</span>
            <strong>{criteriaSummary}</strong>
            <button type="button" onClick={onReviewCriteria}>
              수정
            </button>
          </div>
        </section>
      </section>

      <details className="decision-matrix-disclosure" open>
        <summary>
          <div>
            <span>참석 가능 현황</span>
            <strong>전체 후보 비교</strong>
          </div>
          <span className="decision-matrix-disclosure__affordance">
            <small className="is-closed-label">펼쳐 보기</small>
            <small className="is-open-label">접기</small>
            <ChevronDown aria-hidden="true" size={18} />
          </span>
        </summary>
        <div className="decision-matrix-scroll">
          <table className="decision-matrix">
            <thead>
              <tr>
                <th scope="col">참석자</th>
                {evaluations.map((evaluation) => (
                  <th
                    className={
                      evaluation.candidate.id === recommendedEvaluation.candidate.id
                        ? 'is-selected'
                        : ''
                    }
                    key={evaluation.candidate.id}
                    scope="col"
                  >
                    {formatCandidateTime(evaluation.candidate)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meeting.participants.map((participant) => (
                <tr key={participant.id}>
                  <th scope="row">
                    <strong>{participant.name}</strong>
                    {participant.role === 'required' ? <small>필수</small> : null}
                  </th>
                  {evaluations.map((evaluation) => {
                    const detail = evaluation.responseDetails.find(
                      (item) => item.participant.id === participant.id,
                    )
                    const state = detail?.state
                    return (
                      <td
                        className={`${evaluation.candidate.id === recommendedEvaluation.candidate.id ? 'is-selected ' : ''}is-${state ?? 'unknown'}`}
                        key={evaluation.candidate.id}
                        aria-label={
                          state === 'available' || state === 'adjustment_commit'
                            ? '가능'
                            : state === 'unavailable'
                              ? '참석 어려움'
                              : '응답 전'
                        }
                      >
                        {state === 'available' || state === 'adjustment_commit' ? (
                          <Check size={16} />
                        ) : state === 'unavailable' ? (
                          <X size={16} />
                        ) : (
                          <Clock3 size={15} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer>
          <span className="is-positive">가능</span>
          <span className="is-negative">참석 어려움</span>
          <span className="is-unknown">응답 전</span>
        </footer>
      </details>

      {requestCandidateId === recommendedEvaluation.candidate.id ? (
        <ResponseRequestSelector
          key={recommendedEvaluation.candidate.id}
          evaluation={recommendedEvaluation}
          onCancel={() => setRequestCandidateId(null)}
          onSend={(recipientIds) => {
            onSendRequest(recommendedEvaluation, recipientIds)
            setRequestCandidateId(null)
          }}
        />
      ) : null}

      {requestedParticipant ? (
        <div className="prototype-flow-action prototype-flow-action--decision">
          <div>
            <span>요청이 전달됐어요</span>
            <strong>{requestedParticipant.name}님의 응답이 오면 결과를 다시 계산해요</strong>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => onOpenRequestedParticipant(requestedParticipant)}
          >
            {requestedParticipant.name}님 응답 이어보기
          </button>
        </div>
      ) : null}

      {evaluations.some((evaluation) => evaluation.deadlinePassed) ? (
        <div className="decision-deadline-notice" role="status">
          응답 마감이 지났지만, 아직 응답하지 않은 사람을 ‘참석하기 어려워요’로 처리하지 않았어요.
          늦게 온 응답도 반영해 결과를 다시 계산해요.
        </div>
      ) : null}

      <details className="candidate-calendar-disclosure" open={!isMobileDecisionMap}>
        <summary>
          <div>
            <span>전체 {evaluations.length}개</span>
            <strong>모든 시간 보기</strong>
          </div>
          <small>
            {readyCount}개 확정 가능 · {pendingCount}개 응답 대기 · {impossibleCount}개 제외
          </small>
        </summary>
        <section
          className="candidate-calendar"
          aria-labelledby="candidate-calendar-title"
          ref={candidateMapRef}
        >
          <div className="candidate-comparison__head">
            <div>
              <span>전체 후보</span>
              <h2 id="candidate-calendar-title">회의를 시작할 수 있는 구간을 한눈에 보세요</h2>
            </div>
            <div className="candidate-map-head-meta">
              <small>{evaluations.length}개 시작 시각</small>
              <div className="candidate-map-legend" aria-label="시간 지도 범례">
                <span>
                  <Check aria-hidden="true" size={14} />
                  지금 결정
                </span>
                <span>
                  <Clock3 aria-hidden="true" size={14} />
                  응답 필요
                </span>
                <span>
                  <X aria-hidden="true" size={14} />
                  제외 권장
                </span>
              </div>
            </div>
          </div>

          <div className="candidate-date-strip" aria-label="후보가 있는 날짜">
            {dateGroups.map(([dateKey, dateEvaluations]) => {
              const statuses = new Set(dateEvaluations.map((evaluation) => evaluation.status))
              const isSelected = dateKey === selectedDateKey

              return (
                <button
                  key={dateKey}
                  type="button"
                  className={isSelected ? 'is-selected' : ''}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedDateKey(dateKey)
                    setRequestCandidateId(null)
                  }}
                >
                  <span>{formatCandidateWeekday(dateKey)}</span>
                  <strong>{formatCandidateDay(dateKey)}</strong>
                  <small>{dateEvaluations.length}개 시간</small>
                  <span
                    className="candidate-date-dots"
                    aria-label={formatDateStatusSummary(dateEvaluations)}
                  >
                    {candidateStatusOrder.map((status) =>
                      statuses.has(status) ? (
                        <i key={status} className={`is-${getStatusTone(status)}`} />
                      ) : null,
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          <div
            className="candidate-decision-map"
            style={{
              gridTemplateColumns: `64px repeat(${visibleDateGroups.length}, minmax(120px, 1fr))`,
            }}
            aria-label="후보 시작 시각 지도"
          >
            <div className="candidate-decision-map__corner">시작</div>
            {visibleDateGroups.map(([dateKey]) => (
              <div className="candidate-decision-map__date" key={`head-${dateKey}`}>
                <span>{formatCandidateWeekday(dateKey)}</span>
                <strong>{formatCandidateDay(dateKey)}</strong>
              </div>
            ))}

            {candidateMapMinutes.map((minutes) => (
              <Fragment key={minutes}>
                <div className="candidate-decision-map__time">
                  {formatCandidateMinutes(minutes)}
                </div>
                {visibleDateGroups.map(([dateKey, dateEvaluations]) => {
                  const evaluation = dateEvaluations.find(
                    (candidate) => getCandidateMinuteOfDay(candidate.candidate.startAt) === minutes,
                  )

                  if (evaluation == null) {
                    return (
                      <div
                        className="candidate-decision-map__empty"
                        key={`${dateKey}-${minutes}`}
                      />
                    )
                  }

                  const previous = dateEvaluations.find(
                    (candidate) =>
                      getCandidateMinuteOfDay(candidate.candidate.startAt) === minutes - 30,
                  )
                  const next = dateEvaluations.find(
                    (candidate) =>
                      getCandidateMinuteOfDay(candidate.candidate.startAt) === minutes + 30,
                  )
                  const connectsBefore = hasSameDecisionBand(previous, evaluation)
                  const connectsAfter = hasSameDecisionBand(next, evaluation)
                  const isRecommended =
                    systemRecommendedEvaluation.status === 'ready' &&
                    hasSameRecommendationPriority(evaluation, systemRecommendedEvaluation)
                  const isSelected = evaluation.candidate.id === recommendedEvaluation.candidate.id

                  return (
                    <button
                      key={evaluation.candidate.id}
                      type="button"
                      className={`candidate-decision-map__slot is-${getStatusTone(evaluation.status)}${
                        connectsBefore ? ' is-connected-before' : ''
                      }${connectsAfter ? ' is-connected-after' : ''}${
                        isRecommended ? ' is-recommended' : ''
                      }${isSelected ? ' is-selected' : ''}`}
                      aria-label={`${formatCandidateFullDate(dateKey)} ${formatCandidateStartTime(
                        evaluation.candidate.startAt,
                      )}, ${candidateStatusLabels[evaluation.status]}${isRecommended ? ', 추천' : ''}`}
                      aria-pressed={isSelected}
                      onClick={() => {
                        onSelectCandidate(evaluation.candidate.id)
                        setSelectedDateKey(dateKey)
                        setRequestCandidateId(null)
                      }}
                    >
                      <span>{formatCandidateStartTime(evaluation.candidate.startAt)}</span>
                      {isRecommended ? (
                        <strong>추천</strong>
                      ) : evaluation.status === 'ready' ? (
                        <Check aria-hidden="true" size={13} />
                      ) : evaluation.status === 'pending' ? (
                        <Clock3 aria-hidden="true" size={13} />
                      ) : (
                        <X aria-hidden="true" size={13} />
                      )}
                    </button>
                  )
                })}
              </Fragment>
            ))}
          </div>

          <p className="candidate-map-hint">
            캘린더는 후보의 근거를 확인하는 영역이에요. 시간을 누르면 위의 후보와 근거가 함께
            바뀌어요.
          </p>
        </section>
      </details>
    </div>
  )
}

function ResponseRequestSelector({
  evaluation,
  onCancel,
  onSend,
}: {
  evaluation: CandidateEvaluation
  onCancel: () => void
  onSend: (recipientIds: string[]) => void
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedIdSet = new Set(selectedIds)
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const previouslyFocusedElement = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector<HTMLButtonElement>('.icon-button')?.focus()

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      previouslyFocusedElement?.focus()
    }
  }, [onCancel])

  function toggleParticipant(participantId: string) {
    setSelectedIds((currentIds) =>
      currentIds.includes(participantId)
        ? currentIds.filter((id) => id !== participantId)
        : [...currentIds, participantId],
    )
  }

  function renderParticipantOption(participant: Participant, context: string) {
    return (
      <label className="request-recipient-option" key={participant.id}>
        <input
          type="checkbox"
          checked={selectedIdSet.has(participant.id)}
          onChange={() => toggleParticipant(participant.id)}
        />
        <span className="request-recipient-check" aria-hidden="true">
          <Check size={14} strokeWidth={3} />
        </span>
        <span>
          <strong>{participant.name}</strong>
          <small>{context}</small>
        </span>
      </label>
    )
  }

  return createPortal(
    <div
      className="request-recipient-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onCancel()
      }}
    >
      <section
        ref={dialogRef}
        className="request-recipient-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-recipient-title"
      >
      <header>
        <div>
          <span>응답 요청</span>
          <h2 id="request-recipient-title">누구에게 응답을 요청할까요?</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="응답 요청 창 닫기"
          onClick={onCancel}
        >
          <X size={20} />
        </button>
      </header>

      {evaluation.requiredPending.length > 0 ? (
        <fieldset className="request-recipient-group">
          <legend>이 사람의 ‘가능해요’ 응답이 꼭 필요해요</legend>
          {evaluation.requiredPending.map((participant) =>
            renderParticipantOption(participant, '꼭 참석해야 하는 사람'),
          )}
        </fieldset>
      ) : null}

      {evaluation.positiveResponsesNeededAfterRequiredYes > 0 ? (
        <fieldset className="request-recipient-group">
          <legend>
            이 중 {evaluation.positiveResponsesNeededAfterRequiredYes}명에게 ‘가능해요’ 응답을
            받아야 해요
          </legend>
          {evaluation.optionalPendingPool.map((participant) =>
            renderParticipantOption(participant, '아직 응답하지 않은 사람'),
          )}
        </fieldset>
      ) : null}

        <footer>
        <p>응답이 필요한 사람 중에서 이번에 요청할 사람을 골라주세요.</p>
        <button
          className="primary-button"
          type="button"
          disabled={selectedIds.length === 0}
          onClick={() => onSend(selectedIds)}
        >
          {selectedIds.length > 0
            ? `${selectedIds.length}명에게 응답 요청하기`
            : '요청할 사람을 선택해 주세요'}
        </button>
        </footer>
      </section>
    </div>,
    document.body,
  )
}

const TIME_QUANTUM_MINUTES = 30
const TIME_GRID_START_MINUTES = 9 * 60
const TIME_GRID_END_MINUTES = 18 * 60
const TIME_SLOT_MINUTES = Array.from(
  { length: (TIME_GRID_END_MINUTES - TIME_GRID_START_MINUTES) / TIME_QUANTUM_MINUTES },
  (_, index) => TIME_GRID_START_MINUTES + index * TIME_QUANTUM_MINUTES,
)
const meetingDurationOptions: MeetingDuration[] = [30, 60, 90, 120]
const MIN_CUSTOM_DURATION = 30
const MAX_CUSTOM_DURATION = 240
const CUSTOM_DURATION_STEP = 30
type MeetingWithDuration = Meeting & { durationMinutes: MeetingDuration }
const koreanDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
})
const koreanShortDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'numeric',
  day: 'numeric',
})
const koreanWeekdayFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  weekday: 'short',
})

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const updateMatch = () => setMatches(mediaQuery.matches)

    updateMatch()
    mediaQuery.addEventListener('change', updateMatch)

    return () => mediaQuery.removeEventListener('change', updateMatch)
  }, [query])

  return matches
}

function toCalendarDate(date: Date) {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function parseCalendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new CalendarDate(year, month, day)
}

function toLocalDate(date: CalendarDate, minuteOfDay = 0) {
  const hour = Math.floor(minuteOfDay / 60)
  const minute = minuteOfDay % 60

  return new Date(date.year, date.month - 1, date.day, hour, minute, 0, 0)
}

function formatTimeOfDay(minuteOfDay: number) {
  const hour = Math.floor(minuteOfDay / 60)
  const minute = minuteOfDay % 60

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDateTimeLocalInput(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${formatDateInput(date)}T${formatTimeOfDay(date.getHours() * 60 + date.getMinutes())}`
}

function parseDateTimeLocalInput(value: string) {
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function getEarliestAvailabilityStart(windows: AvailabilityWindow[]) {
  if (windows.length === 0) {
    return null
  }

  return new Date(Math.min(...windows.map((window) => new Date(window.startAt).getTime())))
}

function suggestResponseDeadline(windows: AvailabilityWindow[]) {
  const earliestCandidate = getEarliestAvailabilityStart(windows)

  if (earliestCandidate == null) {
    return ''
  }

  const now = new Date()
  const preferred = new Date(earliestCandidate.getTime() - 24 * 60 * 60 * 1000)
  const fallback = new Date(earliestCandidate.getTime() - 60 * 60 * 1000)

  if (preferred.getTime() > now.getTime()) {
    return preferred.toISOString()
  }

  return fallback.getTime() > now.getTime() ? fallback.toISOString() : ''
}

function formatAvailabilityWindow(window: AvailabilityWindow) {
  return formatCandidateTime({
    id: window.id,
    meetingId: window.meetingId,
    startAt: window.startAt,
    endAt: window.endAt,
  })
}

function formatAvailabilityStart(date: Date) {
  return `${new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(date)} ${formatTimeOfDay(date.getHours() * 60 + date.getMinutes())}부터`
}

function AvailabilityWindowPicker({
  meeting,
  onAvailabilityWindowsChange,
}: {
  meeting: MeetingWithDuration
  onAvailabilityWindowsChange: (windows: AvailabilityWindow[]) => void
}) {
  const isMobile = useMediaQuery('(max-width: 900px)')
  const [todayDate] = useState(() => today(getLocalTimeZone()))
  const windowStartDate = useMemo(
    () => parseCalendarDate(meeting.schedulingWindow.startDate),
    [meeting.schedulingWindow.startDate],
  )
  const windowEndDate = useMemo(
    () => parseCalendarDate(meeting.schedulingWindow.endDate),
    [meeting.schedulingWindow.endDate],
  )
  const [selectedDate, setSelectedDate] = useState(windowStartDate)
  const [focusedSlot, setFocusedSlot] = useState({ dayIndex: 0, timeIndex: 0 })
  const [preview, setPreview] = useState<{
    date: CalendarDate
    startMinutes: number
    endMinutes: number
  } | null>(null)
  const [brushMode, setBrushMode] = useState<ScopeBrushMode>('exclude')
  const gridRef = useRef<HTMLDivElement>(null)
  const dragSelectionRef = useRef<{
    date: CalendarDate
    startMinutes: number
    currentMinutes: number
    pointerId: number
    startX: number
    startY: number
    moved: boolean
    mode: ScopeBrushMode
  } | null>(null)
  const suppressNextClickRef = useRef(false)
  const activeDate =
    selectedDate.compare(windowStartDate) < 0 || selectedDate.compare(windowEndDate) > 0
      ? windowStartDate
      : selectedDate
  const weekStart = useMemo(() => startOfWeek(activeDate, 'ko-KR', 'mon'), [activeDate])
  const firstWindowWeek = useMemo(
    () => startOfWeek(windowStartDate, 'ko-KR', 'mon'),
    [windowStartDate],
  )
  const lastWindowWeek = useMemo(() => startOfWeek(windowEndDate, 'ko-KR', 'mon'), [windowEndDate])
  const displayDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => weekStart.add({ days: index })),
    [weekStart],
  )
  const selectedDateCount = useMemo(
    () =>
      new Set(
        meeting.availabilityWindows.map((window) =>
          toCalendarDate(new Date(window.startAt)).toString(),
        ),
      ).size,
    [meeting.availabilityWindows],
  )
  const selectedMinutes = useMemo(
    () =>
      meeting.availabilityWindows.reduce(
        (total, window) =>
          total + (new Date(window.endAt).getTime() - new Date(window.startAt).getTime()) / 60_000,
        0,
      ),
    [meeting.availabilityWindows],
  )

  function isOutsideWindow(date: CalendarDate) {
    return (
      date.compare(todayDate) < 0 ||
      date.compare(windowStartDate) < 0 ||
      date.compare(windowEndDate) > 0
    )
  }

  function windowOccupyingSlot(date: CalendarDate, startMinutes: number) {
    const slotStart = toLocalDate(date, startMinutes).getTime()

    return meeting.availabilityWindows.find((window) => {
      const rangeStart = new Date(window.startAt).getTime()
      const rangeEnd = new Date(window.endAt).getTime()
      return rangeStart <= slotStart && slotStart < rangeEnd
    })
  }

  function buildRange(date: CalendarDate, startMinutes: number) {
    const endMinutes = startMinutes + TIME_QUANTUM_MINUTES

    if (startMinutes < TIME_GRID_START_MINUTES || endMinutes > TIME_GRID_END_MINUTES) {
      return null
    }

    return { date, startMinutes, endMinutes }
  }

  function buildDragRange(date: CalendarDate, anchorMinutes: number, edgeMinutes: number) {
    const startMinutes = Math.min(anchorMinutes, edgeMinutes)
    const endMinutes = Math.max(anchorMinutes, edgeMinutes) + TIME_QUANTUM_MINUTES

    if (startMinutes < TIME_GRID_START_MINUTES || endMinutes > TIME_GRID_END_MINUTES) {
      return null
    }

    return { date, startMinutes, endMinutes }
  }

  function previewFrom(date: CalendarDate, startMinutes: number) {
    if (isOutsideWindow(date)) {
      setPreview(null)
      return
    }

    const range = buildRange(date, startMinutes)
    const canPreview =
      range != null &&
      (brushMode === 'exclude'
        ? windowOccupyingSlot(date, startMinutes) != null
        : windowOccupyingSlot(date, startMinutes) == null)
    setPreview(canPreview ? range : null)
  }

  function chooseBoundary(date: CalendarDate, startMinutes: number) {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      return
    }

    const existingWindow = windowOccupyingSlot(date, startMinutes)

    if (brushMode === 'exclude') {
      if (existingWindow != null) {
        excludeRange({
          date,
          startMinutes,
          endMinutes: startMinutes + TIME_QUANTUM_MINUTES,
        })
      }
      setPreview(null)
      return
    }

    if (existingWindow != null) return

    if (isOutsideWindow(date)) {
      return
    }

    const range = buildRange(date, startMinutes)

    if (range == null) return

    commitRange(range)
  }

  function commitRange(range: { date: CalendarDate; startMinutes: number; endMinutes: number }) {
    const nextWindow: AvailabilityWindow = {
      id: `aw-${meeting.hostId}-${toLocalDate(range.date, range.startMinutes).getTime()}`,
      meetingId: meeting.id,
      ownerId: meeting.hostId,
      startAt: toLocalDate(range.date, range.startMinutes).toISOString(),
      endAt: toLocalDate(range.date, range.endMinutes).toISOString(),
      state: 'available',
    }

    onAvailabilityWindowsChange([...meeting.availabilityWindows, nextWindow])
    setPreview(null)
  }

  function excludeRange(range: { date: CalendarDate; startMinutes: number; endMinutes: number }) {
    onAvailabilityWindowsChange(
      removeAvailabilityRange(meeting.availabilityWindows, meeting.hostId, {
        startAt: toLocalDate(range.date, range.startMinutes).toISOString(),
        endAt: toLocalDate(range.date, range.endMinutes).toISOString(),
      }),
    )
    setPreview(null)
  }

  function resetDefaultScope() {
    onAvailabilityWindowsChange(
      createDefaultHostAvailabilityWindows({
        meetingId: meeting.id,
        hostId: meeting.hostId,
        startDate: meeting.schedulingWindow.startDate,
        endDate: meeting.schedulingWindow.endDate,
      }),
    )
    setBrushMode('exclude')
    setPreview(null)
  }

  function beginDragSelection(
    event: ReactPointerEvent<HTMLButtonElement>,
    date: CalendarDate,
    startMinutes: number,
  ) {
    if (event.button !== 0 || event.pointerType === 'touch' || isOutsideWindow(date)) return

    const range = buildRange(date, startMinutes)
    if (range == null) return

    event.currentTarget.setPointerCapture(event.pointerId)
    dragSelectionRef.current = {
      date,
      startMinutes,
      currentMinutes: startMinutes,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      mode: brushMode,
    }
    setPreview(range)
  }

  function updateDragSelection(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragSelectionRef.current
    if (drag == null || drag.pointerId !== event.pointerId) return

    const movedDistance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY)
    if (!drag.moved && movedDistance < 5) return

    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLButtonElement>('[data-availability-date][data-start-minutes]')
    const targetDate = target?.dataset.availabilityDate
    const targetMinutes = Number(target?.dataset.startMinutes)

    if (targetDate == null || !Number.isFinite(targetMinutes)) return

    const date = parseCalendarDate(targetDate)
    if (date.compare(drag.date) !== 0) return

    drag.moved = true
    drag.currentMinutes = targetMinutes
    const range = buildDragRange(drag.date, drag.startMinutes, targetMinutes)
    setPreview(range)
  }

  function finishDragSelection(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragSelectionRef.current
    if (drag == null || drag.pointerId !== event.pointerId) return

    if (drag.moved) {
      const range = buildDragRange(drag.date, drag.startMinutes, drag.currentMinutes)
      if (range != null) {
        suppressNextClickRef.current = true
        window.setTimeout(() => {
          suppressNextClickRef.current = false
        }, 0)
        if (drag.mode === 'exclude') {
          excludeRange(range)
        } else {
          commitRange(range)
        }
      } else {
        setPreview(null)
      }
    }

    dragSelectionRef.current = null
  }

  function cancelDragSelection() {
    dragSelectionRef.current = null
    setPreview(null)
  }

  function focusGridSlot(dayIndex: number, timeIndex: number) {
    const nextDayIndex = Math.min(Math.max(dayIndex, 0), displayDays.length - 1)
    const nextTimeIndex = Math.min(Math.max(timeIndex, 0), TIME_SLOT_MINUTES.length - 1)

    setFocusedSlot({ dayIndex: nextDayIndex, timeIndex: nextTimeIndex })
    gridRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-availability-index="${nextTimeIndex}-${nextDayIndex}"]`,
      )
      ?.focus()
  }

  function handleGridKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    dayIndex: number,
    timeIndex: number,
  ) {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusGridSlot(dayIndex + 1, timeIndex)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusGridSlot(dayIndex - 1, timeIndex)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusGridSlot(dayIndex, timeIndex + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusGridSlot(dayIndex, timeIndex - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      chooseBoundary(displayDays[dayIndex], TIME_SLOT_MINUTES[timeIndex])
    }
  }

  function changeWeek(offset: number) {
    const nextDate = activeDate.add({ weeks: offset })

    if (nextDate.compare(windowStartDate) < 0) {
      setSelectedDate(windowStartDate)
    } else if (nextDate.compare(windowEndDate) > 0) {
      setSelectedDate(windowEndDate)
    } else {
      setSelectedDate(nextDate)
    }
  }

  const weekEnd = displayDays[displayDays.length - 1]
  const weekLabel = `${koreanShortDateFormatter.format(toLocalDate(weekStart))} - ${koreanShortDateFormatter.format(toLocalDate(weekEnd))}`
  const cannotGoPrevious = weekStart.compare(firstWindowWeek) <= 0
  const cannotGoNext = weekStart.compare(lastWindowWeek) >= 0

  return (
    <div className="time-picker availability-picker" data-brush-mode={brushMode}>
      <div className="time-picker__status">
        <div>
          <span>참석자에게 물어볼 시간</span>
          <strong>
            {selectedDateCount}일 · {formatMeetingDuration(selectedMinutes)}
          </strong>
        </div>
        <span>안 되는 시간만 빼면 돼요</span>
      </div>

      <div className="availability-brush-toolbar" aria-label="시간 범위 편집 도구">
        <div className="availability-brush-group" role="group" aria-label="편집 모드">
          <button
            className={brushMode === 'exclude' ? 'is-selected' : ''}
            type="button"
            aria-pressed={brushMode === 'exclude'}
            onClick={() => setBrushMode('exclude')}
          >
            제외할 시간
          </button>
          <button
            className={brushMode === 'add' ? 'is-selected' : ''}
            type="button"
            aria-pressed={brushMode === 'add'}
            onClick={() => setBrushMode('add')}
          >
            추가할 시간
          </button>
        </div>
        <button className="availability-reset-button" type="button" onClick={resetDefaultScope}>
          기본값 복원
        </button>
      </div>

      <div className="availability-scope-legend" aria-label="시간표 표시 의미">
        <span>
          <i className="is-included" aria-hidden="true" /> 파란 칸은 참석자에게 물어볼 시간
        </span>
        <span>
          <i className="is-excluded" aria-hidden="true" /> 흰 칸은 제외한 시간
        </span>
      </div>

      <div className="time-picker__toolbar">
        <div className="time-picker__week-navigation" aria-label="주간 이동">
          <button
            type="button"
            aria-label="이전 주"
            disabled={cannotGoPrevious}
            onClick={() => changeWeek(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <strong>{weekLabel}</strong>
          <button
            type="button"
            aria-label="다음 주"
            disabled={cannotGoNext}
            onClick={() => changeWeek(1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {isMobile ? (
        <div className="mobile-time-picker">
          <div className="mobile-date-strip" aria-label="날짜 선택">
            {displayDays.map((date) => {
              const isSelectedDate = date.compare(activeDate) === 0

              return (
                <button
                  key={date.toString()}
                  className={isSelectedDate ? 'is-selected' : ''}
                  type="button"
                  disabled={isOutsideWindow(date)}
                  onClick={() => setSelectedDate(date)}
                >
                  <span>{koreanWeekdayFormatter.format(toLocalDate(date))}</span>
                  <strong>{date.day}</strong>
                </button>
              )
            })}
          </div>
          <section className="mobile-time-slots" aria-labelledby="mobile-availability-title">
            <h2 id="mobile-availability-title">
              {brushMode === 'exclude'
                ? '제외할 시간을 눌러 지워주세요'
                : '추가할 시간을 눌러 칠해주세요'}
            </h2>
            <div
              className="mobile-time-slot-list mobile-availability-list"
              onPointerMove={updateDragSelection}
              onPointerUp={finishDragSelection}
              onPointerCancel={cancelDragSelection}
            >
              {TIME_SLOT_MINUTES.map((startMinutes) => {
                const selectedWindow = windowOccupyingSlot(activeDate, startMinutes)
                return (
                  <button
                    key={startMinutes}
                    className={selectedWindow != null ? 'is-selected' : ''}
                    type="button"
                    aria-pressed={selectedWindow != null}
                    disabled={isOutsideWindow(activeDate)}
                    data-availability-date={activeDate.toString()}
                    data-start-minutes={startMinutes}
                    onPointerDown={(event) => beginDragSelection(event, activeDate, startMinutes)}
                    onClick={() => chooseBoundary(activeDate, startMinutes)}
                  >
                    <span>{formatTimeOfDay(startMinutes)}</span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      ) : (
        <div className="time-picker__workspace availability-paint-workspace">
          <div
            ref={gridRef}
            className="week-time-grid availability-paint-grid"
            role="grid"
            aria-label={`${weekLabel} 가능한 시간 칠하기`}
            onPointerMove={updateDragSelection}
            onPointerUp={finishDragSelection}
            onPointerCancel={cancelDragSelection}
            onMouseLeave={() => {
              if (dragSelectionRef.current == null) {
                setPreview(null)
              }
            }}
          >
            <div className="week-time-grid__header" role="row">
              <span aria-hidden="true" />
              {displayDays.map((date) => (
                <div key={date.toString()} role="columnheader">
                  <span>{koreanWeekdayFormatter.format(toLocalDate(date))}</span>
                  <strong>{date.day}</strong>
                </div>
              ))}
            </div>

            {TIME_SLOT_MINUTES.map((startMinutes, timeIndex) => (
              <div className="week-time-grid__row" role="row" key={startMinutes}>
                <span role="rowheader">{formatTimeOfDay(startMinutes)}</span>
                {displayDays.map((date, dayIndex) => {
                  const selectedWindow = windowOccupyingSlot(date, startMinutes)
                  const previewStartsHere =
                    preview != null &&
                    preview.date.compare(date) === 0 &&
                    preview.startMinutes === startMinutes
                  const isPreviewSlot =
                    preview != null &&
                    preview.date.compare(date) === 0 &&
                    startMinutes >= preview.startMinutes &&
                    startMinutes < preview.endMinutes
                  const previewEndsHere =
                    isPreviewSlot &&
                    preview != null &&
                    startMinutes + TIME_QUANTUM_MINUTES >= preview.endMinutes
                  const className = [
                    selectedWindow != null ? 'is-selected' : '',
                    isPreviewSlot ? 'is-preview-slot' : '',
                    previewStartsHere ? 'is-preview-start' : '',
                    previewEndsHere ? 'is-preview-end' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')

                  return (
                    <div role="gridcell" key={`${date.toString()}-${startMinutes}`}>
                      <button
                        className={className}
                        type="button"
                        data-availability-index={`${timeIndex}-${dayIndex}`}
                        data-availability-date={date.toString()}
                        data-start-minutes={startMinutes}
                        tabIndex={
                          focusedSlot.dayIndex === dayIndex && focusedSlot.timeIndex === timeIndex
                            ? 0
                            : -1
                        }
                        aria-pressed={selectedWindow != null}
                        aria-label={`${koreanDateFormatter.format(toLocalDate(date))} ${formatTimeOfDay(startMinutes)}${selectedWindow != null ? `, ${formatAvailabilityWindow(selectedWindow)} 가능한 시간대에 포함됨` : ', 시간대 경계로 선택'}`}
                        disabled={isOutsideWindow(date)}
                        onFocus={() => {
                          setFocusedSlot({ dayIndex, timeIndex })
                          previewFrom(date, startMinutes)
                        }}
                        onMouseEnter={() => previewFrom(date, startMinutes)}
                        onKeyDown={(event) => handleGridKeyDown(event, dayIndex, timeIndex)}
                        onPointerDown={(event) => beginDragSelection(event, date, startMinutes)}
                        onClick={() => chooseBoundary(date, startMinutes)}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CreateScreen({
  meeting,
  onTitleChange,
  onPurposeChange,
  onReferenceMaterialChange,
  onSchedulingWindowChange,
  onDurationChange,
  onResponseDeadlineChange,
  onAttendanceModeChange,
  onAttendanceThresholdModeChange,
  onMinAttendeeCountChange,
  onParticipantRoleChange,
  onParticipantAdd,
  onParticipantRemove,
  onAvailabilityWindowsChange,
  onSendRequest,
}: {
  meeting: Meeting
  onTitleChange: (title: string) => void
  onPurposeChange: (purpose: string) => void
  onReferenceMaterialChange: (referenceMaterial: string) => void
  onSchedulingWindowChange: (schedulingWindow: SchedulingWindow) => void
  onDurationChange: (durationMinutes: MeetingDuration | null) => void
  onResponseDeadlineChange: (responseDeadline: string) => void
  onAttendanceModeChange: (mode: AttendeeDecisionMode) => void
  onAttendanceThresholdModeChange: (mode: AttendanceThresholdMode) => void
  onMinAttendeeCountChange: (count: number) => void
  onParticipantRoleChange: (participantId: string, role: ParticipantRole) => void
  onParticipantAdd: (name?: string) => void
  onParticipantRemove: (participantId: string) => void
  onAvailabilityWindowsChange: (windows: AvailabilityWindow[]) => void
  onSendRequest: () => void
}) {
  const [createNow] = useState(() => new Date())
  const [step, setStep] = useState<HostCreateStep>('meeting')
  const [timeStep, setTimeStep] = useState<TimeCreateStep>('constraints')
  const [initializedHostScopeKey, setInitializedHostScopeKey] = useState<string | null>(null)
  const [isCustomDurationOpen, setIsCustomDurationOpen] = useState(
    () =>
      meeting.durationMinutes != null && !meetingDurationOptions.includes(meeting.durationMinutes),
  )
  const [customDurationInput, setCustomDurationInput] = useState(() =>
    meeting.durationMinutes != null && !meetingDurationOptions.includes(meeting.durationMinutes)
      ? String(meeting.durationMinutes)
      : '',
  )
  const [isReferenceOpen, setIsReferenceOpen] = useState(false)
  const [attendeeQuery, setAttendeeQuery] = useState('')
  const [isPeoplePickerOpen, setIsPeoplePickerOpen] = useState(false)
  const [areAttendeesFinalized, setAreAttendeesFinalized] = useState(false)
  const [attendeeAnnouncement, setAttendeeAnnouncement] = useState('')
  const [recentInvitees, setRecentInvitees] = useState<string[]>(() => {
    if (typeof window === 'undefined') {
      return attendeeDirectory
    }

    try {
      const storedNames = JSON.parse(window.localStorage.getItem(recentInviteesStorageKey) ?? '[]')

      return Array.isArray(storedNames) && storedNames.length > 0
        ? storedNames.filter((name): name is string => typeof name === 'string')
        : attendeeDirectory
    } catch {
      return attendeeDirectory
    }
  })
  const [attendeeDecisionMode, setAttendeeDecisionMode] = useState<AttendeeDecisionMode | null>(
    null,
  )
  const peopleStepRef = useRef<HTMLElement>(null)
  const decisionStepRef = useRef<HTMLElement>(null)
  const timeStepRef = useRef<HTMLElement>(null)
  const customDurationTriggerRef = useRef<HTMLButtonElement>(null)
  const workflowRef = useRef<HTMLElement>(null)
  const previousCreateStepRef = useRef<HostCreateStep>('meeting')
  const shouldFocusPeopleRef = useRef(false)
  const shouldFocusDecisionRef = useRef(false)

  const currentStepIndex = Math.max(
    0,
    createSteps.findIndex((item) => item.id === step),
  )
  const hostAvailabilityWindows = meeting.availabilityWindows.filter(
    (window) => window.ownerId === meeting.hostId,
  )
  const meetingPurpose = meeting.purpose.trim()
  const referenceMaterial = meeting.referenceMaterial?.trim() ?? ''
  const referenceItems = referenceMaterial
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
  const invitedParticipants = meeting.participants.filter(
    (participant) => participant.id !== meeting.hostId,
  )
  const requiredParticipants = invitedParticipants.filter(
    (participant) => participant.role === 'required',
  )
  const hasInvitee = invitedParticipants.length > 0
  const inviteeNames = invitedParticipants.map((participant) => participant.name)
  const selectedNames = new Set(
    invitedParticipants.map((participant) => participant.name.trim().toLocaleLowerCase()),
  )
  const normalizedAttendeeQuery = attendeeQuery.trim().toLocaleLowerCase()
  const visiblePeople = (normalizedAttendeeQuery ? attendeeDirectory : recentInvitees).filter(
    (name, index, names) =>
      names.indexOf(name) === index && name.toLocaleLowerCase().includes(normalizedAttendeeQuery),
  )
  const isMeetingComplete = meeting.title.trim() !== '' && meetingPurpose !== ''
  const todayInput = formatDateInput(createNow)
  const isDurationValid =
    meeting.durationMinutes != null &&
    meeting.durationMinutes >= MIN_CUSTOM_DURATION &&
    meeting.durationMinutes <= MAX_CUSTOM_DURATION &&
    meeting.durationMinutes % CUSTOM_DURATION_STEP === 0
  const isSchedulingWindowValid =
    meeting.schedulingWindow.startDate >= todayInput &&
    meeting.schedulingWindow.endDate >= meeting.schedulingWindow.startDate
  const isTimeConstraintComplete = isSchedulingWindowValid && isDurationValid
  const hostScopeKey = `${meeting.schedulingWindow.startDate}:${meeting.schedulingWindow.endDate}:${meeting.durationMinutes ?? 'unset'}`
  const meetingWithDuration: MeetingWithDuration | null =
    meeting.durationMinutes == null
      ? null
      : { ...meeting, durationMinutes: meeting.durationMinutes }
  const parsedCustomDuration = Number(customDurationInput)
  const isCustomDurationInputValid =
    customDurationInput !== '' &&
    Number.isInteger(parsedCustomDuration) &&
    parsedCustomDuration >= MIN_CUSTOM_DURATION &&
    parsedCustomDuration <= MAX_CUSTOM_DURATION &&
    parsedCustomDuration % CUSTOM_DURATION_STEP === 0
  const earliestAvailabilityStart = getEarliestAvailabilityStart(hostAvailabilityWindows)
  const responseDeadlineTime = new Date(meeting.responseDeadline).getTime()
  const isResponseDeadlineValid =
    earliestAvailabilityStart != null &&
    !Number.isNaN(responseDeadlineTime) &&
    responseDeadlineTime > createNow.getTime() &&
    responseDeadlineTime < earliestAvailabilityStart.getTime()
  const isRequiredSelectionMissing =
    attendeeDecisionMode === 'required' && requiredParticipants.length === 0
  const minimumAllowedAttendees = Math.max(1, requiredParticipants.length + 1)
  const attendanceThresholdMode: AttendanceThresholdMode =
    meeting.preset === 'quorum' ? 'minimum_count' : 'required_only'
  const maximumAttendees = invitedParticipants.length + 1
  const isMinimumAttendanceValid =
    attendeeDecisionMode !== 'required' ||
    (meeting.minAttendeeCount >= minimumAllowedAttendees &&
      meeting.minAttendeeCount <= maximumAttendees)
  const canGoNext =
    step === 'meeting'
      ? isMeetingComplete
      : step === 'attendees'
        ? areAttendeesFinalized &&
          hasInvitee &&
          attendeeDecisionMode !== null &&
          !isRequiredSelectionMissing &&
          isMinimumAttendanceValid
        : step === 'times'
          ? timeStep === 'constraints'
            ? isTimeConstraintComplete
            : timeStep === 'candidates'
              ? hostAvailabilityWindows.length > 0
              : isResponseDeadlineValid
          : true
  const primaryActionLabel =
    step === 'meeting'
      ? '초대할 사람 정하기'
      : step === 'attendees'
        ? '회의 시간 정하기'
        : step === 'times'
          ? timeStep === 'constraints'
            ? '가능한 시간대 고르기'
            : timeStep === 'candidates'
              ? hostAvailabilityWindows.length > 0
                ? '이 시간대로 계속'
                : '시간 범위를 남겨 주세요'
              : '요청 내용 확인하기'
          : '응답 요청 보내기'
  const isChoosingAttendees = step === 'attendees' && !areAttendeesFinalized
  const attendeePrimaryActionLabel = isChoosingAttendees
    ? hasInvitee
      ? `${invitedParticipants.length}명 선택 완료`
      : '사람을 선택해 주세요'
    : attendeeDecisionMode == null
      ? '참석 방식을 선택해 주세요'
      : isRequiredSelectionMissing
        ? '꼭 필요한 사람을 선택해 주세요'
        : !isMinimumAttendanceValid
          ? '진행할 인원을 정해 주세요'
          : '회의 시간 정하기'
  const currentCanContinue = isChoosingAttendees ? hasInvitee : canGoNext
  const desktopPrimaryActionLabel =
    step === 'attendees' ? attendeePrimaryActionLabel : primaryActionLabel
  const mobilePrimaryActionLabel =
    step === 'attendees' ? attendeePrimaryActionLabel : primaryActionLabel

  function selectPresetDuration(duration: MeetingDuration) {
    setIsCustomDurationOpen(false)
    setCustomDurationInput('')
    onDurationChange(duration)
  }

  function openCustomDuration() {
    setIsCustomDurationOpen(true)
    const initialDuration = meeting.durationMinutes ?? MIN_CUSTOM_DURATION

    setCustomDurationInput(String(initialDuration))
    onDurationChange(initialDuration)
  }

  function closeCustomDuration() {
    setIsCustomDurationOpen(false)
    setCustomDurationInput('')
    onDurationChange(null)

    window.requestAnimationFrame(() => customDurationTriggerRef.current?.focus())
  }

  function updateCustomDurationInput(value: string) {
    setCustomDurationInput(value)

    const duration = Number(value)
    const isValid =
      value !== '' &&
      Number.isInteger(duration) &&
      duration >= MIN_CUSTOM_DURATION &&
      duration <= MAX_CUSTOM_DURATION &&
      duration % CUSTOM_DURATION_STEP === 0

    onDurationChange(isValid ? duration : null)
  }

  function stepCustomDuration(direction: -1 | 1) {
    const baseDuration = isCustomDurationInputValid ? parsedCustomDuration : MIN_CUSTOM_DURATION
    const nextDuration = Math.min(
      MAX_CUSTOM_DURATION,
      Math.max(MIN_CUSTOM_DURATION, baseDuration + direction * CUSTOM_DURATION_STEP),
    )

    updateCustomDurationInput(String(nextDuration))
  }

  function addAttendee(name: string, clearQuery = true) {
    const normalizedName = name.trim()

    if (!normalizedName || selectedNames.has(normalizedName.toLocaleLowerCase())) {
      return
    }

    onParticipantAdd(normalizedName)
    setAttendeeAnnouncement(
      `${normalizedName}님을 추가했어요. 선택한 사람 ${invitedParticipants.length + 1}명`,
    )

    if (clearQuery) {
      setAttendeeQuery('')
    }
  }

  function removeAttendee(participant: Participant) {
    onParticipantRemove(participant.id)
    setAttendeeAnnouncement(
      `${participant.name}님을 제외했어요. 선택한 사람 ${Math.max(
        invitedParticipants.length - 1,
        0,
      )}명`,
    )
  }

  function toggleAttendee(name: string) {
    const participant = invitedParticipants.find(
      (item) => item.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
    )

    if (participant) {
      removeAttendee(participant)
      return
    }

    addAttendee(name, false)
  }

  function focusAttendeeSubstep(target: HTMLElement | null) {
    if (!target) {
      return
    }

    const heading = target.querySelector<HTMLElement>('[data-attendee-step-heading]')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    heading?.focus({ preventScroll: true })
  }

  useEffect(() => {
    if (step !== 'attendees') {
      return
    }

    if (areAttendeesFinalized && shouldFocusDecisionRef.current) {
      shouldFocusDecisionRef.current = false
      const frame = window.requestAnimationFrame(() =>
        focusAttendeeSubstep(decisionStepRef.current),
      )

      return () => window.cancelAnimationFrame(frame)
    }

    if (!areAttendeesFinalized && shouldFocusPeopleRef.current) {
      shouldFocusPeopleRef.current = false
      const frame = window.requestAnimationFrame(() => focusAttendeeSubstep(peopleStepRef.current))

      return () => window.cancelAnimationFrame(frame)
    }
  }, [areAttendeesFinalized, step])

  useEffect(() => {
    if (!isPeoplePickerOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsPeoplePickerOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPeoplePickerOpen])

  useEffect(() => {
    if (previousCreateStepRef.current === step) {
      return
    }

    previousCreateStepRef.current = step
    const frame = window.requestAnimationFrame(() => {
      const activePhase = workflowRef.current?.querySelector<HTMLElement>(
        '.create-task[aria-current="step"]',
      )
      const heading = activePhase?.querySelector<HTMLElement>('h1')
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      activePhase?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
      heading?.focus({ preventScroll: true })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [step])

  useEffect(() => {
    if (step !== 'times') {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      const heading = timeStepRef.current?.querySelector<HTMLElement>('h2')
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      timeStepRef.current?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      })
      heading?.focus({ preventScroll: true })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [step, timeStep])

  function finalizeAttendees() {
    if (!hasInvitee) {
      return
    }

    setIsPeoplePickerOpen(false)
    setRecentInvitees((currentNames) => {
      const nextNames = [...inviteeNames, ...currentNames]
        .filter((name, index, names) => names.indexOf(name) === index)
        .slice(0, 8)

      try {
        window.localStorage.setItem(recentInviteesStorageKey, JSON.stringify(nextNames))
      } catch {
        // The selection still works when storage is unavailable.
      }

      return nextNames
    })
    shouldFocusDecisionRef.current = true
    setAreAttendeesFinalized(true)
  }

  function editAttendees() {
    shouldFocusPeopleRef.current = true
    setAreAttendeesFinalized(false)
  }

  function selectAttendanceMode(mode: AttendeeDecisionMode) {
    setAttendeeDecisionMode(mode)
    onAttendanceModeChange(mode)
  }

  function goToNextStep() {
    if (!canGoNext) {
      return
    }

    if (step === 'review') {
      onSendRequest()
      return
    }

    const nextStep = createSteps[Math.min(currentStepIndex + 1, createSteps.length - 1)]
    setStep(nextStep.id)
  }

  function goToPreviousStep() {
    if (step === 'times' && timeStep !== 'constraints') {
      setTimeStep(timeStep === 'deadline' ? 'candidates' : 'constraints')
      return
    }

    const previousStep = createSteps[Math.max(currentStepIndex - 1, 0)]
    setStep(previousStep.id)
  }

  function handlePrimaryAction() {
    if (isChoosingAttendees) {
      finalizeAttendees()
      return
    }

    if (step === 'times' && timeStep === 'constraints') {
      if (meeting.durationMinutes == null) {
        return
      }

      if (initializedHostScopeKey !== hostScopeKey) {
        onAvailabilityWindowsChange(
          createDefaultHostAvailabilityWindows({
            meetingId: meeting.id,
            hostId: meeting.hostId,
            startDate: meeting.schedulingWindow.startDate,
            endDate: meeting.schedulingWindow.endDate,
          }),
        )
        setInitializedHostScopeKey(hostScopeKey)
      }

      setTimeStep('candidates')
      return
    }

    if (step === 'times' && timeStep === 'candidates') {
      if (!isResponseDeadlineValid) {
        const suggestedDeadline = suggestResponseDeadline(hostAvailabilityWindows)

        if (suggestedDeadline) {
          onResponseDeadlineChange(suggestedDeadline)
        }
      }

      setTimeStep('deadline')
      return
    }

    goToNextStep()
  }

  function renderSelectedInvitees(compact = false) {
    if (!hasInvitee) {
      return null
    }

    return (
      <section
        className={`selected-invitees${compact ? ' selected-invitees--compact' : ''}`}
        aria-labelledby={compact ? 'mobile-selected-invitees-title' : 'selected-invitees-title'}
      >
        <div className="selected-invitees-head">
          <strong id={compact ? 'mobile-selected-invitees-title' : 'selected-invitees-title'}>
            선택한 사람
          </strong>
          <span>{invitedParticipants.length}명</span>
        </div>
        <div className="selected-invitee-list">
          {invitedParticipants.map((participant) => (
            <div className="selected-invitee-row" key={participant.id}>
              <span className="avatar avatar--small">{participant.name.slice(0, 1)}</span>
              <strong>{participant.name}</strong>
              <small>선택됨</small>
              <button
                type="button"
                aria-label={`${participant.name} 삭제`}
                onClick={() => removeAttendee(participant)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          ))}
        </div>
      </section>
    )
  }

  function renderPeopleOptions(listId: string) {
    if (visiblePeople.length === 0) {
      return normalizedAttendeeQuery ? (
        <p className="people-options-empty">
          찾는 사람이 없어요. 이메일 주소를 입력했다면 바로 추가할 수 있어요.
        </p>
      ) : null
    }

    return (
      <div className="people-options">
        <strong>{normalizedAttendeeQuery ? '검색 결과' : '최근 함께한 사람'}</strong>
        <div
          id={listId}
          className="people-options-list"
          role="listbox"
          aria-label={normalizedAttendeeQuery ? '검색 결과' : '최근 함께한 사람'}
          aria-multiselectable="true"
        >
          {visiblePeople.map((name) => {
            const isSelected = selectedNames.has(name.toLocaleLowerCase())

            return (
              <button
                key={name}
                className={isSelected ? 'is-selected' : ''}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => toggleAttendee(name)}
              >
                <span className="avatar avatar--small">{name.slice(0, 1)}</span>
                <span>{name}</span>
                <small>{isSelected ? '✓ 선택됨' : '선택'}</small>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderCreateStepBody() {
    if (step === 'meeting') {
      return (
        <div className="create-step-body">
          <div className="meeting-brief-fields">
            <label className="field create-title-field">
              <span>
                <strong className="create-field-label">회의 이름</strong>{' '}
                <strong className="required-chip">필수</strong>
              </span>
              <input
                value={meeting.title}
                placeholder="예: 다음 주 제품 리뷰 회의"
                onChange={(event) => onTitleChange(event.target.value)}
                autoFocus
              />
              <em>무슨 일과 관련된 회의인지 이름 안에 드러나게 적어주세요.</em>
            </label>

            <label className="field create-purpose-field">
              <span>
                <strong className="create-field-label">이 회의에서 정할 일</strong>{' '}
                <strong className="required-chip">필수</strong>
              </span>
              <textarea
                value={meeting.purpose}
                rows={3}
                maxLength={120}
                placeholder="예: 출시 전 리뷰 안건을 확인하고 최종 수정 범위를 정합니다."
                onChange={(event) => onPurposeChange(event.target.value)}
              />
              <em>참석자가 어떤 회의인지 이해할 수 있을 만큼만 짧게 적어주세요.</em>
            </label>

            <section className="reference-source-panel" aria-label="관련 자료">
              {referenceItems.length > 0 && !isReferenceOpen ? (
                <div className="reference-source-preview">
                  <div className="reference-chip-list">
                    {referenceItems.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setIsReferenceOpen(true)}
                  >
                    수정
                  </button>
                </div>
              ) : null}
              {isReferenceOpen ? (
                <label className="create-reference-field">
                  <span className="sr-only">자료 이름 또는 링크</span>
                  <span className="create-reference-control">
                    <Paperclip aria-hidden="true" size={18} />
                    <input
                      value={meeting.referenceMaterial ?? ''}
                      maxLength={100}
                      placeholder="자료 이름 또는 링크"
                      onChange={(event) => onReferenceMaterialChange(event.target.value)}
                    />
                  </span>
                </label>
              ) : null}
              {referenceItems.length === 0 && !isReferenceOpen ? (
                <button
                  className="add-reference-button"
                  type="button"
                  onClick={() => setIsReferenceOpen(true)}
                >
                  <Paperclip aria-hidden="true" size={17} />
                  자료 첨부
                  <small>선택</small>
                </button>
              ) : null}
            </section>
          </div>
        </div>
      )
    }

    if (step === 'attendees') {
      return (
        <div className="create-step-body create-step-body--attendees">
          <div className="attendee-disclosure">
            <section
              ref={peopleStepRef}
              className={`attendee-substep${areAttendeesFinalized ? ' is-summary' : ' is-open'}`}
              aria-labelledby="attendee-people-title"
            >
              <div className="attendee-substep-heading-row">
                <div className="attendee-section-head">
                  <h3 id="attendee-people-title" tabIndex={-1} data-attendee-step-heading>
                    {areAttendeesFinalized ? '시간을 물어볼 사람' : '누구에게 시간을 물어볼까요?'}
                  </h3>
                </div>
                {areAttendeesFinalized ? (
                  <button
                    className="text-button attendee-edit-button"
                    type="button"
                    onClick={editAttendees}
                  >
                    수정
                  </button>
                ) : null}
              </div>

              {areAttendeesFinalized ? (
                <div className="attendee-compact-summary" aria-live="polite">
                  <strong>{invitedParticipants.length}명</strong>
                  <span>{inviteeNames.join(', ')}</span>
                </div>
              ) : (
                <div className="attendee-substep-content">
                  <button
                    className="mobile-people-picker-trigger"
                    type="button"
                    onClick={() => setIsPeoplePickerOpen(true)}
                  >
                    <span>
                      {hasInvitee
                        ? `${inviteeNames.join(', ')}${inviteeNames.length > 2 ? ` 외 ${inviteeNames.length - 2}명` : ''}`
                        : '이름 또는 이메일 검색'}
                    </span>
                    <strong>찾기</strong>
                  </button>

                  <div className="people-search people-search--desktop" role="search">
                    <input
                      value={attendeeQuery}
                      placeholder="이름 또는 이메일 검색"
                      aria-label="참석자 이름 또는 이메일"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={visiblePeople.length > 0}
                      aria-controls="desktop-attendee-options"
                      onChange={(event) => setAttendeeQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addAttendee(attendeeQuery)
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => addAttendee(attendeeQuery)}
                      disabled={
                        attendeeQuery.trim() === '' ||
                        selectedNames.has(attendeeQuery.trim().toLocaleLowerCase())
                      }
                    >
                      추가
                    </button>
                  </div>

                  {renderSelectedInvitees()}

                  <div className="people-options--desktop">
                    {renderPeopleOptions('desktop-attendee-options')}
                  </div>

                  <p className="sr-only" aria-live="polite">
                    {attendeeAnnouncement}
                  </p>

                  {isPeoplePickerOpen ? (
                    <div
                      className="people-picker-overlay"
                      role="presentation"
                      onClick={() => setIsPeoplePickerOpen(false)}
                    >
                      <section
                        className="people-picker-sheet"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="people-picker-title"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="people-picker-head">
                          <h3 id="people-picker-title">사람 찾기</h3>
                          <button type="button" onClick={() => setIsPeoplePickerOpen(false)}>
                            닫기
                          </button>
                        </div>
                        {renderSelectedInvitees(true)}
                        <div className="people-search" role="search">
                          <input
                            value={attendeeQuery}
                            placeholder="이름 또는 이메일 검색"
                            aria-label="사람 찾기"
                            role="combobox"
                            aria-autocomplete="list"
                            aria-expanded={visiblePeople.length > 0}
                            aria-controls="mobile-attendee-options"
                            autoFocus
                            onChange={(event) => setAttendeeQuery(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                addAttendee(attendeeQuery)
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => addAttendee(attendeeQuery)}
                            disabled={
                              attendeeQuery.trim() === '' ||
                              selectedNames.has(attendeeQuery.trim().toLocaleLowerCase())
                            }
                          >
                            추가
                          </button>
                        </div>
                        {renderPeopleOptions('mobile-attendee-options')}
                        <button
                          className="people-picker-done"
                          type="button"
                          disabled={!hasInvitee}
                          onClick={finalizeAttendees}
                        >
                          {hasInvitee
                            ? `${invitedParticipants.length}명 선택 완료`
                            : '사람을 선택해 주세요'}
                        </button>
                      </section>
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            {areAttendeesFinalized ? (
              <section
                ref={decisionStepRef}
                className="attendee-substep attendee-substep--decision is-open"
                aria-labelledby="attendee-decision-title"
              >
                <div className="attendee-section-head">
                  <h3 id="attendee-decision-title" tabIndex={-1} data-attendee-step-heading>
                    이 회의는 모두 참석해야 하나요?
                  </h3>
                </div>

                <div className="attendee-substep-content">
                  <fieldset
                    className="attendee-decision-options"
                    aria-labelledby="attendee-decision-title"
                  >
                    <legend className="sr-only">회의 참석 방식</legend>
                    {attendeeDecisionOptions.map((option) => (
                      <button
                        key={option.id}
                        className={`attendee-decision-option${
                          attendeeDecisionMode === option.id ? ' is-selected' : ''
                        }`}
                        type="button"
                        role="radio"
                        aria-checked={attendeeDecisionMode === option.id}
                        onClick={() => selectAttendanceMode(option.id)}
                      >
                        <span className="decision-radio" aria-hidden="true" />
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </button>
                    ))}
                  </fieldset>

                  {attendeeDecisionMode === 'required' ? (
                    <div className="attendance-criteria">
                      <fieldset className="required-response-section">
                        <legend>꼭 참석해야 하는 사람</legend>
                        <div className="required-person-list" aria-label="꼭 참석해야 하는 사람">
                          {invitedParticipants.map((participant) => (
                            <button
                              key={participant.id}
                              className={`required-person-card${
                                participant.role === 'required' ? ' is-selected' : ''
                              }`}
                              type="button"
                              aria-pressed={participant.role === 'required'}
                              onClick={() =>
                                onParticipantRoleChange(
                                  participant.id,
                                  participant.role === 'required' ? 'optional' : 'required',
                                )
                              }
                            >
                              <span className="avatar avatar--small">
                                {participant.name.slice(0, 1)}
                              </span>
                              <strong>{participant.name}</strong>
                              <small>{participant.role === 'required' ? '선택됨' : '선택'}</small>
                            </button>
                          ))}
                        </div>
                      </fieldset>

                      <fieldset className="attendance-threshold-options">
                        <legend>필수 참석자만 오면 진행할 수 있나요?</legend>
                        <button
                          className={
                            attendanceThresholdMode === 'required_only' ? 'is-selected' : ''
                          }
                          type="button"
                          aria-pressed={attendanceThresholdMode === 'required_only'}
                          onClick={() => onAttendanceThresholdModeChange('required_only')}
                        >
                          네, 필수 참석자만 오면 돼요
                        </button>
                        <button
                          className={
                            attendanceThresholdMode === 'minimum_count' ? 'is-selected' : ''
                          }
                          type="button"
                          aria-pressed={attendanceThresholdMode === 'minimum_count'}
                          onClick={() => onAttendanceThresholdModeChange('minimum_count')}
                        >
                          아니요, 전체 참석 인원도 중요해요
                        </button>
                      </fieldset>

                      {attendanceThresholdMode === 'minimum_count' ? (
                        <section
                          className="minimum-attendance"
                          aria-labelledby="minimum-attendance-title"
                        >
                          <div>
                            <strong id="minimum-attendance-title">
                              몇 명이 모이면 진행할까요?
                            </strong>
                            <span>주최자와 꼭 필요한 사람을 포함해요.</span>
                          </div>
                          <div className="minimum-attendance__stepper">
                            <button
                              type="button"
                              aria-label="최소 참석 인원 줄이기"
                              disabled={meeting.minAttendeeCount <= minimumAllowedAttendees}
                              onClick={() => onMinAttendeeCountChange(meeting.minAttendeeCount - 1)}
                            >
                              <Minus size={18} />
                            </button>
                            <output aria-live="polite">
                              <strong>{meeting.minAttendeeCount}명</strong>
                              <span>총 {maximumAttendees}명</span>
                            </output>
                            <button
                              type="button"
                              aria-label="최소 참석 인원 늘리기"
                              disabled={meeting.minAttendeeCount >= maximumAttendees}
                              onClick={() => onMinAttendeeCountChange(meeting.minAttendeeCount + 1)}
                            >
                              <Plus size={18} />
                            </button>
                          </div>
                        </section>
                      ) : null}
                    </div>
                  ) : null}

                  {attendeeDecisionMode === 'everyone' ? (
                    <p className="all-attendance-summary">
                      주최자를 포함한 {maximumAttendees}명이 모두 가능한 시간만 남겨요.
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      )
    }

    if (step === 'times') {
      if (timeStep === 'constraints') {
        return (
          <section
            ref={timeStepRef}
            className="time-create-stage"
            aria-labelledby="time-window-title"
          >
            <header className="time-create-stage__header">
              <h2 id="time-window-title" tabIndex={-1}>
                회의를 언제 열면 될까요?
              </h2>
              <p>참석자에게 물어볼 날짜의 범위를 먼저 정해요.</p>
            </header>

            <div className="time-window-fields">
              <label className="field time-window-field">
                <span>시작일</span>
                <input
                  type="date"
                  value={meeting.schedulingWindow.startDate}
                  min={todayInput}
                  max={meeting.schedulingWindow.endDate || undefined}
                  onChange={(event) =>
                    onSchedulingWindowChange({
                      ...meeting.schedulingWindow,
                      startDate: event.target.value,
                    })
                  }
                />
              </label>
              <span className="time-window-fields__separator" aria-hidden="true">
                -
              </span>
              <label className="field time-window-field">
                <span>마지막 날</span>
                <input
                  type="date"
                  value={meeting.schedulingWindow.endDate}
                  min={meeting.schedulingWindow.startDate || todayInput}
                  onChange={(event) =>
                    onSchedulingWindowChange({
                      ...meeting.schedulingWindow,
                      endDate: event.target.value,
                    })
                  }
                />
              </label>
            </div>

            {SHOW_DURATION_CONTROLS ? (
              <fieldset className="meeting-duration-fieldset">
                <legend>참석자들이 얼마 동안 시간을 비워두면 될까요?</legend>
                {!isCustomDurationOpen ? (
                  <div className="meeting-duration-options" role="radiogroup">
                    {meetingDurationOptions.map((duration) => (
                      <button
                        key={duration}
                        className={meeting.durationMinutes === duration ? 'is-selected' : ''}
                        type="button"
                        role="radio"
                        aria-checked={meeting.durationMinutes === duration}
                        onClick={() => selectPresetDuration(duration)}
                      >
                        {formatMeetingDuration(duration)}
                      </button>
                    ))}
                    <button
                      ref={customDurationTriggerRef}
                      className="meeting-duration-custom-trigger"
                      type="button"
                      role="radio"
                      aria-checked="false"
                      onClick={openCustomDuration}
                    >
                      직접 입력
                    </button>
                  </div>
                ) : (
                  <div
                    className="meeting-duration-custom-wrap"
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        closeCustomDuration()
                      }
                    }}
                  >
                    <div className="meeting-duration-custom-head">
                      <strong>직접 입력</strong>
                      <button
                        type="button"
                        aria-label="직접 입력 닫기"
                        title="직접 입력 닫기"
                        onClick={closeCustomDuration}
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="meeting-duration-custom">
                      <button
                        type="button"
                        aria-label="확보 시간 30분 줄이기"
                        title="30분 줄이기"
                        disabled={
                          !isCustomDurationInputValid || parsedCustomDuration <= MIN_CUSTOM_DURATION
                        }
                        onClick={() => stepCustomDuration(-1)}
                      >
                        <Minus size={18} />
                      </button>
                      <label>
                        <span className="sr-only">회의 시간 직접 입력</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={MIN_CUSTOM_DURATION}
                          max={MAX_CUSTOM_DURATION}
                          step={CUSTOM_DURATION_STEP}
                          value={customDurationInput}
                          aria-describedby="custom-duration-help"
                          autoFocus
                          onChange={(event) => updateCustomDurationInput(event.target.value)}
                        />
                        <strong>분</strong>
                      </label>
                      <button
                        type="button"
                        aria-label="확보 시간 30분 늘리기"
                        title="30분 늘리기"
                        disabled={
                          isCustomDurationInputValid && parsedCustomDuration >= MAX_CUSTOM_DURATION
                        }
                        onClick={() => stepCustomDuration(1)}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    <p
                      id="custom-duration-help"
                      className={
                        customDurationInput !== '' && !isCustomDurationInputValid ? 'is-error' : ''
                      }
                    >
                      30~240분 사이에서 30분 단위로 입력해 주세요.
                    </p>
                  </div>
                )}
              </fieldset>
            ) : (
              <div className="meeting-duration-fixed" aria-label="확보 시간">
                <span>참석자가 비워둘 시간</span>
                <strong>1시간</strong>
              </div>
            )}

            {!isSchedulingWindowValid ? (
              <p className="time-create-stage__error" role="alert">
                오늘 이후의 시작일과 마지막 날을 순서대로 정해주세요.
              </p>
            ) : null}
          </section>
        )
      }

      if (timeStep === 'candidates') {
        return (
          <section
            ref={timeStepRef}
            className="time-create-stage time-create-stage--candidates"
            aria-labelledby="time-candidates-title"
          >
            <div className="time-step-summary">
              <div>
                <span>회의 조건</span>
                <strong>
                  {formatSchedulingWindow(meeting.schedulingWindow)} ·{' '}
                  {formatMeetingDuration(meeting.durationMinutes)}
                </strong>
              </div>
              <button type="button" onClick={() => setTimeStep('constraints')}>
                수정
              </button>
            </div>
            <header className="time-create-stage__header">
              <h2 id="time-candidates-title" tabIndex={-1}>
                이 시간 안에서 찾아볼게요
              </h2>
              <p>평일 오전 9시부터 오후 6시까지예요. 안 되는 시간만 빼주세요.</p>
            </header>
            {meetingWithDuration != null ? (
              <AvailabilityWindowPicker
                meeting={{
                  ...meetingWithDuration,
                  availabilityWindows: hostAvailabilityWindows,
                }}
                onAvailabilityWindowsChange={onAvailabilityWindowsChange}
              />
            ) : null}
          </section>
        )
      }

      return (
        <section
          ref={timeStepRef}
          className="time-create-stage time-create-stage--deadline"
          aria-labelledby="response-deadline-title"
        >
          <div className="time-step-summary">
            <div>
              <span>조율할 시간대</span>
              <strong>
                {hostAvailabilityWindows.length}개 ·{' '}
                {formatMeetingDuration(meeting.durationMinutes)} 확보
              </strong>
            </div>
            <button type="button" onClick={() => setTimeStep('candidates')}>
              수정
            </button>
          </div>
          <header className="time-create-stage__header">
            <h2 id="response-deadline-title" tabIndex={-1}>
              응답을 언제까지 받을까요?
            </h2>
            <p>선택한 시간대가 시작되기 전에 참석자 응답을 모아요.</p>
          </header>
          <label className="field response-deadline-field">
            <span>응답 마감</span>
            <input
              type="datetime-local"
              value={formatDateTimeLocalInput(meeting.responseDeadline)}
              min={formatDateTimeLocalInput(createNow)}
              max={
                earliestAvailabilityStart == null
                  ? undefined
                  : formatDateTimeLocalInput(earliestAvailabilityStart)
              }
              onChange={(event) =>
                onResponseDeadlineChange(parseDateTimeLocalInput(event.target.value))
              }
            />
            {earliestAvailabilityStart != null ? (
              <em>첫 조율 시간대: {formatAvailabilityStart(earliestAvailabilityStart)}</em>
            ) : null}
          </label>
          {!isResponseDeadlineValid ? (
            <p className="time-create-stage__error" role="alert">
              지금 이후이면서 첫 조율 시간대보다 앞선 시각을 선택해 주세요.
            </p>
          ) : null}
        </section>
      )
    }

    return (
      <div className="create-step-body create-review">
        <section className="create-review-section" aria-labelledby="review-meeting-title">
          <h2 id="review-meeting-title">회의 안내</h2>
          <div className="create-review-facts">
            <ReviewFactRow label="회의" value={meeting.title} />
            <ReviewFactRow label="요청자" value={meeting.hostLabel} />
            <ReviewFactRow label="정할 내용" value={meetingPurpose} />
            {referenceMaterial ? (
              <ReviewFactRow label="참고 출처" value={referenceMaterial} />
            ) : null}
          </div>
        </section>

        <section className="create-review-section" aria-labelledby="review-people-title">
          <h2 id="review-people-title">참석자와 참석 기준</h2>
          <div className="create-review-facts">
            <ReviewFactRow
              label="참석자"
              value={inviteeNames.join(', ')}
              detail={`주최자 포함 ${maximumAttendees}명`}
            />
            <ReviewFactRow
              label="참석 기준"
              value={
                attendeeDecisionMode === 'everyone'
                  ? '모두 참석할 수 있을 때 진행'
                  : `주최자 포함 최소 ${meeting.minAttendeeCount}명이 가능할 때 진행`
              }
            />
            {attendeeDecisionMode === 'required' && requiredParticipants.length > 0 ? (
              <ReviewFactRow
                label="꼭 필요한 사람"
                value={requiredParticipants.map((participant) => participant.name).join(', ')}
              />
            ) : null}
          </div>
        </section>

        <section className="create-review-section" aria-labelledby="review-time-title">
          <h2 id="review-time-title">시간</h2>
          <ReviewAvailabilityScope meeting={meeting} windows={hostAvailabilityWindows} />
          <div className="create-review-facts">
            <ReviewFactRow label="응답 마감" value={formatDeadline(meeting.responseDeadline)} />
          </div>
        </section>
      </div>
    )
  }

  const activeCreateStep = createSteps[currentStepIndex]

  return (
    <div className="create-flow">
      <section
        ref={workflowRef}
        className={`create-workflow create-workflow--${step}${
          step === 'times' ? ` create-workflow--time-${timeStep}` : ''
        }`}
        aria-label="회의 요청 만들기"
      >
        <div className="create-progress" aria-label="회의 만들기 진행 상황">
          <div className="create-progress__meta">
            {currentStepIndex > 0 ? (
              <button
                className="create-back-button"
                type="button"
                aria-label="이전 단계"
                onClick={goToPreviousStep}
              >
                <ChevronLeft aria-hidden="true" size={20} strokeWidth={2.2} />
                <span>이전</span>
              </button>
            ) : null}
            <div className="create-progress__status">
              <strong>
                {currentStepIndex + 1} / {createSteps.length}
              </strong>
              <span>{activeCreateStep.label}</span>
            </div>
          </div>
          <progress value={currentStepIndex + 1} max={createSteps.length}>
            {currentStepIndex + 1} / {createSteps.length}
          </progress>
        </div>

        <section
          className="create-task"
          aria-current="step"
          aria-labelledby={`create-task-${activeCreateStep.id}`}
        >
          <div className="create-task__surface">
            <div className="create-task__layout">
              <section
                className={`create-main-panel${step === 'meeting' ? ' create-main-panel--meeting' : ''}`}
              >
                <header className="create-task__header">
                  <span>
                    {activeCreateStep.eyebrow} · {activeCreateStep.label}
                  </span>
                  <h1 id={`create-task-${activeCreateStep.id}`} tabIndex={-1}>
                    {activeCreateStep.title}
                  </h1>
                  <p>{activeCreateStep.description}</p>
                </header>
                <div className="create-phase-body">{renderCreateStepBody()}</div>
              </section>
            </div>
            <div className="create-actions">
              <button
                className="primary-button create-primary-action--desktop"
                type="button"
                onClick={handlePrimaryAction}
                disabled={!currentCanContinue}
              >
                {desktopPrimaryActionLabel}
              </button>
              <button
                className="primary-button create-primary-action--mobile"
                type="button"
                onClick={handlePrimaryAction}
                disabled={!currentCanContinue}
              >
                {mobilePrimaryActionLabel}
              </button>
            </div>
          </div>
        </section>
      </section>
    </div>
  )
}

function InvalidParticipantInviteScreen({
  meeting,
  onExit,
}: {
  meeting: Meeting
  onExit: () => void
}) {
  return (
    <div className="respond-app">
      <header className="respond-header">
        <div className="respond-brand">
          <img className="brand-dot" src={meetCueEmblemUrl} alt="" />
          <strong className="brand-wordmark">MeetCue</strong>
        </div>
        <button className="respond-host-link" type="button" onClick={onExit}>
          회의 만들기
        </button>
      </header>
      <main className="respond-main respond-main--identity">
        <section className="soft-panel invalid-invite" aria-labelledby="invalid-invite-title">
          <span className="respond-eyebrow">{meeting.title}</span>
          <h1 id="invalid-invite-title">회의 요청을 열 수 없어요</h1>
          <p>내 계정에 도착한 회의 요청 알림에서 다시 열어주세요.</p>
        </section>
      </main>
    </div>
  )
}

function ParticipantShell({
  meeting,
  participant,
  state,
  now,
  onSubmit,
  onEdit,
  onExit,
  showPrototypeReturn,
}: {
  meeting: Meeting
  participant: Participant
  state: ParticipantCoordinationState
  now: Date
  onSubmit: (participantDraftWindows: AvailabilityWindow[]) => void
  onEdit: () => void
  onExit: () => void
  showPrototypeReturn: boolean
}) {
  const [isSaveConfirmationOpen, setIsSaveConfirmationOpen] = useState(false)
  const [editorStatus, setEditorStatus] = useState<Participant['responseStatus']>(
    participant.responseStatus,
  )
  const [draftWindows, setDraftWindows] = useState<AvailabilityWindow[]>(() =>
    meeting.availabilityWindows
      .filter((window) => window.ownerId === participant.id)
      .map((window) => ({ ...window })),
  )
  const [hasChosenResponseBaseline, setHasChosenResponseBaseline] = useState(
    () => participant.responseStatus !== 'not_started' || draftWindows.length > 0,
  )
  const [participantInputSource, setParticipantInputSource] =
    useState<ParticipantInputSource | null>(() =>
      participant.responseStatus !== 'not_started' || draftWindows.length > 0 ? 'existing' : null,
    )
  const [manuallyEditedSlotStarts, setManuallyEditedSlotStarts] = useState<Set<string>>(
    () => new Set(),
  )

  if (state === 'PARTICIPANT_DONE') {
    return (
      <ParticipantDoneScreen
        meeting={meeting}
        participant={participant}
        onEdit={onEdit}
        onExit={onExit}
        showPrototypeReturn={showPrototypeReturn}
      />
    )
  }

  if (state === 'PARTICIPANT_CONFIRMED') {
    return (
      <ParticipantConfirmedScreen meeting={meeting} participant={participant} onExit={onExit} />
    )
  }

  const slots = deriveAvailabilitySlots(meeting.availabilityWindows, meeting.hostId)
  const answeredCount = slots.filter(
    (slot) => getAvailabilityStateForSlot(draftWindows, participant.id, slot) != null,
  ).length
  const remainingCount = slots.length - answeredCount
  const simulatedCalendarEventCount = new Set(
    slots
      .map(getSimulatedCalendarEvent)
      .filter((event) => event != null)
      .map((event) => event.id),
  ).size
  const referenceMaterial = meeting.referenceMaterial?.trim()
  const deadlinePassed = new Date(meeting.responseDeadline).getTime() <= now.getTime()

  function startManualEntry() {
    setDraftWindows([])
    setHasChosenResponseBaseline(true)
    setParticipantInputSource('manual')
    setManuallyEditedSlotStarts(new Set())
    setEditorStatus('draft')
    setIsSaveConfirmationOpen(false)
  }

  function applySimulatedCalendar() {
    setDraftWindows((currentWindows) => {
      let nextWindows = fillAvailabilitySlots(
        currentWindows,
        participant.id,
        slots,
        'available',
        meeting.id,
      )
      slots.filter(isSimulatedCalendarBusy).forEach((slot) => {
        nextWindows = replaceAvailabilitySlot(
          nextWindows,
          participant.id,
          slot,
          'unavailable',
          false,
          meeting.id,
        )
      })
      return nextWindows
    })
    setHasChosenResponseBaseline(true)
    setParticipantInputSource('calendar')
    setManuallyEditedSlotStarts(new Set())
    setEditorStatus('draft')
    setIsSaveConfirmationOpen(false)
  }

  function paintParticipantSlot(slot: AvailabilitySlot, state: ResponseValue) {
    setDraftWindows((currentWindows) =>
      replaceAvailabilitySlot(
        currentWindows,
        participant.id,
        slot,
        state,
        false,
        meeting.id,
      ),
    )
    if (participantInputSource === 'calendar') {
      setManuallyEditedSlotStarts((current) => new Set(current).add(slot.startAt))
    }
    setEditorStatus('draft')
    setIsSaveConfirmationOpen(false)
  }

  return (
    <div className="respond-app">
      <header className="respond-header">
        <div className="respond-brand">
          <img className="brand-dot" src={meetCueEmblemUrl} alt="" />
          <strong className="brand-wordmark">MeetCue</strong>
        </div>
        {import.meta.env.DEV ? (
          <button className="respond-host-link" type="button" onClick={onExit}>
            시연 · 결과 보드
          </button>
        ) : null}
      </header>

      <main
        className={`respond-main${state === 'PARTICIPANT_EDITING' ? ' is-participant-editing' : ''}${
          hasChosenResponseBaseline ? ' is-schedule-entry' : ''
        }`}
      >
        {hasChosenResponseBaseline ? (
          <details className="respond-mobile-context">
            <summary>
              <div>
                <strong>{meeting.title}</strong>
                <span>마감 {formatDeadline(meeting.responseDeadline)}</span>
              </div>
              <span className="respond-mobile-context__toggle">
                회의 정보
                <ChevronDown size={16} aria-hidden="true" />
              </span>
            </summary>
            <div className="respond-mobile-context__detail">
              <p>{meeting.purpose}</p>
              <span>요청자: {meeting.hostLabel}</span>
              <dl>
                <div>
                  <dt>조율 기간</dt>
                  <dd>{formatSchedulingWindow(meeting.schedulingWindow)}</dd>
                </div>
                <div>
                  <dt>비워둘 시간</dt>
                  <dd>{formatMeetingDuration(meeting.durationMinutes)}</dd>
                </div>
                <div>
                  <dt>최종 결정</dt>
                  <dd>주최자가 확정</dd>
                </div>
              </dl>
            </div>
          </details>
        ) : null}
        <section className="respond-hero" aria-label="응답 안내">
          <div>
            <span className="respond-eyebrow">회의 요청</span>
            <h1>{meeting.title}</h1>
            <div className="respond-meeting-overview">
              <strong>{meeting.purpose}</strong>
              <span>요청자: {meeting.hostLabel}</span>
              {referenceMaterial ? <small>참고 출처: {referenceMaterial}</small> : null}
            </div>
          </div>
          <div className="respond-status-card">
            <span>{deadlinePassed ? '응답 마감 지남' : '응답 마감'}</span>
            <strong>{formatDeadline(meeting.responseDeadline)}</strong>
            <small>
              {deadlinePassed
                ? '마감이 지났지만 지금 제출하면 결과에 바로 반영돼요.'
                : remainingCount === 0
                  ? '응답을 저장할 수 있어요'
                  : `${remainingCount}개 시간의 응답이 남았어요.`}
            </small>
          </div>
        </section>

        {state === 'PARTICIPANT_EDITING' ? (
          <section className="participant-notice">
            <strong>이전에 고른 응답이에요.</strong>
            <span>확정 전까지 받은 요청에서 응답을 다시 수정할 수 있어요.</span>
          </section>
        ) : null}

        <section className="respond-progress" aria-label="응답 진행 상황">
          <div>
            <span>조율 기간</span>
            <strong>{formatSchedulingWindow(meeting.schedulingWindow)}</strong>
          </div>
          <div>
            <span>비워둘 시간</span>
            <strong>{formatMeetingDuration(meeting.durationMinutes)}</strong>
          </div>
          <div>
            <span>최종 결정</span>
            <strong>주최자가 확정</strong>
          </div>
        </section>

        <section
          className="response-panel response-panel--participant"
          aria-label="가능한 시간대 응답"
          data-submission-status={editorStatus}
        >
          <header className="response-guide">
            <strong>{getParticipantTitle(state, participant)}</strong>
            {hasChosenResponseBaseline && participant.responseStatus === 'not_started' ? (
              <button
                className="response-baseline-reset"
                type="button"
                onClick={() => {
                  setDraftWindows([])
                  setHasChosenResponseBaseline(false)
                  setParticipantInputSource(null)
                  setManuallyEditedSlotStarts(new Set())
                  setEditorStatus('not_started')
                  setIsSaveConfirmationOpen(false)
                }}
              >
                선택 초기화하기
              </button>
            ) : null}
          </header>
          {!hasChosenResponseBaseline ? (
            <div className="calendar-import-card" aria-labelledby="calendar-import-title">
                <div className="calendar-import-card__icon" aria-hidden="true">
                  <CalendarDays size={24} strokeWidth={2.3} />
                </div>
                <div className="calendar-import-card__copy">
                  <span>연결된 Google Calendar</span>
                  <strong id="calendar-import-title">일정을 다시 입력하지 않아도 돼요</strong>
                  <p>비어 있는 시간과 일정이 있는 시간을 먼저 채워드릴게요.</p>
                  <small>일정 제목은 공유하지 않고 비어 있음 여부만 사용해요.</small>
                </div>
                <div className="calendar-import-card__actions">
                  <button className="primary-button" type="button" onClick={applySimulatedCalendar}>
                    캘린더 일정 불러오기
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    onClick={startManualEntry}
                  >
                    직접 입력하기
                  </button>
                </div>
              </div>
          ) : (
            <>
              {participantInputSource === 'calendar' ? (
                <div className="calendar-import-summary" role="status">
                  <CalendarDays size={20} aria-hidden="true" />
                  <div>
                    <strong>
                      Google Calendar 일정 {simulatedCalendarEventCount}개를 불러왔어요
                    </strong>
                    <span>
                      비어 있는 {slots.filter((slot) => !isSimulatedCalendarBusy(slot)).length}개
                      시간을 ‘가능해요’로 자동 입력했어요
                    </span>
                  </div>
                  <button
                    className="calendar-import-reset"
                    type="button"
                    onClick={() => {
                      applySimulatedCalendar()
                      toast.success('캘린더를 처음 불러온 상태로 되돌렸어요.')
                    }}
                  >
                    불러온 상태로 되돌리기
                  </button>
                </div>
              ) : null}
            </>
          )}
          {hasChosenResponseBaseline ? (
            <ParticipantTimeGrid
              slots={slots}
              stateLabels={participantResponseLabels}
              getState={(slot) =>
                getAvailabilityStateForSlot(draftWindows, participant.id, slot) ?? null
              }
              getCalendarEvent={
                participantInputSource === 'calendar' ? getSimulatedCalendarEvent : undefined
              }
              getIsManuallyEdited={(slot) => manuallyEditedSlotStarts.has(slot.startAt)}
              onPaintSlot={paintParticipantSlot}
            />
          ) : null}
          {hasChosenResponseBaseline && isSaveConfirmationOpen && remainingCount > 0 ? (
            <div className="response-save-confirmation" role="alert">
              <div>
                <strong>
                  선택하지 않은 {remainingCount}칸을 ‘참석하기 어려워요’로 저장할까요?
                </strong>
                <span>저장한 뒤에도 받은 요청에서 응답을 다시 수정할 수 있어요.</span>
              </div>
              <div className="button-row">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setIsSaveConfirmationOpen(false)}
                >
                  시간 더 선택하기
                </button>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => onSubmit(draftWindows)}
                >
                  이대로 응답 저장하기
                </button>
              </div>
            </div>
          ) : hasChosenResponseBaseline ? (
            <>
              <button
                className="primary-button response-submit response-submit--desktop"
                type="button"
                onClick={() => {
                  if (remainingCount > 0) {
                    setIsSaveConfirmationOpen(true)
                    return
                  }
                  onSubmit(draftWindows)
                }}
              >
                {state === 'PARTICIPANT_EDITING' ? '수정 내용 저장하기' : '응답 저장하기'}
              </button>
              {createPortal(
                <div className="response-submit-bar">
                  <button
                    className="primary-button response-submit"
                    type="button"
                    onClick={() => {
                      if (remainingCount > 0) {
                        setIsSaveConfirmationOpen(true)
                        return
                      }
                      onSubmit(draftWindows)
                    }}
                  >
                    {state === 'PARTICIPANT_EDITING' ? '수정 내용 저장하기' : '응답 저장하기'}
                  </button>
                </div>,
                document.body,
              )}
            </>
          ) : null}
        </section>
      </main>
    </div>
  )
}

function ParticipantDoneScreen({
  meeting,
  participant,
  onEdit,
  onExit,
  showPrototypeReturn,
}: {
  meeting: Meeting
  participant: Participant
  onEdit: () => void
  onExit: () => void
  showPrototypeReturn: boolean
}) {
  const participantResponses = meeting.responses.filter(
    (response) => response.participantId === participant.id,
  )
  const hasAttendableCandidate = participantResponses.some(
    (response) => response.value === 'available' || response.value === 'adjustable',
  )

  return (
    <div className="respond-app">
      <header className="respond-header">
        <div className="respond-brand">
          <img className="brand-dot" src={meetCueEmblemUrl} alt="" />
          <strong className="brand-wordmark">MeetCue</strong>
        </div>
        {import.meta.env.DEV ? (
          <button className="respond-host-link" type="button" onClick={onExit}>
            시연 · 결과 보드
          </button>
        ) : null}
      </header>
      <main className="respond-main">
        <section className="soft-panel participant-done">
          <span className="status-label status-label--success">응답을 저장했어요</span>
          <h1>
            {hasAttendableCandidate ? '응답을 저장했어요' : '참석 가능한 시간이 없다고 응답했어요'}
          </h1>
          <p>
            {hasAttendableCandidate
              ? `${meeting.title}의 회의 시간은 주최자가 응답을 확인한 뒤 정해요. 확정 전까지 받은 요청에서 응답을 다시 수정할 수 있어요.`
              : '현재 참석 가능한 시간이 없다고 응답했어요. 확정 전까지 받은 요청에서 응답을 다시 수정할 수 있어요.'}
          </p>
          <div className="button-row">
            {showPrototypeReturn ? (
              <button className="primary-button" type="button" onClick={onExit}>
                달라진 결과 확인하기
              </button>
            ) : null}
            <button className="secondary-button" type="button" onClick={onEdit}>
              응답 수정하기
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

function ParticipantConfirmedScreen({
  meeting,
  participant,
  onExit,
}: {
  meeting: Meeting
  participant: Participant
  onExit: () => void
}) {
  const confirmedCandidate = meeting.candidates.find(
    (candidate) => candidate.id === meeting.confirmedCandidateId,
  )
  const response = meeting.responses.find(
    (item) =>
      item.participantId === participant.id && item.candidateId === meeting.confirmedCandidateId,
  )

  return (
    <div className="respond-app">
      <header className="respond-header">
        <div className="respond-brand">
          <img className="brand-dot" src={meetCueEmblemUrl} alt="" />
          <strong className="brand-wordmark">MeetCue</strong>
        </div>
        {import.meta.env.DEV ? (
          <button className="respond-host-link" type="button" onClick={onExit}>
            시연 · 결과 보드
          </button>
        ) : null}
      </header>
      <main className="respond-main">
        <section className="soft-panel participant-done">
          <span className="status-label status-label--success">회의 시간이 정해졌어요</span>
          <h1>{meeting.title}</h1>
          <p>
            {confirmedCandidate == null
              ? '주최자가 회의 시간을 확정했어요.'
              : `${formatCandidateTime(confirmedCandidate)}에 진행해요.`}
          </p>
          {response?.value === 'adjustable' ? (
            <div className="participant-confirmed-notice">
              조정하면 참석할 수 있다고 답한 시간으로 정해졌어요. 필요하다면 기존 일정을 조정해
              주세요.
            </div>
          ) : null}
        </section>
      </main>
    </div>
  )
}

function MessageScreen({
  meeting,
  evaluation,
  onBack,
  onNotify,
}: {
  meeting: Meeting
  evaluation: CandidateEvaluation
  onBack?: () => void
  onNotify: () => void
}) {
  const message = generateConfirmationMessage(meeting, evaluation)
  const recipientCount = meeting.participants.filter(
    (participant) => participant.id !== meeting.hostId,
  ).length

  return (
    <div className="message-workspace">
      <section className="message-panel">
        <header className="message-panel__header">
          <span className="message-panel__icon" aria-hidden="true">
            <CalendarCheck2 size={22} />
          </span>
          <div>
            <span>회의 시간 확정</span>
            <h1>회의 시간을 확정했어요</h1>
            <p>{meeting.title}</p>
          </div>
        </header>
        <div className="message-panel__time">
          <span>확정 시간</span>
          <strong>{formatCandidateTime(evaluation.candidate)}</strong>
        </div>
        <section className="message-panel__preview" aria-labelledby="confirmation-preview-title">
          <div>
            <span id="confirmation-preview-title">참석자에게 보낼 내용</span>
            <small>{recipientCount}명에게 전송</small>
          </div>
          <p>{message}</p>
        </section>
        <footer className="message-panel__actions">
          <p>확정 알림을 보내면 참석자에게 최종 시간이 안내돼요.</p>
          <div className="button-row">
            <button className="primary-button" type="button" onClick={onNotify}>
              확정 알림 보내기
            </button>
            {onBack ? (
              <button className="secondary-button" type="button" onClick={onBack}>
                회의 결과로 돌아가기
              </button>
            ) : null}
          </div>
        </footer>
      </section>
    </div>
  )
}

function ReviewAvailabilityScope({
  meeting,
  windows,
}: {
  meeting: Meeting
  windows: AvailabilityWindow[]
}) {
  const defaultWindows = createDefaultHostAvailabilityWindows({
    meetingId: meeting.id,
    hostId: meeting.hostId,
    startDate: meeting.schedulingWindow.startDate,
    endDate: meeting.schedulingWindow.endDate,
  })
  const defaultSlots = deriveAvailabilitySlots(defaultWindows, meeting.hostId)
  const selectedSlots = deriveAvailabilitySlots(windows, meeting.hostId)
  const defaultSlotStarts = new Set(defaultSlots.map((slot) => slot.startAt))
  const selectedSlotStarts = new Set(selectedSlots.map((slot) => slot.startAt))
  const excludedWindows = mergeReviewSlots(
    defaultSlots.filter((slot) => !selectedSlotStarts.has(slot.startAt)),
    meeting,
    'excluded',
  )
  const addedWindows = mergeReviewSlots(
    selectedSlots.filter((slot) => !defaultSlotStarts.has(slot.startAt)),
    meeting,
    'added',
  )
  const durationLabel = formatMeetingDuration(meeting.durationMinutes)

  return (
    <div className="review-availability-scope">
      <ReviewFactRow label="기간" value={formatSchedulingWindow(meeting.schedulingWindow)} />
      <ReviewFactRow label="회의 길이" value={durationLabel} />
      <ReviewFactRow label="기본 범위" value="평일 09:00–18:00" />
      <ReviewFactRow label="제외한 시간" value={formatReviewExceptionWindows(excludedWindows)} />
      {addedWindows.length > 0 ? (
        <ReviewFactRow label="추가한 시간" value={formatReviewExceptionWindows(addedWindows)} />
      ) : null}
    </div>
  )
}

function mergeReviewSlots(slots: AvailabilitySlot[], meeting: Meeting, kind: 'excluded' | 'added') {
  return mergeAvailabilityWindows(
    slots.map((slot) => ({
      id: `review-${kind}-${slot.startAt}`,
      meetingId: meeting.id,
      ownerId: meeting.hostId,
      startAt: slot.startAt,
      endAt: slot.endAt,
      state: 'available' as const,
    })),
  )
}

function formatReviewExceptionWindows(windows: AvailabilityWindow[]) {
  if (windows.length === 0) return '없음'

  return windows
    .map((window) => {
      const dateKey = getCandidateDateKey(window.startAt)
      return `${formatCandidateFullDate(dateKey)} ${formatCandidateStartTime(window.startAt)}–${formatCandidateStartTime(window.endAt)}`
    })
    .join(', ')
}

function ReviewFactRow({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="review-fact-row">
      <span>{label}</span>
      <div>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
    </div>
  )
}

function getHostCoordinationState(meeting: Meeting, route: AppRoute): HostCoordinationState {
  if (route === 'create') return 'HOST_DRAFT'
  if (route === 'share') return 'HOST_SHARE_READY'
  if (meeting.status === 'confirmed') return 'HOST_CONFIRMED'

  const completedCount = meeting.participants.filter(
    (participant) =>
      participant.id !== meeting.hostId && participant.responseStatus === 'submitted',
  ).length

  if (completedCount === 0) return 'HOST_WAITING_EMPTY'
  return 'HOST_DECISION'
}

function getParticipantState(
  meeting: Meeting,
  route: AppRoute,
  participant: Participant,
): ParticipantCoordinationState {
  if (meeting.status === 'confirmed') return 'PARTICIPANT_CONFIRMED'
  if (route === 'invite-done') return 'PARTICIPANT_DONE'
  if (route === 'invite-edit' || participant.responseStatus === 'submitted') {
    return 'PARTICIPANT_EDITING'
  }
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

function isWaitingState(state: HostCoordinationState) {
  return state === 'HOST_WAITING_EMPTY'
}

function getHostNavigationItems(route: AppRoute) {
  if (route === 'create') {
    return []
  }

  if (route === 'share') {
    return [
      { route: 'criteria' as const, label: '참석 기준 보기' },
      { route: 'host' as const, label: '응답 현황 보기' },
    ]
  }

  if (route === 'criteria') {
    return [
      { route: 'host' as const, label: '결과로 돌아가기' },
      { route: 'share' as const, label: '응답 현황 보기' },
    ]
  }

  if (route === 'message') {
    return [{ route: 'host' as const, label: '회의 결과 보기' }]
  }

  const items: Array<{ route: AppRoute; label: string }> = [
    { route: 'share', label: '응답 현황 보기' },
  ]

  return items
}

function getHostStateLabel(state: HostCoordinationState) {
  if (state === 'HOST_DRAFT') return '요청 작성'
  if (state === 'HOST_SHARE_READY') return '요청 완료'
  if (state === 'HOST_WAITING_EMPTY') return '응답 전'
  if (state === 'HOST_DECISION') return '결과 확인'
  if (state === 'HOST_CONFIRMED') return '회의 시간 확정'
  return '결과 확인'
}

function getHostStateTone(state: HostCoordinationState) {
  if (state === 'HOST_DECISION' || state === 'HOST_CONFIRMED') return 'success'
  return 'info'
}

function getStatusTone(status: CandidateStatus) {
  if (status === 'ready') return 'success'
  if (status === 'pending') return 'info'
  return 'danger'
}

function getCandidateDateKey(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value))
}

function getCandidateMinuteOfDay(value: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Seoul',
  }).formatToParts(new Date(value))
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

function formatCandidateMinutes(minutes: number) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  const period = hour < 12 ? '오전' : '오후'
  const displayHour = hour % 12 || 12
  return `${period} ${displayHour}:${String(minute).padStart(2, '0')}`
}

function hasSameDecisionBand(
  adjacent: CandidateEvaluation | undefined,
  current: CandidateEvaluation,
) {
  return (
    adjacent != null &&
    adjacent.status === current.status &&
    adjacent.reasons[0] === current.reasons[0]
  )
}

function candidateDateFromKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00+09:00`)
}

function formatCandidateWeekday(dateKey: string) {
  return new Intl.DateTimeFormat('ko-KR', { weekday: 'short', timeZone: 'Asia/Seoul' }).format(
    candidateDateFromKey(dateKey),
  )
}

function formatCandidateDay(dateKey: string) {
  return new Intl.DateTimeFormat('ko-KR', { day: 'numeric', timeZone: 'Asia/Seoul' }).format(
    candidateDateFromKey(dateKey),
  )
}

function formatCandidateFullDate(dateKey: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'Asia/Seoul',
  }).format(candidateDateFromKey(dateKey))
}

function formatParticipantSummary(participants: Participant[]) {
  if (participants.length === 1) return `${participants[0].name} 님은`
  return `${participants[0].name} 님 외 ${participants.length - 1}명이`
}

function formatDateStatusSummary(evaluations: CandidateEvaluation[]) {
  const counts = candidateStatusOrder
    .map((status) => ({
      status,
      count: evaluations.filter((evaluation) => evaluation.status === status).length,
    }))
    .filter(({ count }) => count > 0)

  return counts.map(({ status, count }) => `${candidateStatusLabels[status]} ${count}개`).join(', ')
}

function formatCandidateStartTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Seoul',
  }).format(new Date(value))
}

function getParticipantTitle(state: ParticipantCoordinationState, participant: Participant) {
  if (state === 'PARTICIPANT_EDITING') {
    return `${participant.name}님, 이전 응답을 수정할 수 있어요`
  }
  return `${participant.name}님, 참석 가능한 시간을 알려주세요`
}

export default App
