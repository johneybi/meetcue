import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Button as AriaButton,
  Dialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
  Popover,
  type DateValue,
} from 'react-aria-components'
import { CalendarDate, getLocalTimeZone, startOfWeek, today } from '@internationalized/date'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  X,
} from 'lucide-react'
import {
  deriveCandidatesFromAvailabilityWindows,
  mergeAvailabilityWindows,
} from './domain/availability'
import {
  evaluateCandidates,
  generateConfirmationMessage,
  generateRecoveryRequestMessage,
  type CandidateEvaluation,
} from './domain/evaluation'
import { createDraftMeeting, createPrototypeMeeting, prototypeNow } from './domain/mockMeeting'
import {
  candidateStatusLabels,
  formatCandidateTime,
  formatDeadline,
  formatMeetingDuration,
  formatSchedulingWindow,
  participantRoleLabels,
  responsePreferenceTagLabels,
  responseValueDescriptions,
  responseValueLabels,
  type AvailabilityWindow,
  type Candidate,
  type CandidateStatus,
  type ChangeLog,
  type Meeting,
  type MeetingDuration,
  type Participant,
  type ParticipantRole,
  type ResponsePreferenceTag,
  type ResponseValue,
  type SchedulingWindow,
} from './domain/meeting'
import './App.css'

type AppRoute =
  | 'entry'
  | 'create'
  | 'share'
  | 'host'
  | 'recover'
  | 'message'
  | 'invite'
  | 'invite-edit'
  | 'invite-added'
  | 'invite-done'

type Audience = 'entry' | 'host' | 'participant'

type HostCoordinationState =
  | 'HOST_DRAFT'
  | 'HOST_SHARE_READY'
  | 'HOST_WAITING_EMPTY'
  | 'HOST_WAITING_PARTIAL'
  | 'HOST_DECISION_READY'
  | 'HOST_REVIEW_NEEDED'
  | 'HOST_RECOVERY_REQUIRED'
  | 'HOST_CONFIRMED'

type ParticipantCoordinationState =
  'PARTICIPANT_NEW' | 'PARTICIPANT_EDITING' | 'PARTICIPANT_ADDED_ONLY' | 'PARTICIPANT_DONE'

type HostCreateStep = 'meeting' | 'attendees' | 'times' | 'review'
type TimeCreateStep = 'constraints' | 'candidates' | 'deadline'
type AttendeeDecisionMode = 'everyone' | 'required'

const attendeeDecisionOptions: Array<{
  id: AttendeeDecisionMode
  label: string
  description: string
}> = [
  {
    id: 'everyone',
    label: '모두 참석해야 해요',
    description: '모든 사람이 가능한 시간만 우선해서 볼게요.',
  },
  {
    id: 'required',
    label: '몇 명은 빠져도 진행할 수 있어요',
    description: '꼭 필요한 사람의 응답을 기준으로 시간을 찾을게요.',
  },
]

const attendeeDirectory = ['유진', '현우', '다은', '도윤']
const recentInviteesStorageKey = 'confirmation-board-recent-invitees'

const responseOptions: ResponseValue[] = ['available', 'adjustable', 'unavailable']
const participantResponseLabels: Record<ResponseValue, string> = {
  available: '가능해요',
  adjustable: '내 일정 조정',
  unavailable: '어려워요',
}
const responsePreferenceTags = Object.keys(
  responsePreferenceTagLabels,
) as ResponsePreferenceTag[]
const participantDateHeadingFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  weekday: 'long',
})
const participantClockFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

interface CandidateDateGroup {
  key: string
  date: Date
  candidates: Candidate[]
}

