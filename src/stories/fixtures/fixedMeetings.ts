import { evaluateCandidates, type CandidateEvaluation } from '../../domain/evaluation.ts'
import type {
  Candidate,
  Meeting,
  Participant,
  Response,
  ResponseValue,
} from '../../domain/meeting.ts'

/**
 * Storybook visual regression and documentation fixture with fixed dates.
 * All timestamps are fixed to the week of September 21-25, 2026 in Asia/Seoul (UTC+09:00).
 */
export const FIXED_NOW = new Date('2026-09-21T09:00:00+09:00')
export const FIXED_DEADLINE_PASSED_NOW = new Date('2026-09-23T09:00:00+09:00')

export const FIXED_PARTICIPANTS: Participant[] = [
  {
    id: 'p-host',
    meetingId: 'meeting-fixed-storybook',
    name: '민지',
    role: 'required',
    responseToken: 'tok-host',
    responseStatus: 'submitted',
  },
  {
    id: 'p-minsu',
    meetingId: 'meeting-fixed-storybook',
    name: '민수',
    role: 'required',
    responseToken: 'tok-minsu',
    responseStatus: 'submitted',
  },
  {
    id: 'p-seoyeon',
    meetingId: 'meeting-fixed-storybook',
    name: '서연',
    role: 'required',
    responseToken: 'tok-seoyeon',
    responseStatus: 'submitted',
  },
  {
    id: 'p-junho',
    meetingId: 'meeting-fixed-storybook',
    name: '준호',
    role: 'optional',
    responseToken: 'tok-junho',
    responseStatus: 'submitted',
  },
  {
    id: 'p-sujin',
    meetingId: 'meeting-fixed-storybook',
    name: '수진',
    role: 'optional',
    responseToken: 'tok-sujin',
    responseStatus: 'not_started',
  },
  {
    id: 'p-hana',
    meetingId: 'meeting-fixed-storybook',
    name: '하나',
    role: 'optional',
    responseToken: 'tok-hana',
    responseStatus: 'submitted',
  },
]

export const FIXED_CANDIDATES: Candidate[] = [
  {
    id: 'c-thu-1500',
    meetingId: 'meeting-fixed-storybook',
    startAt: '2026-09-24T15:00:00+09:00',
    endAt: '2026-09-24T16:00:00+09:00',
  },
  {
    id: 'c-fri-1600',
    meetingId: 'meeting-fixed-storybook',
    startAt: '2026-09-25T16:00:00+09:00',
    endAt: '2026-09-25T17:00:00+09:00',
  },
  {
    id: 'c-fri-1000',
    meetingId: 'meeting-fixed-storybook',
    startAt: '2026-09-25T10:00:00+09:00',
    endAt: '2026-09-25T11:00:00+09:00',
  },
  {
    id: 'c-wed-1400',
    meetingId: 'meeting-fixed-storybook',
    startAt: '2026-09-23T14:00:00+09:00',
    endAt: '2026-09-23T15:00:00+09:00',
  },
  {
    id: 'c-thu-1000',
    meetingId: 'meeting-fixed-storybook',
    startAt: '2026-09-24T10:00:00+09:00',
    endAt: '2026-09-24T11:00:00+09:00',
  },
  {
    id: 'c-thu-1030',
    meetingId: 'meeting-fixed-storybook',
    startAt: '2026-09-24T10:30:00+09:00',
    endAt: '2026-09-24T11:30:00+09:00',
  },
  {
    id: 'c-fri-1400',
    meetingId: 'meeting-fixed-storybook',
    startAt: '2026-09-25T14:00:00+09:00',
    endAt: '2026-09-25T15:00:00+09:00',
  },
  {
    id: 'c-mon-1100',
    meetingId: 'meeting-fixed-storybook',
    startAt: '2026-09-21T11:00:00+09:00',
    endAt: '2026-09-21T12:00:00+09:00',
  },
]

