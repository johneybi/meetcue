export type ParticipantRole = 'required' | 'optional'

export type ResponseValue = 'available' | 'adjustable' | 'unavailable'

export type ResponsePreferenceTag = 'avoid_if_possible'

export type CandidateStatus = 'ready' | 'pending' | 'impossible'

export type ParticipantResponseStatus = 'not_started' | 'draft' | 'submitted'

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

export type ResponseUpdateSource = 'initial' | 'participant_edit'

export type ChangeLogType = 'response_updated' | 'request_copied'

export type MeetingStatus = 'draft' | 'collecting' | 'confirmed'

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
  state: ResponseValue
  avoidPreferred?: boolean
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
  required: '필수 참석자',
  optional: '참석 권장',
}

export const responseValueLabels: Record<ResponseValue, string> = {
  available: '가능해요',
  adjustable: '조정하면 가능해요',
  unavailable: '참석하기 어려워요',
}

export const responseValueDescriptions: Record<ResponseValue, string> = {
  available: '현재 일정을 바꾸지 않고 참석할 수 있어요.',
  adjustable: '이 시간으로 정해지면 다른 일정을 옮겨 참석해요.',
  unavailable: '이 시간에는 참석하기 어려워요.',
}

export const responsePreferenceTagLabels: Record<ResponsePreferenceTag, string> = {
  avoid_if_possible: '가급적 피하고 싶어요',
}

export const candidateStatusLabels: Record<CandidateStatus, string> = {
  ready: '지금 정할 수 있어요',
  pending: '응답이 더 필요해요',
  impossible: '다른 시간을 찾아야 해요',
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
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    month: 'numeric',
    day: 'numeric',
  }).format(start)
  const startTime = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(start)
  const endTime = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(end)

  return `${day} ${startTime}-${endTime}`
}

export function formatDeadline(deadline: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
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
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
  }).format(start)
  const endLabel = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
  }).format(end)

  return `${startLabel} - ${endLabel}`
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}
