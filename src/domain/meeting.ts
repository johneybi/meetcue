export type ParticipantRole = 'required' | 'optional'

export type ResponseValue = 'available' | 'adjustable' | 'unavailable'

export type ResponsePreferenceTag =
  | 'avoid_if_possible'
  | 'after_lunch'
  | 'tight_schedule'
  | 'travel'

export type CandidateStatus = 'confirmable' | 'needs_adjustment' | 'waiting_required' | 'excluded'

export type CandidateSetStatus =
  'has_confirmable' | 'exploration_recommended' | 'exploration_required'

export type ParticipantResponseStatus = 'pending' | 'completed'

export type MeetingPreset = 'all_hands' | 'core_attendees' | 'quorum'

export type MeetingDuration = number

export type MeetingWorkContext =
  | 'product_review'
  | 'release_prep'
  | 'issue_resolution'
  | 'direction_decision'
  | 'status_sync'
  | 'custom'

export type MeetingIntent = 'decide' | 'review' | 'align' | 'unblock' | 'next_actions'

export type ResponseUpdateSource = 'initial' | 'participant_edit' | 'candidate_added'

export type ChangeLogType = 'response_updated' | 'candidate_added' | 'request_copied'

export type MeetingStatus =
  'draft' | 'collecting' | 'confirmable' | 'confirmed' | 'needs_exploration'

export interface Meeting {
  id: string
  title: string
  durationMinutes: MeetingDuration | null
  schedulingWindow: SchedulingWindow
  hostId: string
  preset: MeetingPreset
  responseDeadline: string
  minAttendeeCount: number
  status: MeetingStatus
  confirmedCandidateId?: string
  workContext: MeetingWorkContext
  intent: MeetingIntent
  hostLabel: string
  purpose: string
  referenceMaterial?: string
  participants: Participant[]
  availabilityWindows: AvailabilityWindow[]
  candidates: Candidate[]
  responses: Response[]
  changeLogs: ChangeLog[]
}

export interface AvailabilityWindow {
  id: string
  meetingId: string
  ownerId: string
  startAt: string
  endAt: string
  state: 'available' | 'adjustable'
}

export interface SchedulingWindow {
  startDate: string
  endDate: string
}

export interface Participant {
  id: string
  meetingId: string
  name: string
  role: ParticipantRole
  responseToken: string
  responseStatus: ParticipantResponseStatus
}

export interface Candidate {
  id: string
  meetingId: string
  startAt: string
  endAt: string
  candidateRound?: number
  addedAt?: string
  addedByHost?: boolean
}

export interface Response {
  id: string
  participantId: string
  candidateId: string
  value: ResponseValue
  preferenceTags?: ResponsePreferenceTag[]
  updatedAt: string
  updateSource: ResponseUpdateSource
}

export interface ChangeLog {
  id: string
  meetingId: string
  type: ChangeLogType
  description: string
  createdAt: string
  candidateId?: string
  participantId?: string
}

export const participantRoleLabels: Record<ParticipantRole, string> = {
  required: '꼭 필요',
  optional: '참석 권장',
}

export const responseValueLabels: Record<ResponseValue, string> = {
  available: '가능해요',
  adjustable: '일정 조정하면 가능해요',
  unavailable: '어려워요',
}

export const responseValueDescriptions: Record<ResponseValue, string> = {
  available: '이 시간에 참석할 수 있어요.',
  adjustable: '앞뒤 일정을 조금 바꾸면 참석할 수 있어요.',
  unavailable: '외근, 다른 회의, 개인 일정 때문에 참석하기 어려워요.',
}

export const responsePreferenceTagLabels: Record<ResponsePreferenceTag, string> = {
  avoid_if_possible: '가급적 피하고 싶어요',
  after_lunch: '점심 직후예요',
  tight_schedule: '앞뒤 일정이 촉박해요',
  travel: '이동이 있어요',
}

export const candidateStatusLabels: Record<CandidateStatus, string> = {
  confirmable: '바로 정할 수 있어요',
  needs_adjustment: '정하기 전에 한 번 확인해 주세요',
  waiting_required: '아직 정하기 어려워요',
  excluded: '이 시간은 어려워요',
}

export const meetingPresetLabels: Record<MeetingPreset, string> = {
  all_hands: '모두 참석해야 해요',
  core_attendees: '꼭 필요한 사람이 있어요',
  quorum: '몇 명 이상이면 진행할 수 있어요',
}

export const meetingWorkContextLabels: Record<MeetingWorkContext, string> = {
  product_review: '제품 리뷰',
  release_prep: '출시 준비',
  issue_resolution: '이슈 해결',
  direction_decision: '방향 결정',
  status_sync: '진행 상황 정리',
  custom: '직접 입력',
}

export const meetingIntentLabels: Record<MeetingIntent, string> = {
  decide: '결정하려고 해요',
  review: '검토하려고 해요',
  align: '맞추려고 해요',
  unblock: '막힌 부분을 풀려고 해요',
  next_actions: '다음 액션을 정하려고 해요',
}

export function isAttendableResponse(value: ResponseValue) {
  return value === 'available' || value === 'adjustable'
}

export function formatCandidateTime(candidate: Candidate) {
  const start = new Date(candidate.startAt)
  const end = new Date(candidate.endAt)
  const day = new Intl.DateTimeFormat('ko-KR', {
    weekday: 'short',
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

export function formatDeadline(deadline: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    weekday: 'short',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(deadline))
}

export function formatMeetingDuration(durationMinutes: MeetingDuration | null) {
  if (durationMinutes == null) {
    return '미정'
  }

  if (durationMinutes < 60) {
    return `${durationMinutes}분`
  }

  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60

  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`
}

export function formatSchedulingWindow(window: SchedulingWindow) {
  const start = parseLocalDate(window.startDate)
  const end = parseLocalDate(window.endDate)
  const startLabel = new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
  }).format(start)
  const endLabel = new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
  }).format(end)

  return `${startLabel} - ${endLabel}`
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}
