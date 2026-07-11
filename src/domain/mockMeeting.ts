import type { Meeting, Participant, Response, ResponsePreferenceTag } from './meeting'

const meetingId = 'meeting-product-review'

export const prototypeNow = new Date('2026-06-30T17:00:00+09:00')

const participants: Participant[] = [
  participant('p-host', '민지', 'required', 'completed'),
  participant('p-minsu', '민수', 'required', 'completed'),
  participant('p-seoyeon', '서연', 'required', 'completed'),
  participant('p-junho', '준호', 'optional', 'completed'),
  participant('p-sujin', '수진', 'optional', 'pending'),
  participant('p-hana', '하나', 'optional', 'completed'),
]

const candidates = [
  {
    id: 'c-thu-1500',
    meetingId,
    startAt: '2026-07-02T15:00:00+09:00',
    endAt: '2026-07-02T16:00:00+09:00',
  },
  {
    id: 'c-wed-1400',
    meetingId,
    startAt: '2026-07-01T14:00:00+09:00',
    endAt: '2026-07-01T15:00:00+09:00',
  },
  {
    id: 'c-fri-1000',
    meetingId,
    startAt: '2026-07-03T10:00:00+09:00',
    endAt: '2026-07-03T11:00:00+09:00',
  },
  {
    id: 'c-thu-1000',
    meetingId,
    startAt: '2026-07-02T10:00:00+09:00',
    endAt: '2026-07-02T11:00:00+09:00',
  },
  {
    id: 'c-fri-1400',
    meetingId,
    startAt: '2026-07-03T14:00:00+09:00',
    endAt: '2026-07-03T15:00:00+09:00',
  },
]

const responses: Response[] = [
  response('p-minsu', 'c-thu-1500', 'available'),
  response('p-seoyeon', 'c-thu-1500', 'available'),
  response('p-junho', 'c-thu-1500', 'adjustable', ['tight_schedule']),
  response('p-hana', 'c-thu-1500', 'available'),

  response('p-seoyeon', 'c-wed-1400', 'available'),
  response('p-junho', 'c-wed-1400', 'available'),
  response('p-hana', 'c-wed-1400', 'available', ['after_lunch']),

  response('p-minsu', 'c-fri-1000', 'available'),
  response('p-seoyeon', 'c-fri-1000', 'available'),
  response('p-junho', 'c-fri-1000', 'available'),
  response('p-hana', 'c-fri-1000', 'available'),

  response('p-minsu', 'c-thu-1000', 'available'),
  response('p-seoyeon', 'c-thu-1000', 'adjustable'),
  response('p-junho', 'c-thu-1000', 'available'),
  response('p-hana', 'c-thu-1000', 'available'),

  response('p-minsu', 'c-fri-1400', 'available'),
  response('p-seoyeon', 'c-fri-1400', 'unavailable'),
  response('p-junho', 'c-fri-1400', 'available'),
  response('p-hana', 'c-fri-1400', 'available'),
]

export function createPrototypeMeeting(): Meeting {
  return {
    id: meetingId,
    title: '다음 주 제품 리뷰 회의',
    durationMinutes: 60,
    schedulingWindow: {
      startDate: '2026-07-01',
      endDate: '2026-07-03',
    },
    hostId: 'p-host',
    preset: 'core_attendees',
    responseDeadline: '2026-06-30T18:00:00+09:00',
    minAttendeeCount: 4,
    status: 'collecting',
    workContext: 'product_review',
    intent: 'review',
    hostLabel: '제품팀 민지',
    purpose: '출시 전 제품 리뷰 안건을 확인하고 최종 수정 범위를 정합니다.',
    referenceMaterial: '',
    participants,
    availabilityWindows: candidates.map((candidate) => ({
      id: `aw-${candidate.id}`,
      meetingId,
      ownerId: 'p-host',
      startAt: candidate.startAt,
      endAt: candidate.endAt,
      state: 'available' as const,
    })),
    candidates,
    responses,
    changeLogs: [
      {
        id: 'change-initial-recovery',
        meetingId,
        type: 'request_copied',
        description: '민수님에게 응답 요청 문구를 보냈고, 기존 후보와 링크는 그대로 유지됩니다.',
        candidateId: 'c-wed-1400',
        participantId: 'p-minsu',
        createdAt: '2026-06-30T16:45:00+09:00',
      },
    ],
  }
}

export function createDraftMeeting(): Meeting {
  const meeting = createPrototypeMeeting()
  const nextMonday = startOfNextWeek(new Date())
  const nextFriday = new Date(nextMonday)
  const responseDeadline = new Date()

  nextFriday.setDate(nextFriday.getDate() + 4)
  responseDeadline.setDate(responseDeadline.getDate() + 1)
  responseDeadline.setHours(18, 0, 0, 0)

  return {
    ...meeting,
    durationMinutes: null,
    schedulingWindow: {
      startDate: formatDateInput(nextMonday),
      endDate: formatDateInput(nextFriday),
    },
    responseDeadline: responseDeadline.toISOString(),
    preset: 'quorum',
    minAttendeeCount: 1,
    status: 'draft',
    participants: [participant('p-host', '민지', 'required', 'completed')],
    availabilityWindows: [],
    candidates: [],
    responses: [],
    changeLogs: [],
  }
}

function startOfNextWeek(date: Date) {
  const nextMonday = new Date(date)
  const daysUntilNextMonday = (8 - nextMonday.getDay()) % 7 || 7

  nextMonday.setDate(nextMonday.getDate() + daysUntilNextMonday)
  nextMonday.setHours(0, 0, 0, 0)

  return nextMonday
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function participant(
  id: string,
  name: string,
  role: Participant['role'],
  responseStatus: Participant['responseStatus'],
): Participant {
  return {
    id,
    meetingId,
    name,
    role,
    responseToken: `token-${id}`,
    responseStatus,
  }
}

function response(
  participantId: string,
  candidateId: string,
  value: Response['value'],
  preferenceTags?: ResponsePreferenceTag[],
): Response {
  return {
    id: `r-${participantId}-${candidateId}`,
    participantId,
    candidateId,
    value,
    preferenceTags,
    updatedAt: '2026-06-30T16:30:00+09:00',
    updateSource: 'initial',
  }
}
