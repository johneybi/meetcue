import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { SegmentedControl } from '../../components/ui/segmented-control'
import './storybook.css'

const options = [
  { value: 'all', label: '전체' },
  { value: 'required', label: '필수 참석자' },
  { value: 'optional', label: '참석 권장' },
] as const

const meta = {
  title: '02 Primitives/Segmented Control',
  component: SegmentedControl,
  parameters: { layout: 'centered' },
  args: {
    label: '참석자 범위',
    value: 'all',
    options: [...options],
    onChange: () => undefined,
  },
} satisfies Meta<typeof SegmentedControl>

export default meta
type Story = StoryObj<typeof meta>

function SegmentedHarness<T extends string>({
  label,
  options,
  initialValue,
}: {
  label: string
  options: { value: T; label: string }[]
  initialValue: T
}) {
  const [value, setValue] = useState(initialValue)
  return (
    <div style={{ width: 'min(100%, 480px)' }}>
      <SegmentedControl label={label} value={value} options={options} onChange={setValue} />
    </div>
  )
}

export const Interactive: Story = {
  render: (args) => (
    <SegmentedHarness label={args.label} options={args.options} initialValue={args.value} />
  ),
}

export const TwoOptions: Story = {
  parameters: { controls: { exclude: ['label', 'value', 'options'] } },
  render: () => (
    <SegmentedHarness
      label="보기 범위"
      initialValue="week"
      options={[
        { value: 'week', label: '주간' },
        { value: 'month', label: '월간' },
      ]}
    />
  ),
}

export const DisabledOptionsNotSupported: Story = {
  render: () => <SegmentedHarness label="참석자 범위" options={[...options]} initialValue="all" />,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          '개별 option의 disabled 상태와 빈 options에 대한 별도 계약은 아직 없습니다. 지원하지 않는 상태를 시각적으로 모사하지 않습니다.',
      },
    },
  },
}