function groupCandidatesByDate(candidates: Candidate[]): CandidateDateGroup[] {
  const groups = new Map<string, CandidateDateGroup>()

  ;[...candidates]
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .forEach((candidate) => {
      const date = new Date(candidate.startAt)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
      ).padStart(2, '0')}`
      const group = groups.get(key)

      if (group) {
        group.candidates.push(candidate)
      } else {
        groups.set(key, { key, date, candidates: [candidate] })
      }
    })

  return [...groups.values()]
}

function formatCandidateClockRange(candidate: Candidate) {
  return `${participantClockFormatter.format(new Date(candidate.startAt))}-${participantClockFormatter.format(
    new Date(candidate.endAt),
  )}`
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
    label: '안내',
    eyebrow: '1단계',
    title: '회의 시간을 물어볼게요',
    description: '참석자가 링크를 열었을 때 바로 이해할 수 있는 정도만 적어주세요.',
  },
  {
    id: 'attendees',
    label: '참석자',
    eyebrow: '2단계',
    title: '참석자 정하기',
    description: '시간을 물어볼 사람과 회의를 진행할 기준을 정해요.',
  },
  {
    id: 'times',
    label: '시간',
    eyebrow: '3단계',
    title: '회의 시간을 정해볼까요?',
    description: '가능한 기간과 확보 시간을 정한 뒤 조율할 시간대를 알려주세요.',
  },
  {
    id: 'review',
    label: '확인',
    eyebrow: '4단계',
    title: '이대로 참석자에게 보낼까요?',
    description: '참석자가 링크를 열었을 때 볼 내용을 마지막으로 확인해요.',
  },
]

const routeHashes: Record<AppRoute, string> = {
  entry: '#/',
  create: '#/create',
  share: '#/share',
  host: '#/host',
  recover: '#/recover',
  message: '#/message',
  invite: '#/invite',
  'invite-edit': '#/invite/edit',
  'invite-added': '#/invite/added',
  'invite-done': '#/invite/done',
}

const hostStateCopy: Record<HostCoordinationState, { title: string; description: string }> = {
  HOST_DRAFT: {
    title: '회의 요청을 만들고 있어요',
    description: '참석자에게 무엇을 물어볼지 먼저 정리합니다.',
  },
  HOST_SHARE_READY: {
    title: '응답 링크를 보낼 수 있어요',
    description: '링크를 복사해 참석자에게 공유하세요.',
  },
  HOST_WAITING_EMPTY: {
    title: '아직 응답을 기다리고 있어요',
    description: '응답이 모이면 정할 수 있는 시간이 보입니다.',
  },
  HOST_WAITING_PARTIAL: {
    title: '꼭 필요한 응답이 더 필요해요',
    description: '필수 참석자에게만 다시 요청하면 됩니다.',
  },
  HOST_DECISION_READY: {
    title: '정할 수 있는 시간이 있어요',
    description: '가장 안정적인 후보를 확인하고 회의 시간을 확정하세요.',
  },
  HOST_REVIEW_NEEDED: {
    title: '정하기 전에 한 번 확인해 주세요',
    description: '가능하지만 일정 조정이 필요한 참석자가 있습니다.',
  },
  HOST_RECOVERY_REQUIRED: {
    title: '다시 물어볼 시간이 필요해요',
    description: '기존 응답은 유지하고 필요한 시간만 추가로 확인합니다.',
  },
  HOST_CONFIRMED: {
    title: '회의 시간이 정해졌어요',
    description: '참석자에게 보낼 확정 문구를 복사하면 됩니다.',
  },
}

const addedCandidateSlots = [
  ['2026-07-06T16:00:00+09:00', '2026-07-06T17:00:00+09:00'],
  ['2026-07-07T11:00:00+09:00', '2026-07-07T12:00:00+09:00'],
  ['2026-07-08T15:00:00+09:00', '2026-07-08T16:00:00+09:00'],
] as const

function parseRouteHash(): AppRoute {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [first, second] = parts

  if (first == null) return 'entry'
  if (first === 'results' || first === 'host') return 'host'
  if (first === 'explore' || first === 'recover') return 'recover'
  if (first === 'create') return 'create'
  if (first === 'share') return 'share'
  if (first === 'message') return 'message'

  if (first === 'respond' || first === 'invite') {
    if (second === 'edit') return 'invite-edit'
    if (second === 'added') return 'invite-added'
    if (second === 'done') return 'invite-done'
    return 'invite'
  }

  return 'entry'
}

function getAudience(route: AppRoute): Audience {
  if (route === 'entry') return 'entry'
  if (route.startsWith('invite')) return 'participant'
  return 'host'
}

function updateRouteHash(route: AppRoute, replace = false) {
  const nextHash = routeHashes[route]

  if (window.location.hash === nextHash) return

  if (replace) {
    window.history.replaceState(null, '', nextHash)
    return
  }

  window.history.pushState(null, '', nextHash)
}

async function copyText(value: string) {
  try {
    await navigator.clipboard?.writeText(value)
  } catch {
    // Clipboard access can be unavailable in local preview surfaces.
  }
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

function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRouteHash())
  const [meeting, setMeeting] = useState<Meeting>(() =>
    parseRouteHash() === 'create' ? createDraftMeeting() : createPrototypeMeeting(),
  )
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | undefined>()
  const [latestAddedCandidateId, setLatestAddedCandidateId] = useState<string | undefined>()
  const [selectedParticipantId] = useState(() => {
    const meetingData = createPrototypeMeeting()
    return (
      meetingData.participants.find((participant) => participant.responseStatus === 'pending')
        ?.id ??
      meetingData.participants[0]?.id ??
      ''
    )
  })
  const [copyStatus, setCopyStatus] = useState('')

  const evaluations = useMemo(() => evaluateCandidates(meeting, prototypeNow), [meeting])
  const hostState = getHostCoordinationState(meeting, evaluations, route)
  const audience = getAudience(route)
  const selectedEvaluation = getSelectedEvaluation(
    evaluations,
    selectedCandidateId,
    meeting.confirmedCandidateId,
  )
  const selectedParticipant =
    meeting.participants.find(
      (participant) =>
        participant.id === selectedParticipantId && participant.id !== meeting.hostId,
    ) ?? meeting.participants.find((participant) => participant.id !== meeting.hostId)
  const participantState =
    selectedParticipant != null
      ? getParticipantState(route, selectedParticipant, latestAddedCandidateId)
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

  useEffect(() => {
    if (!window.location.hash) {
      updateRouteHash('entry', true)
    }

    function handleRouteChange() {
      setRoute(parseRouteHash())
    }

    window.addEventListener('hashchange', handleRouteChange)
    window.addEventListener('popstate', handleRouteChange)

    return () => {
      window.removeEventListener('hashchange', handleRouteChange)
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  function navigateTo(nextRoute: AppRoute) {
    if (route === 'entry' && nextRoute === 'create') {
      setMeeting(createDraftMeeting())
    }

    setRoute(nextRoute)
    updateRouteHash(nextRoute)
  }

  function updateTitle(title: string) {
    setMeeting((currentMeeting) => ({ ...currentMeeting, title }))
  }

  function updatePurpose(purpose: string) {
    setMeeting((currentMeeting) => ({ ...currentMeeting, purpose }))
  }

  function updateHostLabel(hostLabel: string) {
    setMeeting((currentMeeting) => ({ ...currentMeeting, hostLabel }))
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
        currentMeeting.availabilityWindows,
        durationMinutes,
      ),
    }))
  }

  function updateResponseDeadline(responseDeadline: string) {
    setMeeting((currentMeeting) => ({ ...currentMeeting, responseDeadline }))
  }

  function updateCandidates(candidates: Candidate[]) {
    setMeeting((currentMeeting) => {
      const candidateIds = new Set(candidates.map((candidate) => candidate.id))

      return {
        ...currentMeeting,
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

  function updateAvailabilityWindows(availabilityWindows: AvailabilityWindow[]) {
    setMeeting((currentMeeting) => {
      const mergedWindows = mergeAvailabilityWindows(availabilityWindows)
      const candidates = deriveCandidatesFromAvailabilityWindows(
        currentMeeting.id,
        mergedWindows,
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
        role: participant.id === currentMeeting.hostId ? ('required' as const) : ('optional' as const),
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
          responseStatus: 'pending' as const,
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
        responses: currentMeeting.responses.filter(
          (response) => response.participantId !== participantId,
        ),
      }
    })
  }

  function updateResponse(participantId: string, candidateId: string, value: ResponseValue) {
    setMeeting((currentMeeting) => {
      const previousResponse = currentMeeting.responses.find(
        (response) =>
          response.participantId === participantId && response.candidateId === candidateId,
      )
      const nextResponses = currentMeeting.responses.filter(
        (response) =>
          response.participantId !== participantId || response.candidateId !== candidateId,
      )
      const nextResponse = {
        id: `r-${participantId}-${candidateId}`,
        participantId,
        candidateId,
        value,
        preferenceTags:
          value === 'unavailable' ? [] : (previousResponse?.preferenceTags ?? []),
        updatedAt: prototypeNow.toISOString(),
        updateSource:
          latestAddedCandidateId === candidateId ? 'candidate_added' : 'participant_edit',
      } as const
      const participantResponses = [...nextResponses, nextResponse].filter(
        (response) => response.participantId === participantId,
      )
      const isCompleted = currentMeeting.candidates.every((candidate) =>
        participantResponses.some((response) => response.candidateId === candidate.id),
      )
      const candidate = currentMeeting.candidates.find((item) => item.id === candidateId)
      const participant = currentMeeting.participants.find((item) => item.id === participantId)
      const shouldLogChange = previousResponse == null || previousResponse.value !== value
      const changeLog =
        shouldLogChange && candidate != null && participant != null
          ? createChangeLog(currentMeeting, {
              type: 'response_updated',
              candidateId,
              participantId,
              description:
                previousResponse == null
                  ? `${participant.name}님이 ${formatCandidateTime(candidate)}에 응답했어요.`
                  : `${participant.name}님의 응답이 "${responseValueLabels[previousResponse.value]}"에서 "${responseValueLabels[value]}"로 바뀌었어요.`,
            })
          : undefined

      return {
        ...currentMeeting,
        participants: currentMeeting.participants.map((participant) =>
          participant.id === participantId
            ? { ...participant, responseStatus: isCompleted ? 'completed' : 'pending' }
            : participant,
        ),
        responses: [...nextResponses, nextResponse],
        changeLogs: changeLog
          ? [changeLog, ...currentMeeting.changeLogs].slice(0, 6)
          : currentMeeting.changeLogs,
      }
    })
  }

  function toggleResponsePreference(
    participantId: string,
    candidateId: string,
    tag: ResponsePreferenceTag,
  ) {
    setMeeting((currentMeeting) => ({
      ...currentMeeting,
      responses: currentMeeting.responses.map((response) => {
        if (
          response.participantId !== participantId ||
          response.candidateId !== candidateId ||
          response.value === 'unavailable'
        ) {
          return response
        }

        const currentTags = response.preferenceTags ?? []
        const preferenceTags = currentTags.includes(tag)
          ? currentTags.filter((item) => item !== tag)
          : [...currentTags, tag]

        return {
          ...response,
          preferenceTags,
          updatedAt: prototypeNow.toISOString(),
          updateSource: 'participant_edit',
        }
      }),
    }))
  }

  async function copyShareLink() {
    await copyText(`${window.location.origin}${window.location.pathname}#/invite`)
    setCopyStatus('응답 링크를 복사했어요')
  }

  async function copyRecoveryRequest(evaluation: CandidateEvaluation) {
    await copyText(generateRecoveryRequestMessage(meeting, evaluation))
    setCopyStatus('요청 문구를 복사했어요')
    setMeeting((currentMeeting) => ({
      ...currentMeeting,
      changeLogs: [
        createChangeLog(currentMeeting, {
          type: 'request_copied',
          candidateId: evaluation.candidate.id,
          description:
            evaluation.status === 'needs_adjustment'
              ? `${formatCandidateTime(evaluation.candidate)} 확인 문구를 복사했어요.`
              : `${formatCandidateTime(evaluation.candidate)} 응답 요청 문구를 복사했어요.`,
        }),
        ...currentMeeting.changeLogs,
      ].slice(0, 6),
    }))
  }

  async function copyAddedCandidateMessage(message: string, candidateId?: string) {
    await copyText(message)
    setCopyStatus('새 시간 안내 문구를 복사했어요')
    setMeeting((currentMeeting) => ({
      ...currentMeeting,
      changeLogs: [
        createChangeLog(currentMeeting, {
          type: 'request_copied',
          candidateId,
          description: '새 시간 안내 문구를 복사했어요. 추가된 시간만 다시 확인하면 됩니다.',
        }),
        ...currentMeeting.changeLogs,
      ].slice(0, 6),
    }))
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

  function addCandidate() {
    const index = meeting.candidates.length + 1
    const addedCandidateId = `c-added-${index}`
    const [startAt, endAt] =
      addedCandidateSlots[Math.max(0, index - 6) % addedCandidateSlots.length]

    setMeeting((currentMeeting) => ({
      ...currentMeeting,
      candidates: [
        ...currentMeeting.candidates,
        {
          id: addedCandidateId,
          meetingId: currentMeeting.id,
          startAt,
          endAt,
          candidateRound: 2,
          addedAt: prototypeNow.toISOString(),
          addedByHost: true,
        },
      ],
      changeLogs: [
        createChangeLog(currentMeeting, {
          type: 'candidate_added',
          candidateId: addedCandidateId,
          description: `${formatCandidateTime({
            id: addedCandidateId,
            meetingId: currentMeeting.id,
            startAt,
            endAt,
          })}가 새 시간으로 추가됐어요.`,
        }),
        ...currentMeeting.changeLogs,
      ].slice(0, 6),
    }))
    setSelectedCandidateId(addedCandidateId)
    setLatestAddedCandidateId(addedCandidateId)
    navigateTo('recover')
  }

  return (
    <div data-astryx-theme="neutral" data-theme="light">
      <div>
        {audience === 'entry' ? <EntryScreen onStart={() => navigateTo('create')} /> : null}

        {audience === 'participant' && selectedParticipant != null ? (
          <ParticipantShell
            meeting={meeting}
            participant={selectedParticipant}
            state={participantState}
            latestAddedCandidateId={latestAddedCandidateId}
            onResponseChange={updateResponse}
            onPreferenceToggle={toggleResponsePreference}
            onDone={() => navigateTo('invite-done')}
            onEdit={() => navigateTo('invite-edit')}
          />
        ) : null}

        {audience === 'host' ? (
          <HostShell
            meeting={meeting}
            state={hostState}
            route={route}
            copyStatus={copyStatus}
            onNavigate={navigateTo}
          >
            {route === 'create' ? (
              <CreateScreen
                meeting={createMeeting}
                onTitleChange={updateTitle}
                onHostLabelChange={updateHostLabel}
                onPurposeChange={updatePurpose}
                onReferenceMaterialChange={updateReferenceMaterial}
                onSchedulingWindowChange={updateSchedulingWindow}
                onDurationChange={updateDuration}
                onResponseDeadlineChange={updateResponseDeadline}
                onAttendanceModeChange={updateAttendanceMode}
                onMinAttendeeCountChange={updateMinAttendeeCount}
                onParticipantRoleChange={updateParticipantRole}
                onParticipantAdd={addParticipant}
                onParticipantRemove={removeParticipant}
                onCandidatesChange={updateCandidates}
                onAvailabilityWindowsChange={updateAvailabilityWindows}
                onCreateLink={() => navigateTo('share')}
              />
            ) : null}

            {route === 'share' ? (
              <ShareLinkScreen
                meeting={meeting}
                onCopyLink={copyShareLink}
                onOpenInvite={() => navigateTo('invite')}
                onOpenHost={() => navigateTo('host')}
              />
            ) : null}

            {route === 'host' && isWaitingState(hostState) ? (
              <HostWaitingScreen
                meeting={meeting}
                evaluations={evaluations}
                state={hostState}
                onCopyLink={copyShareLink}
                onOpenInvite={() => navigateTo('invite')}
              />
            ) : null}

            {route === 'host' && isDecisionState(hostState) && selectedEvaluation != null ? (
              <HostDecideScreen
                meeting={meeting}
                evaluations={evaluations}
                state={hostState}
                selectedEvaluation={selectedEvaluation}
                onSelectCandidate={setSelectedCandidateId}
                onConfirm={confirmCandidate}
                onRecover={() => navigateTo('recover')}
                onCopyRequest={copyRecoveryRequest}
              />
            ) : null}

            {route === 'host' && hostState === 'HOST_RECOVERY_REQUIRED' ? (
              <HostRecoverScreen
                meeting={meeting}
                evaluations={evaluations}
                selectedEvaluation={selectedEvaluation}
                latestAddedCandidateId={latestAddedCandidateId}
                onAddCandidate={addCandidate}
                onCopyAddedCandidateMessage={copyAddedCandidateMessage}
                onOpenInvite={() => navigateTo('invite-added')}
              />
            ) : null}

            {route === 'recover' ? (
              <HostRecoverScreen
                meeting={meeting}
                evaluations={evaluations}
                selectedEvaluation={selectedEvaluation}
                latestAddedCandidateId={latestAddedCandidateId}
                onAddCandidate={addCandidate}
                onCopyAddedCandidateMessage={copyAddedCandidateMessage}
                onOpenInvite={() => navigateTo('invite-added')}
              />
            ) : null}

            {route === 'message' && selectedEvaluation != null ? (
              <MessageScreen
                meeting={meeting}
                evaluation={selectedEvaluation}
                onBack={() => navigateTo('host')}
                onCopy={(message) => {
                  void copyText(message)
                  setCopyStatus('확정 문구를 복사했어요')
                }}
              />
            ) : null}
          </HostShell>
        ) : null}
      </div>
    </div>
  )
}

function EntryScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="entry-shell">
      <section className="entry-panel">
        <div className="brand-mark">
          <span className="brand-dot" />
          <strong>Meeting Cue</strong>
        </div>

        <div className="entry-copy">
          <h1>지금 회의를 정해도 되는지 알려드려요.</h1>
          <p>참석자의 답변을 모아, 확정할 시간과 다음 행동을 보여드립니다.</p>
        </div>

        <div className="entry-action">
          <button className="primary-button" type="button" onClick={onStart}>
            회의 시간 정하기
            <ArrowRight aria-hidden="true" size={18} strokeWidth={2.5} />
          </button>
          <p className="entry-note">초대받은 사람은 링크에서 바로 응답할 수 있어요.</p>
        </div>
      </section>
    </main>
  )
}

function HostShell({
  meeting,
  state,
  route,
  copyStatus,
  onNavigate,
  children,
}: {
  meeting: Meeting
  state: HostCoordinationState
  route: AppRoute
  copyStatus: string
  onNavigate: (route: AppRoute) => void
  children: ReactNode
}) {
  const copy = hostStateCopy[state]
  const navigationItems = getHostNavigationItems(route, state)
  const contextDescription =
    route === 'create'
      ? '회의 요청을 만드는 중'
      : `${meeting.participants.filter((participant) => participant.id !== meeting.hostId).length}명에게 ${formatMeetingDuration(meeting.durationMinutes)} 회의 시간을 묻는 중`

  return (
    <div className="tds-app host-shell">
      <header className="host-context-bar" aria-label="회의 조율 상태">
        <button className="host-brand" type="button" onClick={() => onNavigate('entry')}>
          <span className="brand-dot" />
          <strong>Meeting Cue</strong>
        </button>
        <div className="host-context-main">
          <strong>{meeting.title}</strong>
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
        {route !== 'create' ? (
          <section className="host-stage__head">
            <span className={`state-badge state-badge--${getHostStateTone(state)}`}>
              {getHostStateLabel(state)}
            </span>
            <h1>{copy.title}</h1>
            <p>{copy.description}</p>
            {copyStatus ? <div className="copy-toast">{copyStatus}</div> : null}
          </section>
        ) : null}
        {children}
      </main>
    </div>
  )
}

function ShareLinkScreen({
  meeting,
  onCopyLink,
  onOpenInvite,
  onOpenHost,
}: {
  meeting: Meeting
  onCopyLink: () => void
  onOpenInvite: () => void
  onOpenHost: () => void
}) {
  const responseTargets = meeting.participants.filter(
    (participant) => participant.id !== meeting.hostId,
  )
  const completedCount = responseTargets.filter(
    (participant) => participant.responseStatus === 'completed',
  ).length

  return (
    <div className="share-workspace">
      <section className="share-card">
        <PanelTitle eyebrow="공유" title="참석자에게 이 링크를 보내세요" />
        <div className="link-box">
          <span>{`${window.location.origin}${window.location.pathname}#/invite`}</span>
          <button className="primary-button" type="button" onClick={onCopyLink}>
            링크 복사
          </button>
        </div>
        <div className="share-metrics">
          <SummaryLine label="응답" value={`${completedCount}/${responseTargets.length}명`} />
          <SummaryLine label="마감" value={formatDeadline(meeting.responseDeadline)} />
          <SummaryLine label="기준" value={`최소 ${meeting.minAttendeeCount}명`} />
        </div>
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={onOpenInvite}>
            참석자 화면 보기
          </button>
          <button className="secondary-button" type="button" onClick={onOpenHost}>
            응답 상태 보기
          </button>
        </div>
      </section>
    </div>
  )
}

