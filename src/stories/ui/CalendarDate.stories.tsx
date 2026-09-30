import type { Meta, StoryObj } from '@storybook/react-vite'

import { CalendarDate, TimeRange } from '../../components/ui/calendar-date'
import './storybook.css'

const meta = {
  title: '02 Primitives/Calendar Date',
  component: CalendarDate,
  parameters: { layout: 'centered' },
  args: { value: '2026-09-22T05:00:00.000Z', compact: false },
} satisfies Meta<typeof CalendarDate>

export default meta
type Story = StoryObj<typeof meta>

export const Full: Story = {}

export const Compact: Story = { args: { compact: true } }

export const DateAndTimeRange: Story = {
  parameters: { controls: { exclude: ['value', 'compact'] } },
  render: () => (
    <div className="story-row story-surface">
      <CalendarDate value="2026-09-22T05:00:00.000Z" compact />
      <div className="story-stack" style={{ gap: 4 }}>
        <strong>
          <CalendarDate value="2026-09-22T05:00:00.000Z" />
        </strong>
        <TimeRange start="2026-09-22T05:00:00.000Z" end="2026-09-22T06:30:00.000Z" />
      </div>
    </div>
  ),
}

export const YearBoundary: Story = {
  parameters: { controls: { exclude: ['value', 'compact'] } },
  render: () => (
    <div className="story-row">
      <CalendarDate value="2026-12-31T14:30:00.000Z" compact />
      <TimeRange start="2026-12-31T14:30:00.000Z" end="2026-12-31T16:00:00.000Z" />
    </div>
  ),
}

export const InvalidValueContract: Story = {
  args: { value: '2026-09-22T05:00:00.000Z' },
  parameters: {
    docs: {
      description: {
        story:
          '이 스토리는 유효한 ISO 값으로만 렌더링합니다. 잘못된 ISO 문자열에 대한 fallback UI나 validation 계약이 없으므로, canvas를 깨뜨리는 Invalid Date를 주입하지 않고 호출자가 유효한 ISO 값을 제공해야 한다는 현재 계약을 기록합니다.',
      },
    },
  },
}
