import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarDays, Plus, Trash2 } from 'lucide-react'

import { Button } from '../../components/ui/button'
import './storybook.css'

const meta = {
  title: '02 Primitives/Button',
  component: Button,
  parameters: { layout: 'centered' },
  args: { children: '회의 만들기' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'quiet', 'fieldAction', 'destructive'],
    },
    size: {
      control: 'select',
      options: ['default', 'action', 'compact', 'text', 'icon', 'iconSmall', 'field'],
    },
    width: { control: 'inline-radio', options: ['auto', 'full'] },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Variants: Story = {
  parameters: { controls: { exclude: ['variant', 'size', 'width'] } },
  render: () => (
    <div className="story-row">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="quiet">Quiet</Button>
      <Button variant="fieldAction">Field action</Button>
      <Button variant="destructive">
        <Trash2 size={18} aria-hidden="true" /> 삭제
      </Button>
    </div>
  ),
}

export const Sizes: Story = {
  parameters: { controls: { exclude: ['variant', 'size', 'width'] } },
  render: () => (
    <div className="story-row">
      <Button size="default">Default</Button>
      <Button size="action">Action</Button>
      <Button size="compact">Compact</Button>
      <Button size="text" variant="quiet">
        Text
      </Button>
      <Button size="field" variant="fieldAction">
        Field
      </Button>
      <Button size="icon" aria-label="날짜 선택">
        <CalendarDays size={20} aria-hidden="true" />
      </Button>
      <Button size="iconSmall" aria-label="추가">
        <Plus size={16} aria-hidden="true" />
      </Button>
    </div>
  ),
}

export const Disabled: Story = {
  args: { disabled: true, children: '계속할 수 없음' },
}

export const FullWidth: Story = {
  parameters: { layout: 'padded' },
  args: { width: 'full', children: '이 시간대로 계속' },
}

export const LoadingNotSupported: Story = {
  args: { children: '응답 요청하기' },
  parameters: {
    docs: {
      description: {
        story:
          'Button에는 아직 loading 계약이 없습니다. disabled 상태를 loading처럼 꾸미지 않고, 제품 요구가 확정되면 aria-busy와 진행 표시를 포함한 API를 별도로 설계해야 합니다.',
      },
    },
  },
}
