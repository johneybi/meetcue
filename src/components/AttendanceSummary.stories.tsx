import type { Meta, StoryObj } from '@storybook/react-vite'
import type { CandidateEvaluation } from '../domain/evaluation'
import type { Participant } from '../domain/meeting'
import '../index.css'
import '../styles/material-tokens.css'
import '../styles/soft-material.css'
import { AttendanceSummary } from './AttendanceSummary'

const participants = [
  participant('host', '민지', 'required', 'submitted'),
  participant('designer', '서연', 'required', 'submitted'),
  participant('engineer', '준호', 'required', 'submitted'),
  participant('researcher', '수진', 'optional', 'submitted'),
  participant('analyst', '하나', 'optional', 'not_started'),
]

const candidate = {
  id: 'candidate-review',
  meetingId: 'meeting-story',
  startAt: '2026-09-22T10:00:00+09:00',
  endAt: '2026-09-22T11:00:00+09:00',
}

const mixedEvaluation = {
  candidate,
  status: 'pending',
  reasons: ['선택 참석자 한 명의 응답을 기다리고 있어요.'],
  firmAvailableCount: 2,
  availableCount: 3,
  adjustableCount: 1,
  preferenceTagCount: 0,
  unavailableCount: 1,
  requiredUnavailable: [],
  requiredPending: [],
  optionalPendingPool: [participants[4]],
  positiveResponsesNeededAfterRequiredYes: 0,
  adjustmentIntentParticipants: [participants[2]],
  adjustmentCommitParticipants: [participants[1]],
  deadlinePassed: false,
  responseDetails: [
    { participant: participants[0], state: 'available', isImplicitHostAvailable: true },
    { participant: participants[1], state: 'adjustment_commit' },
    { participant: participants[2], state: 'adjustment_intent' },
    { participant: participants[3], state: 'unavailable' },
    { participant: participants[4], state: 'unknown' },
  ],
} satisfies CandidateEvaluation

const meta = {
  title: '03 Product Patterns/Attendance Summary',
  component: AttendanceSummary,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '후보 시간의 참석 가능 인원과 개별 응답 근거를 네이티브 disclosure로 보여줍니다. 로딩과 오류 상태는 컴포넌트 API에서 지원하지 않습니다.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(42rem, calc(100vw - 2rem))' }}>
        <Story />
      </div>
    ),
  ],
  args: { evaluation: mixedEvaluation },
} satisfies Meta<typeof AttendanceSummary>

export default meta
type Story = StoryObj<typeof meta>

export const MixedResponses: Story = {}

export const CompleteAgreement: Story = {
  args: {
    evaluation: {
      ...mixedEvaluation,
      status: 'ready',
      reasons: [],
      firmAvailableCount: participants.length,
      availableCount: participants.length,
      adjustableCount: 0,
      unavailableCount: 0,
      optionalPendingPool: [],
      adjustmentIntentParticipants: [],
      adjustmentCommitParticipants: [],
      responseDetails: participants.map((person, index) => ({
        participant: person,
        state: 'available' as const,
        isImplicitHostAvailable: index === 0 || undefined,
      })),
    },
  },
}

function participant(
  id: string,
  name: string,
  role: Participant['role'],
  responseStatus: Participant['responseStatus'],
): Participant {
  return {
    id,
    meetingId: 'meeting-story',
    name,
    role,
    responseToken: `token-${id}`,
    responseStatus,
  }
}
