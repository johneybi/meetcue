import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import '../index.css'
import { MinimumAttendanceControl } from './MinimumAttendanceControl'

const meta = {
  title: '03 Product Patterns/Minimum Attendance Control',
  component: MinimumAttendanceControl,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '회의 진행에 필요한 최소 참석 인원을 정하는 경계값 제어입니다. 로딩과 오류 상태는 컴포넌트 API에서 지원하지 않습니다.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(36rem, calc(100vw - 2rem))' }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => <InteractiveControl {...args} />,
  args: {
    value: 3,
    minimum: 1,
    maximum: 6,
    onChange: () => undefined,
  },
} satisfies Meta<typeof MinimumAttendanceControl>

export default meta
type Story = StoryObj<typeof meta>

export const Interactive: Story = {}

export const AtMinimum: Story = {
  args: { value: 1 },
  parameters: {
    docs: { description: { story: '감소 버튼이 비활성화된 최소 경계 상태입니다.' } },
  },
}

export const AtMaximum: Story = {
  args: { value: 6 },
  parameters: {
    docs: { description: { story: '증가 버튼이 비활성화된 최대 경계 상태입니다.' } },
  },
}

function InteractiveControl({
  value: initialValue,
  minimum,
  maximum,
}: React.ComponentProps<typeof MinimumAttendanceControl>) {
  const [value, setValue] = useState(initialValue)

  return (
    <MinimumAttendanceControl
      value={value}
      minimum={minimum}
      maximum={maximum}
      onChange={setValue}
    />
  )
}
