import type { Meta, StoryObj } from '@storybook/react-vite'

import { Avatar } from '../../components/ui/avatar'
import './storybook.css'

const meta = {
  title: '02 Primitives/Avatar',
  component: Avatar,
  parameters: { layout: 'centered' },
  args: { name: '수진', size: 'default' },
  argTypes: { size: { control: 'inline-radio', options: ['default', 'small'] } },
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const SizesAndFallbacks: Story = {
  parameters: { controls: { exclude: ['name', 'src', 'alt', 'size'] } },
  render: () => (
    <div className="story-row">
      <Avatar name="수진" />
      <Avatar name="민호" size="small" />
      <Avatar name="Alex" />
      <Avatar name="🙂 팀" />
      <Avatar name="" />
    </div>
  ),
}

export const DecorativeFallback: Story = {
  args: { name: '지은' },
  parameters: {
    docs: {
      description: {
        story:
          'alt를 생략한 fallback avatar는 aria-hidden으로 처리됩니다. 같은 행에 사람 이름이 이미 있을 때 사용하는 계약입니다.',
      },
    },
  },
}

export const BrokenImageNotHandled: Story = {
  args: { name: '수진', src: '/missing-avatar.png', alt: '수진' },
  parameters: {
    docs: {
      description: {
        story:
          '현재 Avatar는 이미지 로드 실패 시 fallback 글자로 전환하지 않습니다. 오류 처리를 꾸며내지 않고 실제 미지원 동작을 기록합니다.',
      },
    },
  },
}