export const FIXED_RESPONSES: Response[] = [
  // c-thu-1500: ready (host + minsu + seoyeon + hana = 4)
  response('p-minsu', 'c-thu-1500', 'available'),
  response('p-seoyeon', 'c-thu-1500', 'available'),
  response('p-junho', 'c-thu-1500', 'unavailable'),
  response('p-hana', 'c-thu-1500', 'available'),

  // c-fri-1600: ready with burden (minsu adjustment_commit, junho avoid_if_possible)
  response('p-minsu', 'c-fri-1600', 'adjustable'),
  response('p-seoyeon', 'c-fri-1600', 'available'),
  response('p-junho', 'c-fri-1600', 'available', ['avoid_if_possible']),
  response('p-hana', 'c-fri-1600', 'available'),

  // c-fri-1000: pending (optional quorum needed: minsu + seoyeon available, need 1 from optional pool)
  response('p-minsu', 'c-fri-1000', 'available'),
  response('p-seoyeon', 'c-fri-1000', 'available'),

  // c-wed-1400: pending (required pending: minsu response is unknown)
  response('p-seoyeon', 'c-wed-1400', 'available'),

  // c-thu-1000: recovery (seoyeon adjustment_intent requires consent)
  response('p-minsu', 'c-thu-1000', 'available'),
  response('p-seoyeon', 'c-thu-1000', 'adjustment_intent'),
  response('p-junho', 'c-thu-1000', 'available'),
  response('p-hana', 'c-thu-1000', 'available'),

  // c-thu-1030: recovery (seoyeon adjustment_intent, equal priority with c-thu-1000)
  response('p-minsu', 'c-thu-1030', 'available'),
  response('p-seoyeon', 'c-thu-1030', 'adjustment_intent'),
  response('p-junho', 'c-thu-1030', 'available'),
  response('p-hana', 'c-thu-1030', 'available'),

  // c-fri-1400: impossible (required participant seoyeon marked unavailable)
  response('p-minsu', 'c-fri-1400', 'available'),
  response('p-seoyeon', 'c-fri-1400', 'unavailable'),
  response('p-junho', 'c-fri-1400', 'available'),
  response('p-hana', 'c-fri-1400', 'available'),

  // c-mon-1100: impossible in quorumUnreachableMeeting (optional participants unavailable => max 3 < 4)
  response('p-minsu', 'c-mon-1100', 'available'),
  response('p-seoyeon', 'c-mon-1100', 'available'),
  response('p-junho', 'c-mon-1100', 'unavailable'),
  response('p-sujin', 'c-mon-1100', 'unavailable'),
  response('p-hana', 'c-mon-1100', 'unavailable'),
]

function response(
  participantId: string,
  candidateId: string,
  value: ResponseValue,
  preferenceTags?: Response['preferenceTags'],
): Response {
  return {
    id: `resp-${participantId}-${candidateId}`,
    participantId,
    candidateId,
    value,
    preferenceTags,
    updatedAt: '2026-09-21T10:00:00+09:00',
    updateSource: 'initial',
  }
}

export function createFixedMeeting(overrides?: Partial<Meeting>): Meeting {
  return {
    id: 'meeting-fixed-storybook',
    title: '2027 상반기 제품 로드맵 싱크',
    purpose: '핵심 기능 우선순위 조율 및 출시 일정 확정',
    referenceMaterial: 'Notion > Product > Roadmap 2027 v1',
    workContext: 'product_review',
    intent: 'align',
    durationMinutes: 60,
    hostId: 'p-host',
    hostLabel: '민지',
    schedulingWindow: {
      startDate: '2026-09-21',
      endDate: '2026-09-25',
    },
    responseDeadline: '2026-09-22T18:00:00+09:00',
    preset: 'quorum',
    minAttendeeCount: 4,
    status: 'collecting',
    participants: FIXED_PARTICIPANTS,
    candidates: FIXED_CANDIDATES,
    availabilityWindows: [],
    responses: FIXED_RESPONSES,
    changeLogs: [],
    ...overrides,
  }
}

export const fixedMeeting = createFixedMeeting()
export const fixedEvaluations = evaluateCandidates(fixedMeeting, FIXED_NOW)

export function getFixedEvaluation(candidateId: string): CandidateEvaluation {
  const found = fixedEvaluations.find((item) => item.candidate.id === candidateId)
  if (!found) {
    throw new Error(`Candidate evaluation not found for id: ${candidateId}`)
  }
  return found
}

export const readyEvaluation = getFixedEvaluation('c-thu-1500')
export const readyWithBurdenEvaluation = getFixedEvaluation('c-fri-1600')
export const pendingRequiredEvaluation = getFixedEvaluation('c-wed-1400')
export const pendingOptionalEvaluation = getFixedEvaluation('c-fri-1000')
export const recoveryEvaluation = getFixedEvaluation('c-thu-1000')
export const recoveryEqualPriorityEvaluation = getFixedEvaluation('c-thu-1030')
export const impossibleRequiredEvaluation = getFixedEvaluation('c-fri-1400')

export const quorumUnreachableMeeting = createFixedMeeting({
  participants: FIXED_PARTICIPANTS.map((p) =>
    p.id === 'p-sujin' ? { ...p, responseStatus: 'submitted' as const } : p,
  ),
})
export const impossibleQuorumEvaluation = evaluateCandidates(
  quorumUnreachableMeeting,
  FIXED_NOW,
).find((e) => e.candidate.id === 'c-mon-1100')!

export const deadlinePassedEvaluations = evaluateCandidates(fixedMeeting, FIXED_DEADLINE_PASSED_NOW)
export const deadlinePassedEvaluation =
  deadlinePassedEvaluations.find((item) => item.candidate.id === 'c-wed-1400') ??
  deadlinePassedEvaluations[0]

export const calendarConflicts: Record<string, string> = {
  'c-thu-1500': '디자인 위클리',
  'c-wed-1400': '스프린트 회고',
}
