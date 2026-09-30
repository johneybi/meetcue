import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Candidate, ResponseValue } from '../domain/meeting'
import '../index.css'
import { ResponseAnswerList } from './ResponseAnswerList'

const candidates = [
  {
    id: 'candidate-tuesday',
    meetingId: 'meeting-story',
    startAt: '2026-09-22T10:00:00+09:00',
    endAt: '2026-09-22T11:00:00+09:00',
  },
  {
    id: 'candidate-wednesday',
    meetingId: 'meeting-story',
    startAt: '2026-09-23T14:00:00+09:00',
    endAt: '2026-09-23T15:00:00+09:00',
  },
  {
    id: 'candidate-thursday',
    meetingId: 'meeting-story',
    startAt: '2026-09-24T16:00:00+09:00',
    endAt: '2026-09-24T17:00:00+09:00',
  },
] satisfies Candidate[]

const completeAnswers = {
  'candidate-tuesday': 'available',
  'candidate-wednesday': 'adjustment_intent',
  'candidate-thursday': 'unavailable',
} satisfies Record<string, ResponseValue>

const meta = {
  title: '03 Product Patterns/Response Answer List',
  component: ResponseAnswerList,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '제출 전 후보 시간별 응답을 검토하는 목록입니다. 로딩과 오류 상태는 컴포넌트 API에서 지원하지 않습니다.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(32rem, calc(100vw - 2rem))' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    candidates,
    answers: completeAnswers,
  },
} satisfies Meta<typeof ResponseAnswerList>

export default meta
type Story = StoryObj<typeof meta>

export const Complete: Story = {}

export const Partial: Story = {
  args: {
    answers: {
      'candidate-tuesday': 'available',
      'candidate-wednesday': 'adjustment_intent',
    },
  },
  parameters: {
    docs: {
      description: {
        story: '아직 답하지 않은 후보 시간은 숨기고, 현재까지 선택한 응답만 보여줍니다.',
      },
    },
  },
}

export const Empty: Story = {
  args: { answers: {} },
  parameters: {
    docs: {
      description: {
        story: '아직 선택한 응답이 없을 때 빈 컨테이너 대신 다음 행동 전 상태를 설명합니다.',
      },
    },
  },
}