function HostWaitingScreen({
  meeting,
  evaluations,
  state,
  onCopyLink,
  onOpenInvite,
}: {
  meeting: Meeting
  evaluations: CandidateEvaluation[]
  state: HostCoordinationState
  onCopyLink: () => void
  onOpenInvite: () => void
}) {
  const responseTargets = meeting.participants.filter(
    (participant) => participant.id !== meeting.hostId,
  )
  const completedParticipants = responseTargets.filter(
    (participant) => participant.responseStatus === 'completed',
  )
  const pendingParticipants = responseTargets.filter(
    (participant) => participant.responseStatus === 'pending',
  )
  const firstWaitingCandidate = evaluations.find(
    (evaluation) => evaluation.status === 'waiting_required',
  )
  const targetParticipants =
    firstWaitingCandidate?.missingRequired.length != null &&
    firstWaitingCandidate.missingRequired.length > 0
      ? firstWaitingCandidate.missingRequired
      : pendingParticipants

  return (
    <div className="waiting-workspace">
      <section className="waiting-card">
        <PanelTitle
          eyebrow={state === 'HOST_WAITING_EMPTY' ? '응답 대기' : '필수 응답'}
          title={
            state === 'HOST_WAITING_EMPTY'
              ? '먼저 응답을 모아야 해요'
              : '이 사람들의 답변이 있으면 정할 수 있어요'
          }
        />
        <div className="waiting-metrics">
          <SummaryLine label="응답 완료" value={`${completedParticipants.length}명`} />
          <SummaryLine label="남은 응답" value={`${pendingParticipants.length}명`} />
          <SummaryLine label="후보 시간" value={`${meeting.candidates.length}개`} />
        </div>
        <div className="request-targets">
          {targetParticipants.map((participant) => (
            <div className="target-row" key={participant.id}>
              <span className="avatar avatar--small">{participant.name.slice(0, 1)}</span>
              <strong>{participant.name}</strong>
              <small>{participantRoleLabels[participant.role]}</small>
            </div>
          ))}
        </div>
        <div className="button-row">
          <button className="primary-button" type="button" onClick={onCopyLink}>
            링크 다시 복사
          </button>
          <button className="secondary-button" type="button" onClick={onOpenInvite}>
            참석자 화면 보기
          </button>
        </div>
      </section>

      <section className="waiting-candidates">
        <PanelTitle eyebrow="현재 후보" title="응답이 들어온 시간" />
        <div className="mini-list">
          {evaluations.slice(0, 4).map((evaluation, index) => (
            <CandidateMiniRow
              key={evaluation.candidate.id}
              index={index + 1}
              label={`${formatCandidateTime(evaluation.candidate)} · ${candidateStatusLabels[evaluation.status]}`}
              durationMinutes={meeting.durationMinutes}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function HostDecideScreen({
  meeting,
  evaluations,
  state,
  selectedEvaluation,
  onSelectCandidate,
  onConfirm,
  onRecover,
  onCopyRequest,
}: {
  meeting: Meeting
  evaluations: CandidateEvaluation[]
  state: HostCoordinationState
  selectedEvaluation: CandidateEvaluation
  onSelectCandidate: (candidateId: string) => void
  onConfirm: (candidateId: string) => void
  onRecover: () => void
  onCopyRequest: (evaluation: CandidateEvaluation) => void
}) {
  const confirmableCount = evaluations.filter(
    (evaluation) => evaluation.status === 'confirmable',
  ).length
  const reviewCount = evaluations.filter(
    (evaluation) => evaluation.status === 'needs_adjustment',
  ).length

  return (
    <div className="decision-board">
      <section className="decision-board__summary">
        <SummaryLine label="바로 정할 수 있음" value={`${confirmableCount}개`} />
        <SummaryLine label="확인 후 가능" value={`${reviewCount}개`} />
        <SummaryLine label="필요한 참석" value={`${meeting.minAttendeeCount}명`} />
      </section>

      <div className="decision-board__body">
        <section className="candidate-decision-list" aria-label="후보 시간 목록">
          {evaluations.map((evaluation, index) => (
            <CandidateDecisionCard
              key={evaluation.candidate.id}
              evaluation={evaluation}
              index={index + 1}
              isSelected={evaluation.candidate.id === selectedEvaluation.candidate.id}
              onSelect={() => onSelectCandidate(evaluation.candidate.id)}
              onConfirm={() => onConfirm(evaluation.candidate.id)}
              onCopyRequest={() => onCopyRequest(evaluation)}
            />
          ))}
        </section>

        <CandidateEvidencePanel
          evaluation={selectedEvaluation}
          state={state}
          onConfirm={() => onConfirm(selectedEvaluation.candidate.id)}
          onRecover={onRecover}
          onCopyRequest={() => onCopyRequest(selectedEvaluation)}
        />
      </div>
    </div>
  )
}

function CandidateDecisionCard({
  evaluation,
  index,
  isSelected,
  onSelect,
  onConfirm,
  onCopyRequest,
}: {
  evaluation: CandidateEvaluation
  index: number
  isSelected: boolean
  onSelect: () => void
  onConfirm: () => void
  onCopyRequest: () => void
}) {
  const canConfirm = evaluation.status === 'confirmable' || evaluation.status === 'needs_adjustment'

  return (
    <article className={`candidate-decision-card${isSelected ? ' is-selected' : ''}`}>
      <button className="candidate-card-hit" type="button" onClick={onSelect}>
        <span className={`status-label status-label--${getStatusTone(evaluation.status)}`}>
          {candidateStatusLabels[evaluation.status]}
        </span>
        <strong>{formatCandidateTime(evaluation.candidate)}</strong>
        <p>{evaluation.reasons[0]}</p>
        <div className="candidate-facts">
          <MetricInline label="가능" value={`${evaluation.availableCount}명`} />
          <MetricInline label="조정" value={`${evaluation.adjustableCount}명`} />
          <MetricInline label="선호 조건" value={`${evaluation.preferenceTagCount}개`} />
          <MetricInline
            label="응답"
            value={`${evaluation.respondedCount}/${evaluation.responseTargetCount}명`}
          />
        </div>
      </button>
      <div className="candidate-card-actions">
        {canConfirm ? (
          <button className="primary-button" type="button" onClick={onConfirm}>
            이 시간 확정
          </button>
        ) : null}
        {evaluation.actionLabel != null ? (
          <button className="secondary-button" type="button" onClick={onCopyRequest}>
            요청 문구
          </button>
        ) : null}
        <small>후보 {index}</small>
      </div>
    </article>
  )
}

function CandidateEvidencePanel({
  evaluation,
  state,
  onConfirm,
  onRecover,
  onCopyRequest,
}: {
  evaluation: CandidateEvaluation
  state: HostCoordinationState
  onConfirm: () => void
  onRecover: () => void
  onCopyRequest: () => void
}) {
  const canConfirm = evaluation.status === 'confirmable' || evaluation.status === 'needs_adjustment'

  return (
    <aside className="evidence-panel" aria-label="선택한 후보 상세">
      <div className="evidence-panel__head">
        <span className={`state-badge state-badge--${getStatusTone(evaluation.status)}`}>
          {candidateStatusLabels[evaluation.status]}
        </span>
        <h2>{formatCandidateTime(evaluation.candidate)}</h2>
      </div>

      <section className="evidence-section">
        <h3>정할 때 볼 정보</h3>
        {evaluation.reasons.map((reason) => (
          <p key={reason}>{reason}</p>
        ))}
      </section>

      <section className="evidence-section">
        <h3>참석자 응답</h3>
        <div className="participant-list">
          {evaluation.responseDetails.map((detail) => (
            <div className="participant-row" key={detail.participant.id}>
              <span className="avatar avatar--small">{detail.participant.name.slice(0, 1)}</span>
              <div>
                <strong>{detail.participant.name}</strong>
                <small>{participantRoleLabels[detail.participant.role]}</small>
                {detail.response?.preferenceTags?.length ? (
                  <span className="response-context">
                    {detail.response.preferenceTags
                      .map((tag) => responsePreferenceTagLabels[tag])
                      .join(' · ')}
                  </span>
                ) : null}
              </div>
              <ResponseBadge
                value={detail.response?.value}
                isImplicitHostAvailable={detail.isImplicitHostAvailable}
              />
            </div>
          ))}
        </div>
      </section>

      <div className="evidence-actions">
        {canConfirm ? (
          <button className="primary-button" type="button" onClick={onConfirm}>
            이 시간으로 정하기
          </button>
        ) : null}
        {evaluation.actionLabel != null ? (
          <button className="secondary-button" type="button" onClick={onCopyRequest}>
            필요한 사람에게 다시 묻기
          </button>
        ) : null}
        {state !== 'HOST_DECISION_READY' ? (
          <button className="text-button" type="button" onClick={onRecover}>
            새 후보 시간 추가
          </button>
        ) : null}
      </div>
    </aside>
  )
}

function HostRecoverScreen({
  meeting,
  evaluations,
  selectedEvaluation,
  latestAddedCandidateId,
  onAddCandidate,
  onCopyAddedCandidateMessage,
  onOpenInvite,
}: {
  meeting: Meeting
  evaluations: CandidateEvaluation[]
  selectedEvaluation?: CandidateEvaluation
  latestAddedCandidateId?: string
  onAddCandidate: () => void
  onCopyAddedCandidateMessage: (message: string, candidateId?: string) => void
  onOpenInvite: () => void
}) {
  const blockedCount = evaluations.filter((evaluation) => evaluation.status === 'excluded').length
  const latestAddedCandidate = meeting.candidates.find(
    (candidate) => candidate.id === latestAddedCandidateId,
  )
  const fallbackEvaluation = selectedEvaluation ?? evaluations[0]
  const message =
    latestAddedCandidate != null
      ? `${meeting.title} 시간을 다시 확인하려고 해요.\n기존 응답은 유지됩니다.\n${formatCandidateTime(latestAddedCandidate)}만 추가로 확인해 주세요.`
      : fallbackEvaluation != null
        ? generateRecoveryRequestMessage(meeting, fallbackEvaluation)
        : `${meeting.title} 후보 시간을 다시 확인하려고 해요.\n기존 응답은 유지됩니다.`

  return (
    <div className="recover-workspace">
      <section className="soft-panel recovery-copy">
        <PanelTitle eyebrow="조율 회복" title="기존 링크 안에서 필요한 시간만 다시 물어봐요" />
        <p>
          지금 바로 정하기 어려운 후보가 {blockedCount}개 있어요. 기존 응답은 유지하고, 필요한
          시간만 더 확인합니다.
        </p>
        <div className="recovery-rules">
          <ConditionRow label="기존 링크" value="유지" ok />
          <ConditionRow label="기존 응답" value="유지" ok />
          <ConditionRow label="새 후보" value="추가 시간만 미응답" ok />
        </div>
        <div className="button-row">
          <button className="primary-button" type="button" onClick={onAddCandidate}>
            새 시간 추가하기
          </button>
          <button className="secondary-button" type="button" onClick={onOpenInvite}>
            새 후보 응답 화면 보기
          </button>
        </div>
      </section>

      <section className="soft-panel message-panel">
        <PanelTitle eyebrow="복사할 문구" title="필요한 사람에게만 다시 물어봐요" />
        <pre>{message}</pre>
        <button
          className="secondary-button"
          type="button"
          onClick={() => onCopyAddedCandidateMessage(message, latestAddedCandidate?.id)}
        >
          안내 문구 복사하기
        </button>
      </section>
    </div>
  )
}

const RECOMMENDED_CANDIDATE_COUNT = 5
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
  month: 'long',
  day: 'numeric',
  weekday: 'short',
})
const koreanShortDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
})
const koreanWeekdayFormatter = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' })

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

function candidateIsWithinWindow(candidate: Candidate, window: SchedulingWindow) {
  const candidateDate = formatDateInput(new Date(candidate.startAt))

  return candidateDate >= window.startDate && candidateDate <= window.endDate
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
  const [anchor, setAnchor] = useState<{ date: CalendarDate; startMinutes: number } | null>(null)
  const [preview, setPreview] = useState<{
    date: CalendarDate
    startMinutes: number
    endMinutes: number
  } | null>(null)
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null)
  const [editingWindow, setEditingWindow] = useState<AvailabilityWindow | null>(null)
  const [removedWindow, setRemovedWindow] = useState<AvailabilityWindow | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const activeDate =
    selectedDate.compare(windowStartDate) < 0 || selectedDate.compare(windowEndDate) > 0
      ? windowStartDate
      : selectedDate
  const weekStart = useMemo(() => startOfWeek(activeDate, 'ko-KR', 'mon'), [activeDate])
  const firstWindowWeek = useMemo(
    () => startOfWeek(windowStartDate, 'ko-KR', 'mon'),
    [windowStartDate],
  )
  const lastWindowWeek = useMemo(
    () => startOfWeek(windowEndDate, 'ko-KR', 'mon'),
    [windowEndDate],
  )
  const displayDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => weekStart.add({ days: index })),
    [weekStart],
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

  function countWindowsForDate(date: CalendarDate) {
    return meeting.availabilityWindows.filter(
      (window) => toCalendarDate(new Date(window.startAt)).compare(date) === 0,
    ).length
  }

  function buildRange(
    date: CalendarDate,
    anchorMinutes: number,
    edgeMinutes: number,
  ) {
    let startMinutes = Math.min(anchorMinutes, edgeMinutes)
    let endMinutes = Math.max(anchorMinutes, edgeMinutes) + TIME_QUANTUM_MINUTES

    if (endMinutes - startMinutes < meeting.durationMinutes) {
      if (edgeMinutes >= anchorMinutes) {
        endMinutes = startMinutes + meeting.durationMinutes
      } else {
        startMinutes = endMinutes - meeting.durationMinutes
      }
    }

    if (startMinutes < TIME_GRID_START_MINUTES) {
      endMinutes += TIME_GRID_START_MINUTES - startMinutes
      startMinutes = TIME_GRID_START_MINUTES
    }

    if (endMinutes > TIME_GRID_END_MINUTES) {
      startMinutes -= endMinutes - TIME_GRID_END_MINUTES
      endMinutes = TIME_GRID_END_MINUTES
    }

    startMinutes = Math.max(TIME_GRID_START_MINUTES, startMinutes)

    if (endMinutes - startMinutes < meeting.durationMinutes) {
      return null
    }

    return { date, startMinutes, endMinutes }
  }

  function previewFrom(date: CalendarDate, startMinutes: number) {
    if (isOutsideWindow(date)) {
      setPreview(null)
      return
    }

    if (anchor != null && anchor.date.compare(date) !== 0) {
      setPreview(buildRange(date, startMinutes, startMinutes))
      return
    }

    setPreview(
      buildRange(date, anchor?.startMinutes ?? startMinutes, startMinutes),
    )
  }

  function chooseBoundary(date: CalendarDate, startMinutes: number) {
    const existingWindow = windowOccupyingSlot(date, startMinutes)

    if (existingWindow != null && anchor == null) {
      setActiveWindowId((current) =>
        current === existingWindow.id ? null : existingWindow.id,
      )
      setPreview(null)
      return
    }

    if (isOutsideWindow(date)) {
      return
    }

    if (anchor == null || anchor.date.compare(date) !== 0) {
      setAnchor({ date, startMinutes })
      setPreview(buildRange(date, startMinutes, startMinutes))
      setActiveWindowId(null)
      return
    }

    const range = buildRange(date, anchor.startMinutes, startMinutes)

    if (range == null) {
      return
    }

    const nextWindow: AvailabilityWindow = {
      id: editingWindow?.id ?? `aw-${toLocalDate(date, range.startMinutes).getTime()}`,
      meetingId: meeting.id,
      ownerId: meeting.hostId,
      startAt: toLocalDate(date, range.startMinutes).toISOString(),
      endAt: toLocalDate(date, range.endMinutes).toISOString(),
      state: 'available',
    }

    onAvailabilityWindowsChange([...meeting.availabilityWindows, nextWindow])
    setAnchor(null)
    setPreview(null)
    setEditingWindow(null)
    setActiveWindowId(null)
  }

  function removeAvailabilityWindow(window: AvailabilityWindow) {
    setRemovedWindow(window)
    onAvailabilityWindowsChange(
      meeting.availabilityWindows.filter((item) => item.id !== window.id),
    )
    setActiveWindowId(null)
    if (editingWindow?.id === window.id) {
      setEditingWindow(null)
      setAnchor(null)
      setPreview(null)
    }
  }

  function startEditingWindow(window: AvailabilityWindow) {
    const start = new Date(window.startAt)
    const date = toCalendarDate(start)
    const startMinutes = start.getHours() * 60 + start.getMinutes()
    const end = new Date(window.endAt)

    onAvailabilityWindowsChange(
      meeting.availabilityWindows.filter((item) => item.id !== window.id),
    )
    setEditingWindow(window)
    setAnchor({ date, startMinutes })
    setPreview({
      date,
      startMinutes,
      endMinutes: end.getHours() * 60 + end.getMinutes(),
    })
    setActiveWindowId(null)
  }

  function cancelRangeSelection() {
    if (editingWindow != null) {
      onAvailabilityWindowsChange([...meeting.availabilityWindows, editingWindow])
    }
    setAnchor(null)
    setPreview(null)
    setEditingWindow(null)
  }

  function undoRemoveWindow() {
    if (removedWindow == null) {
      return
    }

    onAvailabilityWindowsChange([...meeting.availabilityWindows, removedWindow])
    setRemovedWindow(null)
  }

  function focusGridSlot(dayIndex: number, timeIndex: number) {
    const nextDayIndex = Math.min(Math.max(dayIndex, 0), displayDays.length - 1)
    const nextTimeIndex = Math.min(Math.max(timeIndex, 0), TIME_SLOT_MINUTES.length - 1)

    setFocusedSlot({ dayIndex: nextDayIndex, timeIndex: nextTimeIndex })
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-availability-index="${nextTimeIndex}-${nextDayIndex}"]`)
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
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelRangeSelection()
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

  function renderSelectedWindows(className = '') {
    return (
      <section
        className={`selected-candidates ${className}`.trim()}
        aria-labelledby={`selected-window-title-${isMobile ? 'mobile' : 'desktop'}`}
      >
        <div className="selected-candidates__head">
          <h2 id={`selected-window-title-${isMobile ? 'mobile' : 'desktop'}`}>
            가능한 시간대
          </h2>
          <strong>{meeting.availabilityWindows.length}개</strong>
        </div>
        {meeting.availabilityWindows.length > 0 ? (
          <div className="selected-candidates__list">
            {meeting.availabilityWindows.map((window) => {
              const isActive = activeWindowId === window.id

              return (
                <div
                  className={`selected-candidate-item${isActive ? ' is-active' : ''}`}
                  key={window.id}
                >
                  <div className="selected-candidate-row">
                    <span aria-hidden="true"><Check size={15} strokeWidth={3} /></span>
                    <strong>{formatAvailabilityWindow(window)}</strong>
                    <button
                      className="selected-candidate-manage"
                      type="button"
                      aria-expanded={isActive}
                      onClick={() => setActiveWindowId(isActive ? null : window.id)}
                    >
                      관리
                    </button>
                  </div>
                  {isActive ? (
                    <div className="selected-candidate-actions" aria-label="가능한 시간대 관리">
                      <button type="button" onClick={() => startEditingWindow(window)}>
                        다시 선택
                      </button>
                      <button
                        className="is-danger"
                        type="button"
                        onClick={() => removeAvailabilityWindow(window)}
                      >
                        삭제
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="selected-candidates__empty">아직 가능한 시간대가 없어요.</p>
        )}
      </section>
    )
  }

  const weekEnd = displayDays[displayDays.length - 1]
  const weekLabel = `${koreanShortDateFormatter.format(toLocalDate(weekStart))} - ${koreanShortDateFormatter.format(toLocalDate(weekEnd))}`
  const cannotGoPrevious = weekStart.compare(firstWindowWeek) <= 0
  const cannotGoNext = weekStart.compare(lastWindowWeek) >= 0

  return (
    <div className="time-picker availability-picker">
      <div className="time-picker__status">
        <div>
          <span>가능한 시간대</span>
          <strong>{meeting.availabilityWindows.length}개</strong>
        </div>
        <span>{formatMeetingDuration(meeting.durationMinutes)} 회의 후보를 계산해요</span>
      </div>

      <div className="time-picker__toolbar">
        <div className="time-picker__week-navigation" aria-label="주간 이동">
          <button type="button" aria-label="이전 주" disabled={cannotGoPrevious} onClick={() => changeWeek(-1)}>
            <ChevronLeft size={20} />
          </button>
          <strong>{weekLabel}</strong>
          <button type="button" aria-label="다음 주" disabled={cannotGoNext} onClick={() => changeWeek(1)}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {anchor != null ? (
        <div className="candidate-move-banner" role="status">
          <div>
            <strong>시간대의 반대쪽 끝을 선택하세요</strong>
            <span>최소 {formatMeetingDuration(meeting.durationMinutes)} 이상 선택할 수 있어요.</span>
          </div>
          <button type="button" onClick={cancelRangeSelection}>취소</button>
        </div>
      ) : null}

      {isMobile ? (
        <div className="mobile-time-picker">
          <div className="mobile-date-strip" aria-label="날짜 선택">
            {displayDays.map((date) => {
              const isSelectedDate = date.compare(activeDate) === 0
              const count = countWindowsForDate(date)

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
                  {count > 0 ? <small>{count}</small> : null}
                </button>
              )
            })}
          </div>
          <section className="mobile-time-slots" aria-labelledby="mobile-availability-title">
            <h2 id="mobile-availability-title">시간대의 시작과 끝을 차례로 선택하세요</h2>
            <div className="mobile-time-slot-list mobile-availability-list">
              {TIME_SLOT_MINUTES.map((startMinutes) => {
                const selectedWindow = windowOccupyingSlot(activeDate, startMinutes)
                return (
                  <button
                    key={startMinutes}
                    className={selectedWindow != null ? 'is-selected' : ''}
                    type="button"
                    aria-pressed={selectedWindow != null}
                    onClick={() => chooseBoundary(activeDate, startMinutes)}
                  >
                    <span>{formatTimeOfDay(startMinutes)}</span>
                  </button>
                )
              })}
            </div>
          </section>
          {renderSelectedWindows('selected-candidates--mobile')}
        </div>
      ) : (
        <div className="time-picker__workspace">
          <div
            ref={gridRef}
            className="week-time-grid"
            role="grid"
            aria-label={`${weekLabel} 가능한 시간대 선택`}
            onMouseLeave={() => {
              if (anchor == null) setPreview(null)
            }}
          >
            <div className="week-time-grid__header" role="row">
              <span aria-hidden="true" />
              {displayDays.map((date) => {
                const count = countWindowsForDate(date)
                return (
                  <div key={date.toString()} role="columnheader">
                    <span>{koreanWeekdayFormatter.format(toLocalDate(date))}</span>
                    <strong>{date.day}</strong>
                    {count > 0 ? <small>{count}</small> : null}
                  </div>
                )
              })}
            </div>

            {TIME_SLOT_MINUTES.map((startMinutes, timeIndex) => (
              <div className="week-time-grid__row" role="row" key={startMinutes}>
                <span role="rowheader">{formatTimeOfDay(startMinutes)}</span>
                {displayDays.map((date, dayIndex) => {
                  const selectedWindow = windowOccupyingSlot(date, startMinutes)
                  const selectedStart = selectedWindow == null ? null : new Date(selectedWindow.startAt)
                  const selectedEnd = selectedWindow == null ? null : new Date(selectedWindow.endAt)
                  const slotStart = toLocalDate(date, startMinutes)
                  const slotEnd = toLocalDate(date, startMinutes + TIME_QUANTUM_MINUTES)
                  const isBlockStart = selectedStart?.getTime() === slotStart.getTime()
                  const isBlockEnd = selectedEnd != null && slotEnd.getTime() >= selectedEnd.getTime()
                  const previewStartsHere =
                    preview != null &&
                    preview.date.compare(date) === 0 &&
                    preview.startMinutes === startMinutes
                  const className = [
                    selectedWindow != null ? 'is-selected' : '',
                    selectedWindow != null && isBlockStart ? 'is-block-start' : '',
                    selectedWindow != null && !isBlockStart && !isBlockEnd ? 'is-block-middle' : '',
                    selectedWindow != null && isBlockEnd ? 'is-block-end' : '',
                    previewStartsHere ? 'is-preview-start' : '',
                  ].filter(Boolean).join(' ')
                  const slotCount = isBlockStart && selectedWindow != null
                    ? (new Date(selectedWindow.endAt).getTime() - new Date(selectedWindow.startAt).getTime()) / (TIME_QUANTUM_MINUTES * 60 * 1000)
                    : previewStartsHere && preview != null
                      ? (preview.endMinutes - preview.startMinutes) / TIME_QUANTUM_MINUTES
                      : null

                  return (
                    <div role="gridcell" key={`${date.toString()}-${startMinutes}`}>
                      <button
                        className={className}
                        style={slotCount == null ? undefined : ({ '--candidate-slot-count': slotCount } as CSSProperties)}
                        type="button"
                        data-availability-index={`${timeIndex}-${dayIndex}`}
                        tabIndex={focusedSlot.dayIndex === dayIndex && focusedSlot.timeIndex === timeIndex ? 0 : -1}
                        aria-pressed={selectedWindow != null}
                        aria-label={`${koreanDateFormatter.format(toLocalDate(date))} ${formatTimeOfDay(startMinutes)}${selectedWindow != null ? `, ${formatAvailabilityWindow(selectedWindow)} 가능한 시간대에 포함됨` : ', 시간대 경계로 선택'}`}
                        disabled={isOutsideWindow(date)}
                        onFocus={() => {
                          setFocusedSlot({ dayIndex, timeIndex })
                          if (selectedWindow == null) previewFrom(date, startMinutes)
                        }}
                        onMouseEnter={() => {
                          if (selectedWindow == null || anchor != null) previewFrom(date, startMinutes)
                        }}
                        onKeyDown={(event) => handleGridKeyDown(event, dayIndex, timeIndex)}
                        onClick={() => chooseBoundary(date, startMinutes)}
                      >
                        {isBlockStart ? (
                          <span className="candidate-block-content"><Check size={18} strokeWidth={3} /></span>
                        ) : null}
                      </button>
                      {isBlockStart && selectedWindow != null ? (
                        <div className="candidate-block-remove">
                          <button
                            type="button"
                            aria-label={`${formatAvailabilityWindow(selectedWindow)} 시간대 삭제`}
                            onClick={(event) => {
                              event.stopPropagation()
                              removeAvailabilityWindow(selectedWindow)
                            }}
                          >
                            <X aria-hidden="true" size={13} strokeWidth={2.5} />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          {renderSelectedWindows('selected-candidates--desktop')}
        </div>
      )}

      {removedWindow != null ? (
        <div className="candidate-undo" role="status" aria-live="polite">
          <span>{formatAvailabilityWindow(removedWindow)} 시간대를 삭제했어요.</span>
          <button type="button" onClick={undoRemoveWindow}>실행 취소</button>
        </div>
      ) : null}
    </div>
  )
}

export function TimeCandidatePicker({
  meeting,
  onCandidatesChange,
}: {
  meeting: MeetingWithDuration
  onCandidatesChange: (candidates: Candidate[]) => void
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
  const initialDate = useMemo(
    () =>
      meeting.candidates[0] != null
        ? toCalendarDate(new Date(meeting.candidates[0].startAt))
        : windowStartDate,
    [meeting.candidates, windowStartDate],
  )
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const activeDate =
    selectedDate.compare(windowStartDate) < 0 || selectedDate.compare(windowEndDate) > 0
      ? windowStartDate
      : selectedDate
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [focusedSlot, setFocusedSlot] = useState({ dayIndex: 0, timeIndex: 0 })
  const [previewSlot, setPreviewSlot] = useState<{
    date: CalendarDate
    startMinutes: number
  } | null>(null)
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null)
  const [movingCandidateId, setMovingCandidateId] = useState<string | null>(null)
  const [removedCandidate, setRemovedCandidate] = useState<Candidate | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
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
  const trailingTimeSlots = useMemo(
    () =>
      Array.from(
        { length: Math.max(0, meeting.durationMinutes / TIME_QUANTUM_MINUTES - 1) },
        (_, index) => TIME_GRID_END_MINUTES + index * TIME_QUANTUM_MINUTES,
      ),
    [meeting.durationMinutes],
  )
  const candidatesByStart = useMemo(
    () =>
      new Map(
        meeting.candidates
          .filter((candidate) => candidate.id !== movingCandidateId)
          .map((candidate) => [new Date(candidate.startAt).getTime(), candidate]),
      ),
    [meeting.candidates, movingCandidateId],
  )

  function candidateFor(date: CalendarDate, startMinutes: number) {
    return candidatesByStart.get(toLocalDate(date, startMinutes).getTime())
  }

  function candidateOccupyingSlot(date: CalendarDate, slotStartMinutes: number) {
    const slotStart = toLocalDate(date, slotStartMinutes).getTime()

    return meeting.candidates.find((candidate) => {
      if (candidate.id === movingCandidateId) {
        return false
      }

      const candidateStart = new Date(candidate.startAt).getTime()
      const candidateEnd = new Date(candidate.endAt).getTime()

      return candidateStart <= slotStart && slotStart < candidateEnd
    })
  }

  function overlappingCandidateFor(date: CalendarDate, startMinutes: number) {
    const candidateStart = toLocalDate(date, startMinutes).getTime()
    const candidateEnd = candidateStart + meeting.durationMinutes * 60 * 1000

    return meeting.candidates.find((candidate) => {
      if (candidate.id === movingCandidateId) {
        return false
      }

      const existingStart = new Date(candidate.startAt).getTime()
      const existingEnd = new Date(candidate.endAt).getTime()

      return candidateStart < existingEnd && candidateEnd > existingStart
    })
  }

  function candidateWouldOverlap(date: CalendarDate, startMinutes: number) {
    return overlappingCandidateFor(date, startMinutes) != null
  }

  function candidateFitsGrid(startMinutes: number) {
    return startMinutes >= TIME_GRID_START_MINUTES && startMinutes < TIME_GRID_END_MINUTES
  }

  function chooseCandidateSlot(date: CalendarDate, startMinutes: number) {
    const existingCandidate = candidateOccupyingSlot(date, startMinutes)

    if (existingCandidate) {
      setActiveCandidateId((currentId) =>
        currentId === existingCandidate.id ? null : existingCandidate.id,
      )
      setPreviewSlot(null)
      return
    }

    if (!candidateFitsGrid(startMinutes) || candidateWouldOverlap(date, startMinutes)) {
      return
    }

    const start = toLocalDate(date, startMinutes)
    const end = new Date(start.getTime() + meeting.durationMinutes * 60 * 1000)
    const movingCandidate = meeting.candidates.find(
      (candidate) => candidate.id === movingCandidateId,
    )

    if (movingCandidate != null) {
      const movedCandidate = {
        ...movingCandidate,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      }
      onCandidatesChange(
        meeting.candidates
          .map((candidate) =>
            candidate.id === movingCandidate.id ? movedCandidate : candidate,
          )
          .sort(
            (left, right) =>
              new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
          ),
      )
      setMovingCandidateId(null)
      setActiveCandidateId(null)
      setPreviewSlot(null)
      return
    }

    const nextCandidate: Candidate = {
      id: `c-${start.getTime()}`,
      meetingId: meeting.id,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    }

    onCandidatesChange(
      [...meeting.candidates, nextCandidate].sort(
        (left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
      ),
    )
    setPreviewSlot(null)
  }

  function removeCandidate(candidateId: string) {
    const candidate = meeting.candidates.find((item) => item.id === candidateId)

    if (candidate == null) {
      return
    }

    setRemovedCandidate(candidate)
    onCandidatesChange(meeting.candidates.filter((candidate) => candidate.id !== candidateId))
    setActiveCandidateId(null)
    if (movingCandidateId === candidateId) {
      setMovingCandidateId(null)
      setPreviewSlot(null)
    }
  }

  function undoRemoveCandidate() {
    if (removedCandidate == null) {
      return
    }

    onCandidatesChange(
      [...meeting.candidates, removedCandidate].sort(
        (left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
      ),
    )
    setRemovedCandidate(null)
  }

  function startMovingCandidate(candidate: Candidate) {
    const start = new Date(candidate.startAt)

    setMovingCandidateId(candidate.id)
    setActiveCandidateId(null)
    setPreviewSlot({
      date: toCalendarDate(start),
      startMinutes: start.getHours() * 60 + start.getMinutes(),
    })
  }

  function cancelMovingCandidate() {
    setMovingCandidateId(null)
    setPreviewSlot(null)
  }

  function previewCandidate(date: CalendarDate, startMinutes: number) {
    if (
      isOutsideWindow(date) ||
      !candidateFitsGrid(startMinutes) ||
      candidateWouldOverlap(date, startMinutes)
    ) {
      return
    }

    setPreviewSlot({ date, startMinutes })
  }

  function isPreviewStart(date: CalendarDate, startMinutes: number) {
    return (
      previewSlot != null &&
      previewSlot.date.compare(date) === 0 &&
      previewSlot.startMinutes === startMinutes
    )
  }

  function selectCalendarDate(value: DateValue) {
    setSelectedDate(new CalendarDate(value.year, value.month, value.day))
    setIsCalendarOpen(false)
  }

  function changeWeek(offset: number) {
    const nextDate = activeDate.add({ weeks: offset })

    if (nextDate.compare(windowStartDate) < 0) {
      setSelectedDate(windowStartDate)
      return
    }

    if (nextDate.compare(windowEndDate) > 0) {
      setSelectedDate(windowEndDate)
      return
    }

    setSelectedDate(nextDate)
  }

  function focusGridSlot(dayIndex: number, timeIndex: number) {
    const nextDayIndex = Math.min(Math.max(dayIndex, 0), displayDays.length - 1)
    const nextTimeIndex = Math.min(Math.max(timeIndex, 0), TIME_SLOT_MINUTES.length - 1)

    setFocusedSlot({ dayIndex: nextDayIndex, timeIndex: nextTimeIndex })
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-grid-index="${nextTimeIndex}-${nextDayIndex}"]`)
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
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusGridSlot(0, timeIndex)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusGridSlot(displayDays.length - 1, timeIndex)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setActiveCandidateId(null)
      cancelMovingCandidate()
    }
  }

  function countCandidatesForDate(date: CalendarDate) {
    return meeting.candidates.filter((candidate) => {
      const candidateDate = toCalendarDate(new Date(candidate.startAt))
      return candidateDate.compare(date) === 0
    }).length
  }

  function isOutsideWindow(date: CalendarDate) {
    return (
      date.compare(todayDate) < 0 ||
      date.compare(windowStartDate) < 0 ||
      date.compare(windowEndDate) > 0
    )
  }

  function renderSelectedCandidates(className = '') {
    return (
      <section
        className={`selected-candidates ${className}`.trim()}
        aria-labelledby={`selected-candidate-title-${isMobile ? 'mobile' : 'desktop'}`}
      >
        <div className="selected-candidates__head">
          <h2 id={`selected-candidate-title-${isMobile ? 'mobile' : 'desktop'}`}>선택한 시간</h2>
          <strong>{meeting.candidates.length}개</strong>
        </div>
        {meeting.candidates.length > 0 ? (
          <div className="selected-candidates__list">
            {meeting.candidates.map((candidate) => {
              const isActive = activeCandidateId === candidate.id
              const isMoving = movingCandidateId === candidate.id

              return (
                <div
                  className={`selected-candidate-item${isActive ? ' is-active' : ''}`}
                  key={candidate.id}
                >
                  <div className="selected-candidate-row">
                    <span aria-hidden="true">
                      <Check size={15} strokeWidth={3} />
                    </span>
                    <strong>
                      {formatCandidateTime(candidate)}
                      {isMoving ? <small>변경할 시간을 선택하는 중</small> : null}
                    </strong>
                    <button
                      className="selected-candidate-manage"
                      type="button"
                      aria-label={`${formatCandidateTime(candidate)} 관리`}
                      aria-expanded={isActive}
                      title="시간 관리"
                      onClick={() => setActiveCandidateId(isActive ? null : candidate.id)}
                    >
                      관리
                    </button>
                  </div>
                  {isActive ? (
                    <div className="selected-candidate-actions" aria-label="후보 시간 관리">
                      <button type="button" onClick={() => startMovingCandidate(candidate)}>
                        시간 변경
                      </button>
                      <button
                        className="is-danger"
                        type="button"
                        onClick={() => removeCandidate(candidate.id)}
                      >
                        삭제
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="selected-candidates__empty">아직 선택한 시간이 없어요.</p>
        )}
      </section>
    )
  }

  const weekEnd = displayDays[displayDays.length - 1]
  const weekLabel = `${koreanShortDateFormatter.format(toLocalDate(weekStart))} - ${koreanShortDateFormatter.format(toLocalDate(weekEnd))}`
  const cannotGoPrevious = weekStart.compare(firstWindowWeek) <= 0
  const cannotGoNext = weekStart.compare(lastWindowWeek) >= 0
  const calendarContent = (
    <Dialog className="date-dialog">
      <Calendar
        className="date-calendar"
        aria-label="날짜 선택"
        value={activeDate}
        minValue={windowStartDate}
        maxValue={windowEndDate}
        firstDayOfWeek="mon"
        onChange={selectCalendarDate}
      >
        <header className="date-calendar__header">
          <AriaButton slot="previous" aria-label="이전 달">
            <ChevronLeft size={19} />
          </AriaButton>
          <Heading />
          <AriaButton slot="next" aria-label="다음 달">
            <ChevronRight size={19} />
          </AriaButton>
        </header>
        <CalendarGrid>
          <CalendarGridHeader>
            {(day) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
          </CalendarGridHeader>
          <CalendarGridBody>{(date) => <CalendarCell date={date} />}</CalendarGridBody>
        </CalendarGrid>
      </Calendar>
    </Dialog>
  )

  return (
    <div className="time-picker">
      <div className="time-picker__status">
        <div>
          <span>후보 시간</span>
          <strong>{meeting.candidates.length}개</strong>
        </div>
        <span>{formatMeetingDuration(meeting.durationMinutes)}씩</span>
      </div>

      <div className="time-picker__toolbar">
        <div className="time-picker__week-navigation" aria-label="주간 이동">
          <button
            type="button"
            aria-label="이전 주"
            title="이전 주"
            disabled={cannotGoPrevious}
            onClick={() => changeWeek(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <strong>{weekLabel}</strong>
          <button
            type="button"
            aria-label="다음 주"
            title="다음 주"
            disabled={cannotGoNext}
            onClick={() => changeWeek(1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <DialogTrigger isOpen={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <AriaButton className="calendar-trigger" aria-label="달력에서 날짜 선택">
            <CalendarDays size={19} />
            <span>날짜 선택</span>
          </AriaButton>
          {isMobile ? (
            <ModalOverlay className="date-modal-overlay" isDismissable>
              <Modal className="date-modal">{calendarContent}</Modal>
            </ModalOverlay>
          ) : (
            <Popover className="date-popover" placement="bottom end">
              {calendarContent}
            </Popover>
          )}
        </DialogTrigger>
      </div>

      {meeting.candidates.length > RECOMMENDED_CANDIDATE_COUNT ? (
        <p className="time-picker__guidance" role="status">
          후보가 많으면 참석자가 답하는 데 시간이 더 걸릴 수 있어요.
        </p>
      ) : null}

      {movingCandidateId != null ? (
        <div className="candidate-move-banner" role="status">
          <div>
            <strong>시간을 옮길 곳을 선택하세요</strong>
            <span>선택한 위치가 새 시작 시각이 되고, Esc를 누르면 취소됩니다.</span>
          </div>
          <button type="button" onClick={cancelMovingCandidate}>
            취소
          </button>
        </div>
      ) : null}

      {isMobile ? (
        <div className="mobile-time-picker">
          <div className="mobile-date-strip" aria-label="날짜 선택">
            {displayDays.map((date) => {
              const isSelectedDate = date.compare(activeDate) === 0
              const isDisabled = isOutsideWindow(date)
              const candidateCount = countCandidatesForDate(date)

              return (
                <button
                  key={date.toString()}
                  className={isSelectedDate ? 'is-selected' : ''}
                  type="button"
                  aria-pressed={isSelectedDate}
                  aria-label={`${koreanDateFormatter.format(toLocalDate(date))}${candidateCount > 0 ? `, 후보 ${candidateCount}개` : ''}`}
                  disabled={isDisabled}
                  onClick={() => setSelectedDate(date)}
                >
                  <span>{koreanWeekdayFormatter.format(toLocalDate(date))}</span>
                  <strong>{date.day}</strong>
                  {candidateCount > 0 ? <small>{candidateCount}</small> : null}
                </button>
              )
            })}
          </div>

          <section className="mobile-time-slots" aria-labelledby="mobile-time-slot-title">
            <h2 id="mobile-time-slot-title">
              {koreanDateFormatter.format(toLocalDate(activeDate))}
            </h2>
            <div className="mobile-time-slot-list">
              {TIME_SLOT_MINUTES.map((startMinutes) => {
                const candidate = candidateFor(activeDate, startMinutes)
                const isSelected = candidate != null
                const overlappingCandidate = isSelected
                  ? undefined
                  : overlappingCandidateFor(activeDate, startMinutes)
                const isOverlapBlocked = overlappingCandidate != null
                const isDisabled = !candidateFitsGrid(startMinutes)

                return (
                  <button
                    key={startMinutes}
                    className={[
                      isSelected ? 'is-selected' : '',
                      isOverlapBlocked ? 'is-overlap-blocked' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    type="button"
                    aria-pressed={isSelected}
                    aria-disabled={isOverlapBlocked || undefined}
                    disabled={isDisabled}
                    title={
                      overlappingCandidate == null
                        ? undefined
                        : `${formatCandidateTime(overlappingCandidate)} 후보와 겹쳐요`
                    }
                    onClick={() => {
                      if (!isOverlapBlocked) {
                        chooseCandidateSlot(activeDate, startMinutes)
                      }
                    }}
                  >
                    <span>
                      {formatTimeOfDay(startMinutes)} -{' '}
                      {formatTimeOfDay(startMinutes + meeting.durationMinutes)}
                      {overlappingCandidate != null ? (
                        <small>{formatCandidateTime(overlappingCandidate)} 후보와 겹쳐요</small>
                      ) : null}
                    </span>
                    {isSelected ? <Check size={18} strokeWidth={3} /> : null}
                  </button>
                )
              })}
            </div>
          </section>

          {renderSelectedCandidates('selected-candidates--mobile')}
        </div>
      ) : (
        <div className="time-picker__workspace">
          <div
            ref={gridRef}
            className="week-time-grid"
            role="grid"
            aria-label={`${weekLabel} 후보 시간 선택`}
            aria-colcount={8}
            aria-rowcount={TIME_SLOT_MINUTES.length + trailingTimeSlots.length + 1}
            onMouseLeave={() => {
              if (movingCandidateId == null) {
                setPreviewSlot(null)
              }
            }}
            onBlur={(event) => {
              if (
                movingCandidateId == null &&
                !event.currentTarget.contains(event.relatedTarget as Node)
              ) {
                setPreviewSlot(null)
              }
            }}
          >
            <div className="week-time-grid__header" role="row">
              <span aria-hidden="true" />
              {displayDays.map((date) => {
                const isSelectedDate = date.compare(activeDate) === 0
                const candidateCount = countCandidatesForDate(date)

                return (
                  <div
                    key={date.toString()}
                    className={isSelectedDate ? 'is-active' : ''}
                    role="columnheader"
                  >
                    <span>{koreanWeekdayFormatter.format(toLocalDate(date))}</span>
                    <strong>{date.day}</strong>
                    {candidateCount > 0 ? <small>{candidateCount}</small> : null}
                  </div>
                )
              })}
            </div>

            {TIME_SLOT_MINUTES.map((startMinutes, timeIndex) => (
              <div className="week-time-grid__row" role="row" key={startMinutes}>
                <span role="rowheader">{formatTimeOfDay(startMinutes)}</span>
                {displayDays.map((date, dayIndex) => {
                  const candidate = candidateOccupyingSlot(date, startMinutes)
                  const isSelected = candidate != null
                  const previewStartsHere = isPreviewStart(date, startMinutes)
                  const candidateStart = candidate == null ? null : new Date(candidate.startAt)
                  const candidateEnd = candidate == null ? null : new Date(candidate.endAt)
                  const slotStart = toLocalDate(date, startMinutes)
                  const slotEnd = toLocalDate(date, startMinutes + TIME_QUANTUM_MINUTES)
                  const isBlockStart = candidateStart?.getTime() === slotStart.getTime()
                  const isBlockEnd = candidateEnd != null && slotEnd.getTime() >= candidateEnd.getTime()
                  const overlappingCandidate = isSelected
                    ? undefined
                    : overlappingCandidateFor(date, startMinutes)
                  const isOverlapBlocked = overlappingCandidate != null
                  const isDisabled =
                    isOutsideWindow(date) || !candidateFitsGrid(startMinutes)
                  const fullDate = koreanDateFormatter.format(toLocalDate(date))
                  const className = [
                    isSelected ? 'is-selected' : '',
                    isSelected && isBlockStart ? 'is-block-start' : '',
                    isSelected && !isBlockStart && !isBlockEnd ? 'is-block-middle' : '',
                    isSelected && isBlockEnd ? 'is-block-end' : '',
                    previewStartsHere ? 'is-preview-start' : '',
                    isOverlapBlocked ? 'is-overlap-blocked' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                  const selectedRange =
                    candidate == null
                      ? ''
                      : `, ${formatTimeOfDay(candidateStart!.getHours() * 60 + candidateStart!.getMinutes())}부터 ${formatTimeOfDay(candidateEnd!.getHours() * 60 + candidateEnd!.getMinutes())}까지 선택된 후보에 포함됨`
                  const blockStyle = isBlockStart || previewStartsHere
                    ? ({
                        '--candidate-slot-count':
                          meeting.durationMinutes / TIME_QUANTUM_MINUTES,
                      } as CSSProperties)
                    : undefined

                  return (
                    <div role="gridcell" key={`${date.toString()}-${startMinutes}`}>
                      <button
                        className={className}
                        style={blockStyle}
                        type="button"
                        data-grid-index={`${timeIndex}-${dayIndex}`}
                        tabIndex={
                          focusedSlot.dayIndex === dayIndex && focusedSlot.timeIndex === timeIndex
                            ? 0
                            : -1
                        }
                        aria-label={`${fullDate} ${formatTimeOfDay(startMinutes)}${selectedRange || `부터 ${formatTimeOfDay(startMinutes + meeting.durationMinutes)}까지`}${isSelected ? ', 눌러서 시간 변경 또는 삭제' : ''}${overlappingCandidate != null ? `, ${formatCandidateTime(overlappingCandidate)} 후보와 겹쳐 선택할 수 없음` : ''}`}
                        aria-pressed={isSelected}
                        aria-disabled={isOverlapBlocked || undefined}
                        disabled={isDisabled}
                        title={
                          overlappingCandidate == null
                            ? undefined
                            : `${formatCandidateTime(overlappingCandidate)} 후보와 겹쳐요`
                        }
                        onFocus={() => {
                          setFocusedSlot({ dayIndex, timeIndex })
                          if (!isSelected && !isDisabled && !isOverlapBlocked) {
                            previewCandidate(date, startMinutes)
                          } else {
                            setPreviewSlot(null)
                          }
                        }}
                        onMouseEnter={() => {
                          if (!isSelected && !isDisabled && !isOverlapBlocked) {
                            previewCandidate(date, startMinutes)
                          } else {
                            setPreviewSlot(null)
                          }
                        }}
                        onKeyDown={(event) => handleGridKeyDown(event, dayIndex, timeIndex)}
                        onClick={() => chooseCandidateSlot(date, startMinutes)}
                      >
                        {isBlockStart ? (
                          <span className="candidate-block-content">
                            <Check size={18} strokeWidth={3} />
                          </span>
                        ) : null}
                        {isOverlapBlocked ? (
                          <span className="candidate-overlap-label">겹침</span>
                        ) : null}
                      </button>
                      {isBlockStart && candidate != null ? (
                        <div className="candidate-block-remove">
                          <button
                            type="button"
                            aria-label={`${formatCandidateTime(candidate)} 후보 삭제`}
                            title="후보 시간 삭제"
                            onClick={(event) => {
                              event.stopPropagation()
                              removeCandidate(candidate.id)
                            }}
                          >
                            <X aria-hidden="true" size={13} strokeWidth={2.5} />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ))}

            {trailingTimeSlots.map((startMinutes) => (
              <div
                className="week-time-grid__row week-time-grid__row--tail"
                role="row"
                key={`tail-${startMinutes}`}
              >
                <span role="rowheader">{formatTimeOfDay(startMinutes)}</span>
                {displayDays.map((date) => (
                  <div
                    aria-hidden="true"
                    role="gridcell"
                    key={`tail-${date.toString()}-${startMinutes}`}
                  />
                ))}
              </div>
            ))}
          </div>

          {renderSelectedCandidates('selected-candidates--desktop')}
        </div>
      )}

      {removedCandidate != null ? (
        <div className="candidate-undo" role="status" aria-live="polite">
          <span>{formatCandidateTime(removedCandidate)} 후보를 삭제했어요.</span>
          <button type="button" onClick={undoRemoveCandidate}>
            실행 취소
          </button>
        </div>
      ) : null}
    </div>
  )
}

function CreateScreen({
  meeting,
  onTitleChange,
  onHostLabelChange,
  onPurposeChange,
  onReferenceMaterialChange,
  onSchedulingWindowChange,
  onDurationChange,
  onResponseDeadlineChange,
  onAttendanceModeChange,
  onMinAttendeeCountChange,
  onParticipantRoleChange,
  onParticipantAdd,
  onParticipantRemove,
  onCandidatesChange,
  onAvailabilityWindowsChange,
  onCreateLink,
}: {
  meeting: Meeting
  onTitleChange: (title: string) => void
  onHostLabelChange: (hostLabel: string) => void
  onPurposeChange: (purpose: string) => void
  onReferenceMaterialChange: (referenceMaterial: string) => void
  onSchedulingWindowChange: (schedulingWindow: SchedulingWindow) => void
  onDurationChange: (durationMinutes: MeetingDuration | null) => void
  onResponseDeadlineChange: (responseDeadline: string) => void
  onAttendanceModeChange: (mode: AttendeeDecisionMode) => void
  onMinAttendeeCountChange: (count: number) => void
  onParticipantRoleChange: (participantId: string, role: ParticipantRole) => void
  onParticipantAdd: (name?: string) => void
  onParticipantRemove: (participantId: string) => void
  onCandidatesChange: (candidates: Candidate[]) => void
  onAvailabilityWindowsChange: (windows: AvailabilityWindow[]) => void
  onCreateLink: () => void
}) {
  const [createNow] = useState(() => new Date())
  const [step, setStep] = useState<HostCreateStep>('meeting')
  const [timeStep, setTimeStep] = useState<TimeCreateStep>('constraints')
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
  const selectedTimeLabels = meeting.availabilityWindows.map(formatAvailabilityWindow)
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
  const attendeeDecisionLabel =
    attendeeDecisionOptions.find((option) => option.id === attendeeDecisionMode)?.label ?? ''
  const isMeetingComplete =
    meeting.title.trim() !== '' && meetingPurpose !== '' && meeting.hostLabel.trim() !== ''
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
  const earliestAvailabilityStart = getEarliestAvailabilityStart(
    meeting.availabilityWindows,
  )
  const responseDeadlineTime = new Date(meeting.responseDeadline).getTime()
  const isResponseDeadlineValid =
    earliestAvailabilityStart != null &&
    !Number.isNaN(responseDeadlineTime) &&
    responseDeadlineTime > createNow.getTime() &&
    responseDeadlineTime < earliestAvailabilityStart.getTime()
  const isRequiredSelectionMissing =
    attendeeDecisionMode === 'required' && requiredParticipants.length === 0
  const minimumAllowedAttendees = Math.max(1, requiredParticipants.length + 1)
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
              ? meeting.availabilityWindows.length > 0
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
              ? meeting.availabilityWindows.length > 0
                ? '시간대 선택 완료'
                : '가능한 시간대를 선택해 주세요'
              : '요청 내용 확인하기'
          : '응답 링크 만들기'
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
      onCreateLink()
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

      const candidatesInWindow = meeting.candidates
        .filter((candidate) => candidateIsWithinWindow(candidate, meeting.schedulingWindow))

      onCandidatesChange(candidatesInWindow)
      setTimeStep('candidates')
      return
    }

    if (step === 'times' && timeStep === 'candidates') {
      if (!isResponseDeadlineValid) {
        const suggestedDeadline = suggestResponseDeadline(meeting.availabilityWindows)

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
                회의 이름 <strong className="required-chip">필수</strong>
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
                이 회의에서 정할 일 <strong className="required-chip">필수</strong>
              </span>
              <textarea
                value={meeting.purpose}
                rows={3}
                maxLength={120}
                placeholder="예: 출시 전 리뷰 안건을 확인하고 최종 수정 범위를 정합니다."
                onChange={(event) => onPurposeChange(event.target.value)}
              />
              <em>참석자가 일정 우선순위를 판단할 수 있을 만큼만 짧게 적어주세요.</em>
            </label>

            <label className="field create-host-field">
              <span>
                요청자 또는 팀 <strong className="required-chip">필수</strong>
              </span>
              <input
                value={meeting.hostLabel}
                placeholder="예: 제품팀 민지"
                onChange={(event) => onHostLabelChange(event.target.value)}
              />
            </label>

            <section className="reference-source-panel" aria-label="관련 자료">
              <div>
                <strong>참고 출처</strong>
                <span>문서명이나 링크가 있을 때만 선택해서 추가하세요.</span>
              </div>
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
                <label className="field create-reference-field">
                  <span>문서명 또는 링크</span>
                  <textarea
                    value={meeting.referenceMaterial ?? ''}
                    rows={2}
                    maxLength={100}
                    placeholder="예: 제품 리뷰 문서, 디자인 시안, QA 리포트"
                    onChange={(event) => onReferenceMaterialChange(event.target.value)}
                  />
                  <em>응답 전에 반드시 읽어야 하는 자료처럼 보이지 않게 낮은 위계로 보여줍니다.</em>
                </label>
              ) : null}
              {referenceItems.length === 0 && !isReferenceOpen ? (
                <button
                  className="add-reference-button"
                  type="button"
                  onClick={() => setIsReferenceOpen(true)}
                >
                  참고 출처 추가
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

                      {requiredParticipants.length > 0 ? (
                        <section className="minimum-attendance" aria-labelledby="minimum-attendance-title">
                          <div>
                            <strong id="minimum-attendance-title">몇 명이 모이면 진행할까요?</strong>
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
                회의를 잡아도 되는 시간대를 알려주세요
              </h2>
              <p>정확한 시작 시각은 나중에 계산해요. 가능한 범위를 넓게 선택해 주세요.</p>
            </header>
            {meetingWithDuration != null ? (
              <AvailabilityWindowPicker
                meeting={meetingWithDuration}
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
                {meeting.availabilityWindows.length}개 ·{' '}
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
              <em>
                첫 조율 시간대: {formatAvailabilityStart(earliestAvailabilityStart)}
              </em>
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
        <SummaryLine label="회의" value={meeting.title} />
        <div className="meeting-overview-card">
          <SummaryLine label="요청자" value={meeting.hostLabel} />
          <SummaryLine label="한 문장 요약" value={meetingPurpose} />
          {referenceMaterial ? <SummaryLine label="참고 출처" value={referenceMaterial} /> : null}
        </div>
        <SummaryLine label="참석 예정" value={`주최자 포함 ${invitedParticipants.length + 1}명`} />
        <SummaryLine label="시간 선택 기준" value={attendeeDecisionLabel} />
        {attendeeDecisionMode === 'required' && requiredParticipants.length > 0 ? (
          <SummaryLine
            label="꼭 필요한 응답"
            value={requiredParticipants.map((participant) => participant.name).join(', ')}
          />
        ) : null}
        <SummaryLine
          label="진행 기준"
          value={
            attendeeDecisionMode === 'everyone'
              ? `주최자 포함 ${maximumAttendees}명 모두`
              : `주최자 포함 최소 ${meeting.minAttendeeCount}명`
          }
        />
        <SummaryLine
          label="회의 가능 기간"
          value={formatSchedulingWindow(meeting.schedulingWindow)}
        />
        <SummaryLine label="회의 길이" value={formatMeetingDuration(meeting.durationMinutes)} />
        <SummaryLine label="조율 가능 시간대" value={`${selectedTimeLabels.length}개`} />
        <SummaryLine label="응답 마감" value={formatDeadline(meeting.responseDeadline)} />
        <div className="create-review-participants">
          {invitedParticipants.map((participant) => (
            <span key={participant.id}>{participant.name}</span>
          ))}
        </div>
        <div className="create-review-list">
          {meeting.availabilityWindows.map((window, index) => (
            <AvailabilityWindowMiniRow
              key={window.id}
              window={window}
              index={index + 1}
            />
          ))}
        </div>
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
              <button className="create-back-button" type="button" onClick={goToPreviousStep}>
                이전
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
          <header className="create-task__header">
            <h1 id={`create-task-${activeCreateStep.id}`} tabIndex={-1}>
              {activeCreateStep.title}
            </h1>
            <p>{activeCreateStep.description}</p>
          </header>

          <div className="create-task__surface">
            <div className="create-phase-body">{renderCreateStepBody()}</div>
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

function ParticipantShell({
  meeting,
  participant,
  state,
  latestAddedCandidateId,
  onResponseChange,
  onPreferenceToggle,
  onDone,
  onEdit,
}: {
  meeting: Meeting
  participant: Participant
  state: ParticipantCoordinationState
  latestAddedCandidateId?: string
  onResponseChange: (participantId: string, candidateId: string, value: ResponseValue) => void
  onPreferenceToggle: (
    participantId: string,
    candidateId: string,
    tag: ResponsePreferenceTag,
  ) => void
  onDone: () => void
  onEdit: () => void
}) {
  if (state === 'PARTICIPANT_DONE') {
    return <ParticipantDoneScreen meeting={meeting} participant={participant} onEdit={onEdit} />
  }

  const addedCandidates = meeting.candidates.filter(
    (candidate) => candidate.candidateRound === 2 || candidate.id === latestAddedCandidateId,
  )
  const visibleCandidates =
    state === 'PARTICIPANT_ADDED_ONLY' && addedCandidates.length > 0
      ? addedCandidates
      : meeting.candidates
  const candidateDateGroups = groupCandidatesByDate(visibleCandidates)
  const answeredCount = visibleCandidates.filter((candidate) =>
    meeting.responses.some(
      (response) =>
        response.participantId === participant.id && response.candidateId === candidate.id,
    ),
  ).length
  const remainingCount = visibleCandidates.length - answeredCount
  const referenceMaterial = meeting.referenceMaterial?.trim()
  const participantResponseByCandidateId = new Map(
    meeting.responses
      .filter((response) => response.participantId === participant.id)
      .map((response) => [response.candidateId, response]),
  )

  return (
    <div className="respond-app">
      <header className="respond-header">
        <div className="respond-brand">
          <span className="brand-dot" />
          <strong>Meeting Cue</strong>
        </div>
      </header>

      <main className="respond-main">
        <section className="respond-hero" aria-label="응답 안내">
          <div>
            <span className="respond-eyebrow">{meeting.title}</span>
            <h1>{getParticipantTitle(state, participant)}</h1>
            <div className="respond-meeting-overview">
              <span>{meeting.hostLabel}이 보낸 요청입니다.</span>
              <strong>{meeting.purpose}</strong>
              {referenceMaterial ? <small>참고 출처: {referenceMaterial}</small> : null}
            </div>
          </div>
          <div className="respond-status-card">
            <span>응답 마감</span>
            <strong>{formatDeadline(meeting.responseDeadline)}</strong>
            <small>
              {remainingCount === 0
                ? '응답을 저장할 수 있어요'
                : `${remainingCount}개 시간만 더 답하면 돼요.`}
            </small>
          </div>
        </section>

        {state === 'PARTICIPANT_ADDED_ONLY' ? (
          <section className="participant-notice">
            <strong>기존 응답은 유지돼요.</strong>
            <span>새로 추가된 시간만 확인해 주세요.</span>
          </section>
        ) : null}

        {state === 'PARTICIPANT_EDITING' ? (
          <section className="participant-notice">
            <strong>이전에 고른 응답이에요.</strong>
            <span>마감 전까지 같은 링크에서 수정할 수 있어요.</span>
          </section>
        ) : null}

        <section className="respond-progress" aria-label="응답 진행 상황">
          <div>
            <span>응답한 시간</span>
            <strong>
              {answeredCount}/{visibleCandidates.length}개
            </strong>
          </div>
          <div>
            <span>회의 길이</span>
            <strong>{formatMeetingDuration(meeting.durationMinutes)}</strong>
          </div>
          <div>
            <span>수정</span>
            <strong>마감 전 가능</strong>
          </div>
        </section>

        <section className="response-panel response-panel--participant" aria-label="후보 시간 응답">
          <header className="response-guide">
            <strong>시간마다 하나씩 선택해 주세요</strong>
            <span>‘내 일정 조정’은 앞뒤 일정을 바꿔야 참석할 수 있다는 뜻이에요.</span>
          </header>
          <div className="response-list">
            {candidateDateGroups.map((group) => (
              <section className="response-date-group" key={group.key} aria-labelledby={`date-${group.key}`}>
                <header className="response-date-header">
                  <CalendarDays size={18} aria-hidden="true" />
                  <time id={`date-${group.key}`} dateTime={group.key}>
                    {participantDateHeadingFormatter.format(group.date)}
                  </time>
                  {group.candidates.length > 1 ? (
                    <span>{group.candidates.length}개 시간</span>
                  ) : null}
                </header>

                <div className="response-date-candidates">
                  {group.candidates.map((candidate) => {
                    const currentResponse = participantResponseByCandidateId.get(candidate.id)
                    const currentValue = currentResponse?.value
                    const currentPreferenceTags = currentResponse?.preferenceTags ?? []

                    return (
                      <div className="response-card" key={candidate.id}>
                        <div className="response-card__head">
                          <strong>{formatCandidateClockRange(candidate)}</strong>
                          {candidate.candidateRound === 2 ? (
                            <span className="new-chip">새 시간</span>
                          ) : null}
                        </div>
                        <div className="response-options">
                          {responseOptions.map((value) => (
                            <button
                              key={value}
                              className={`response-option${
                                currentValue === value ? ' is-selected' : ''
                              }`}
                              type="button"
                              aria-label={`${participantResponseLabels[value]}. ${responseValueDescriptions[value]}`}
                              aria-pressed={currentValue === value}
                              onClick={() => onResponseChange(participant.id, candidate.id, value)}
                            >
                              <strong>{participantResponseLabels[value]}</strong>
                              {currentValue === value ? <Check size={16} strokeWidth={3} /> : null}
                            </button>
                          ))}
                        </div>
                        {currentValue != null && currentValue !== 'unavailable' ? (
                          <details
                            className="response-preferences"
                            open={currentPreferenceTags.length > 0 || undefined}
                          >
                            <summary>
                              <ChevronRight size={16} aria-hidden="true" />
                              <span>
                                {currentPreferenceTags.length > 0
                                  ? `선호 조건 ${currentPreferenceTags.length}개`
                                  : '선호 조건 추가'}
                              </span>
                            </summary>
                            <div>
                              {responsePreferenceTags.map((tag) => {
                                const isSelected = currentPreferenceTags.includes(tag)

                                return (
                                  <button
                                    key={tag}
                                    className={isSelected ? 'is-selected' : ''}
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() =>
                                      onPreferenceToggle(participant.id, candidate.id, tag)
                                    }
                                  >
                                    {responsePreferenceTagLabels[tag]}
                                  </button>
                                )
                              })}
                            </div>
                          </details>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
          <button
            className="primary-button response-submit"
            type="button"
            disabled={remainingCount > 0}
            onClick={onDone}
          >
            {state === 'PARTICIPANT_EDITING' ? '수정한 응답 저장하기' : '응답 저장하기'}
          </button>
        </section>
      </main>
    </div>
  )
}

function ParticipantDoneScreen({
  meeting,
  participant,
  onEdit,
}: {
  meeting: Meeting
  participant: Participant
  onEdit: () => void
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
          <span className="brand-dot" />
          <strong>Meeting Cue</strong>
        </div>
      </header>
      <main className="respond-main">
        <section className="soft-panel participant-done">
          <span className="status-label status-label--success">응답 저장 완료</span>
          <h1>
            {hasAttendableCandidate
              ? `${participant.name}님의 응답을 저장했어요`
              : '가능한 후보가 없다고 전달했어요'}
          </h1>
          <p>
            {hasAttendableCandidate
              ? `${meeting.title} 일정은 주최자가 응답을 확인한 뒤 확정해요. 마감 전까지 같은 링크에서 응답을 수정할 수 있어요.`
              : '주최자가 새 시간을 추가하면 같은 링크에서 추가된 시간만 확인할 수 있어요.'}
          </p>
          <button className="secondary-button" type="button" onClick={onEdit}>
            응답 수정하기
          </button>
        </section>
      </main>
    </div>
  )
}

function MessageScreen({
  meeting,
  evaluation,
  onBack,
  onCopy,
}: {
  meeting: Meeting
  evaluation: CandidateEvaluation
  onBack: () => void
  onCopy: (message: string) => void
}) {
  const message = generateConfirmationMessage(meeting, evaluation)

  return (
    <div className="message-workspace">
      <section className="soft-panel message-panel">
        <span className="status-label status-label--success">확정 완료</span>
        <h2>{formatCandidateTime(evaluation.candidate)}</h2>
        <p>아래 문구를 복사해서 참석자에게 공유하세요. 자동으로 전송되지는 않아요.</p>
        <pre>{message}</pre>
        <div className="button-row">
          <button className="primary-button" type="button" onClick={() => onCopy(message)}>
            확정 문구 복사하기
          </button>
          <button className="secondary-button" type="button" onClick={onBack}>
            회의 상태로 돌아가기
          </button>
        </div>
      </section>
    </div>
  )
}

function PanelTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="panel-title">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
    </div>
  )
}

function CandidateMiniRow({
  label,
  index,
  durationMinutes,
}: {
  label: string
  index: number
  durationMinutes: MeetingDuration | null
}) {
  return (
    <div className="mini-row">
      <span>{index}</span>
      <strong>{label}</strong>
      <small>{formatMeetingDuration(durationMinutes)}</small>
    </div>
  )
}

function AvailabilityWindowMiniRow({
  window,
  index,
}: {
  window: AvailabilityWindow
  index: number
}) {
  const minutes = Math.round(
    (new Date(window.endAt).getTime() - new Date(window.startAt).getTime()) / 60_000,
  )

  return (
    <div className="mini-row">
      <span>{index}</span>
      <strong>{formatAvailabilityWindow(window)}</strong>
      <small>{formatMeetingDuration(minutes)} 범위</small>
    </div>
  )
}

function MetricInline({ label, value }: { label: string; value: string }) {
  return (
    <span className="metric-inline">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ResponseBadge({
  value,
  isImplicitHostAvailable = false,
}: {
  value?: ResponseValue
  isImplicitHostAvailable?: boolean
}) {
  if (isImplicitHostAvailable) {
    return <span className="response-badge response-badge--available">주최자 가능</span>
  }

  if (value == null) {
    return <span className="response-badge response-badge--missing">미응답</span>
  }

  const tone =
    value === 'available' ? 'available' : value === 'adjustable' ? 'adjustable' : 'unavailable'

  return (
    <span className={`response-badge response-badge--${tone}`}>{responseValueLabels[value]}</span>
  )
}

function ConditionRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="condition-row">
      <span>{label}</span>
      <strong>{value}</strong>
      <span className={`condition-mark${ok ? ' is-ok' : ''}`}>{ok ? '충족' : '확인'}</span>
    </div>
  )
}

function getHostCoordinationState(
  meeting: Meeting,
  evaluations: CandidateEvaluation[],
  route: AppRoute,
): HostCoordinationState {
  if (route === 'create') return 'HOST_DRAFT'
  if (route === 'share') return 'HOST_SHARE_READY'
  if (route === 'message' || meeting.status === 'confirmed') return 'HOST_CONFIRMED'
  if (route === 'recover') return 'HOST_RECOVERY_REQUIRED'

  const completedCount = meeting.participants.filter(
    (participant) =>
      participant.id !== meeting.hostId && participant.responseStatus === 'completed',
  ).length

  if (completedCount === 0) return 'HOST_WAITING_EMPTY'
  if (evaluations.some((evaluation) => evaluation.status === 'confirmable')) {
    return 'HOST_DECISION_READY'
  }
  if (evaluations.some((evaluation) => evaluation.status === 'needs_adjustment')) {
    return 'HOST_REVIEW_NEEDED'
  }
  if (evaluations.some((evaluation) => evaluation.status === 'waiting_required')) {
    return 'HOST_WAITING_PARTIAL'
  }

  return 'HOST_RECOVERY_REQUIRED'
}

function getParticipantState(
  route: AppRoute,
  participant: Participant,
  latestAddedCandidateId?: string,
): ParticipantCoordinationState {
  if (route === 'invite-done') return 'PARTICIPANT_DONE'
  if (route === 'invite-added' || latestAddedCandidateId != null) return 'PARTICIPANT_ADDED_ONLY'
  if (route === 'invite-edit' || participant.responseStatus === 'completed') {
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
    evaluations.find((evaluation) => evaluation.status === 'confirmable') ??
    evaluations.find((evaluation) => evaluation.status === 'needs_adjustment') ??
    evaluations[0]
  )
}

function isWaitingState(state: HostCoordinationState) {
  return state === 'HOST_WAITING_EMPTY' || state === 'HOST_WAITING_PARTIAL'
}

function isDecisionState(state: HostCoordinationState) {
  return state === 'HOST_DECISION_READY' || state === 'HOST_REVIEW_NEEDED'
}

function getHostNavigationItems(route: AppRoute, state: HostCoordinationState) {
  if (route === 'create') {
    return []
  }

  if (route === 'share') {
    return [
      { route: 'create' as const, label: '요청 내용 수정' },
      { route: 'host' as const, label: '응답 모였는지 보기' },
    ]
  }

  if (route === 'recover') {
    return [
      { route: 'host' as const, label: '응답 상태로 돌아가기' },
      { route: 'share' as const, label: '응답 링크 보기' },
    ]
  }

  if (route === 'message') {
    return [{ route: 'host' as const, label: '회의 상태 보기' }]
  }

  const items: Array<{ route: AppRoute; label: string }> = [
    { route: 'share', label: '응답 링크 보기' },
  ]

  if (state === 'HOST_REVIEW_NEEDED' || state === 'HOST_RECOVERY_REQUIRED') {
    items.push({ route: 'recover', label: '새 시간 물어보기' })
  }

  return items
}

function getHostStateLabel(state: HostCoordinationState) {
  if (state === 'HOST_DRAFT') return '요청 작성'
  if (state === 'HOST_SHARE_READY') return '공유 가능'
  if (state === 'HOST_WAITING_EMPTY') return '응답 전'
  if (state === 'HOST_WAITING_PARTIAL') return '응답 대기'
  if (state === 'HOST_DECISION_READY') return '확정 가능'
  if (state === 'HOST_REVIEW_NEEDED') return '확인 필요'
  if (state === 'HOST_CONFIRMED') return '확정 완료'
  return '조율 회복'
}

function getHostStateTone(state: HostCoordinationState) {
  if (state === 'HOST_DECISION_READY' || state === 'HOST_CONFIRMED') return 'success'
  if (state === 'HOST_REVIEW_NEEDED') return 'warning'
  if (state === 'HOST_RECOVERY_REQUIRED') return 'danger'
  return 'info'
}

function getStatusTone(status: CandidateStatus) {
  if (status === 'confirmable') return 'success'
  if (status === 'needs_adjustment') return 'warning'
  if (status === 'waiting_required') return 'info'
  return 'danger'
}

function getParticipantTitle(state: ParticipantCoordinationState, participant: Participant) {
  if (state === 'PARTICIPANT_EDITING') {
    return `${participant.name}님, 이전 응답을 수정할 수 있어요`
  }
  if (state === 'PARTICIPANT_ADDED_ONLY') {
    return `${participant.name}님, 새로 추가된 시간만 확인해 주세요`
  }
  return `${participant.name}님, 참석 가능 여부를 알려주세요`
}

export default App
