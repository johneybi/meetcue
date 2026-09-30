import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Meeting } from '../domain/meeting'
import '../index.css'
import { ParticipantMeetingContext } from './ParticipantMeetingContext'

const meeting = {
  id: 'meeting-story',
  title: '신규 온보딩 흐름 의사결정',
  durationMinutes: 60,
  schedulingWindow: { startDate: '2026-09-22', endDate: '2026-09-25' },
  hostId: 'host',
  preset: 'core_attendees',
  responseDeadline: '2026-09-20T18:00:00+09:00',
  minAttendeeCount: 3,
  status: 'collecting',
  workContext: 'direction_decision',
  intent: 'decide',
  hostLabel: '민지',
  purpose: '사용자 테스트 결과를 바탕으로 다음 스프린트의 온보딩 방향을 결정해요.',
  referenceMaterial: '9월 사용자 테스트 요약',
  participants: [],
  availabilityWindows: [],
  candidates: [],
  responses: [],
  changeLogs: [],
} satisfies Meeting

const meta = {
  title: '03 Product Patterns/Participant Meeting Context',
  component: ParticipantMeetingContext,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '참여자가 응답 전에 확인해야 할 회의 목적, 마감, 진행 상황을 묶어 보여줍니다. 비동기 로딩과 오류 상태는 상위 화면 책임이며 이 컴포넌트의 props에는 없습니다.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="respond-app" style={{ width: 'min(52rem, calc(100vw - 2rem))' }}>
        <main className="respond-main">
          <Story />
        </main>
      </div>
    ),
  ],
  args: {
    meeting,
    isScheduleEntry: false,
    isEditing: false,
    remainingCount: 3,
    deadlinePassed: false,
  },
} satisfies Meta<typeof ParticipantMeetingContext>

export default meta
type Story = StoryObj<typeof meta>

export const InProgress: Story = {}

export const Complete: Story = {
  args: { remainingCount: 0 },
}

export const EditingPreviousResponse: Story = {
  args: { isEditing: true, remainingCount: 0 },
}

export const DeadlinePassed: Story = {
  args: { deadlinePassed: true, remainingCount: 2 },
}
