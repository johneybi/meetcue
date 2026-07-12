import type {
  AvailabilityWindow,
  Meeting,
  Participant,
  Response,
  ResponsePreferenceTag,
} from './meeting.ts'
import { deriveParticipantResponses } from './availability.ts'

const meetingId = 'meeting-product-review'

export const prototypeNow = new Date()

const participants: Participant[] = [
  participant('p-host', '민지', 'required', 'submitted'),
  participant('p-minsu', '민수', 'required', 'submitted'),
  participant('p-seoyeon', '서연', 'required', 'submitted'),
  participant('p-junho', '준호', 'optional', 'submitted'),
  participant('p-sujin', '수진', 'optional', 'not_started'),
  participant('p-hana', '하나', 'optional', 'submitted'),
]

function createCandidates(referenceDate: Date) {
  return [
    {
      id: 'c-thu-1500',
      meetingId,
      startAt: atDayOffset(referenceDate, 3, 15),
      endAt: atDayOffset(referenceDate, 3, 16),
    },
    {
      id: 'c-wed-1400',
      meetingId,
      startAt: atDayOffset(referenceDate, 2, 14),
      endAt: atDayOffset(referenceDate, 2, 15),
    },
    {
      id: 'c-fri-1000',
      meetingId,
      startAt: atDayOffset(referenceDate, 4, 10),
      endAt: atDayOffset(referenceDate, 4, 11),
    },
    {
      id: 'c-thu-1000',
      meetingId,
      startAt: atDayOffset(referenceDate, 3, 10),
      endAt: atDayOffset(referenceDate, 3, 11),
    },
    {
      id: 'c-thu-1030',
      meetingId,
      startAt: atDayOffset(referenceDate, 3, 10, 30),
      endAt: atDayOffset(referenceDate, 3, 11, 30),
    },
    {
      id: 'c-fri-1400',
      meetingId,
      startAt: atDayOffset(referenceDate, 4, 14),
      endAt: atDayOffset(referenceDate, 4, 15),
    },
  ]
}

function createHostAvailabilityWindows(referenceDate: Date): AvailabilityWindow[] {
  const workBlocks = [
    { dayOffset: 2, startHour: 10, endHour: 12 },
    { dayOffset: 2, startHour: 13, endHour: 16 },
    { dayOffset: 3, startHour: 10, endHour: 12 },
    { dayOffset: 3, startHour: 13, endHour: 17 },
    { dayOffset: 4, startHour: 10, endHour: 12 },
    { dayOffset: 4, startHour: 13, endHour: 15 },
  ]

  return workBlocks.map((block, index) => ({
    id: `aw-host-scope-${index + 1}`,
    meetingId,
    ownerId: 'p-host',
    startAt: atDayOffset(referenceDate, block.dayOffset, block.startHour),
    endAt: atDayOffset(referenceDate, block.dayOffset, block.endHour),
    state: 'available',
  }))
}

const responseFixtures: Response[] = [
  response('p-minsu', 'c-thu-1500', 'available'),
  response('p-seoyeon', 'c-thu-1500', 'available'),
  response('p-junho', 'c-thu-1500', 'adjustable', ['avoid_if_possible']),
  response('p-hana', 'c-thu-1500', 'available'),

  response('p-seoyeon', 'c-wed-1400', 'available'),

  response('p-minsu', 'c-fri-1000', 'available'),
  response('p-seoyeon', 'c-fri-1000', 'available'),

  response('p-minsu', 'c-thu-1000', 'available'),
  response('p-seoyeon', 'c-thu-1000', 'adjustable'),
  response('p-junho', 'c-thu-1000', 'available'),
  response('p-hana', 'c-thu-1000', 'available'),

  response('p-minsu', 'c-thu-1030', 'available'),
  response('p-seoyeon', 'c-thu-1030', 'adjustable'),
  response('p-junho', 'c-thu-1030', 'available'),
  response('p-hana', 'c-thu-1030', 'available'),

  response('p-minsu', 'c-fri-1400', 'available'),
  response('p-seoyeon', 'c-fri-1400', 'unavailable'),
  response('p-junho', 'c-fri-1400', 'available'),
  response('p-hana', 'c-fri-1400', 'available'),
]

export function createPrototypeMeeting(): Meeting {
  const candidates = createCandidates(prototypeNow)
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]))
  const participantAvailabilityWindows = responseFixtures.flatMap((response) => {
    const candidate = candidateById.get(response.candidateId)
    if (candidate == null) return []

    return [
      {
        id: `aw-${response.participantId}-${response.candidateId}`,
        meetingId,
        ownerId: response.participantId,
        startAt: candidate.startAt,
        endAt: candidate.endAt,
        state: response.value,
        avoidPreferred: response.preferenceTags?.includes('avoid_if_possible') || undefined,
      } satisfies AvailabilityWindow,
    ]
  })
  const responseDeadline = new Date(prototypeNow)
  responseDeadline.setDate(responseDeadline.getDate() + 1)
  responseDeadline.setHours(18, 0, 0, 0)
  const availabilityWindows = [
    ...createHostAvailabilityWindows(prototypeNow),
    ...participantAvailabilityWindows,
  ]
  const derivedResponses = participants.flatMap((participant) =>
    participant.id === 'p-host' || participant.responseStatus !== 'submitted'
      ? []
      : deriveParticipantResponses(
          participant.id,
          candidates,
          availabilityWindows,
          prototypeNow.toISOString(),
          'initial',
        ),
  )

  return {
    id: meetingId,
    title: '다음 주 제품 리뷰 회의',
    durationMinutes: 60,
    schedulingWindow: {
      startDate: formatDateInput(new Date(candidates[1].startAt)),
      endDate: formatDateInput(new Date(candidates[candidates.length - 1].startAt)),
    },
    hostId: 'p-host',
    preset: 'core_attendees',
    responseDeadline: responseDeadline.toISOString(),
    minAttendeeCount: 4,
    status: 'collecting',
    workContext: 'product_review',
    intent: 'review',
    hostLabel: '제품팀 민지',
    purpose: '출시 전 제품 리뷰 안건을 확인하고 최종 수정 범위를 정합니다.',
    referenceMaterial: '',
    participants,
    availabilityWindows,
    candidates,
    responses: derivedResponses,
    changeLogs: [
      {
        id: 'change-initial-request',
        meetingId,
        type: 'request_copied',
        description: '민수님에게 응답 요청 문구를 보냈고, 기존 후보와 링크는 그대로 유지됩니다.',
        candidateId: 'c-wed-1400',
        participantId: 'p-minsu',
        createdAt: prototypeNow.toISOString(),
      },
    ],
  }
}

function atDayOffset(referenceDate: Date, dayOffset: number, hour: number, minute = 0) {
  const date = new Date(referenceDate)
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
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
    title: '',
    purpose: '',
    referenceMaterial: '',
    durationMinutes: 60,
    schedulingWindow: {
      startDate: formatDateInput(nextMonday),
      endDate: formatDateInput(nextFriday),
    },
    responseDeadline: responseDeadline.toISOString(),
    preset: 'quorum',
    minAttendeeCount: 1,
    status: 'draft',
    participants: [participant('p-host', '민지', 'required', 'submitted')],
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
    updatedAt: prototypeNow.toISOString(),
    updateSource: 'initial',
  }
}
