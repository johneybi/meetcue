import type { Meta, StoryObj } from '@storybook/react-vite'

import { Badge } from '../../components/ui/badge'
import './storybook.css'

const meta = {
  title: '02 Primitives/Badge',
  component: Badge,
  parameters: { layout: 'centered' },
  args: { tone: 'success', children: '확정 가능' },
  argTypes: {
    tone: { control: 'inline-radio', options: ['success', 'warning', 'danger', 'info'] },
    size: { control: 'inline-radio', options: ['default', 'compact'] },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const SemanticTones: Story = {
  parameters: { controls: { exclude: ['tone', 'size'] } },
  render: () => (
    <div className="story-row">
      <Badge tone="success">확정 가능</Badge>
      <Badge tone="warning">응답 대기</Badge>
      <Badge tone="danger">확정 어려움</Badge>
      <Badge tone="info">조정 검토</Badge>
    </div>
  ),
}

export const Compact: Story = {
  args: { size: 'compact', tone: 'info', children: '필수 참석자' },
}

export const NeutralContract: Story = {
  args: { tone: 'info', children: '조정 검토' },
  parameters: {
    docs: {
      description: {
        story:
          '중립 tone은 현재 공개 API에 없습니다. 이 canvas는 중립 의미를 약속하지 않고, 현재 지원되는 info tone의 예시만 보여줍니다. 중립 상태가 제품 전반에서 반복될 때 별도 tone으로 추가하는 것이 적절합니다.',
      },
    },
  },
}
