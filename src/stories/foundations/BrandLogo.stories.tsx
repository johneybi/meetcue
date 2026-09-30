import type { Meta, StoryObj } from '@storybook/react-vite'

import { BrandLogo } from '../../components/ui/brand-logo'
import '../ui/storybook.css'

const meta = {
  title: '01 Foundations/Brand Logo',
  component: BrandLogo,
  parameters: { layout: 'centered' },
  args: {
    variant: 'lockup',
    size: 'medium',
    label: 'MeetCue',
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['emblem', 'wordmark', 'lockup'],
    },
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
  },
} satisfies Meta<typeof BrandLogo>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Variants: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="story-stack">
      <BrandLogo variant="emblem" label="MeetCue 엠블럼" />
      <BrandLogo variant="wordmark" label="MeetCue 워드마크" />
      <BrandLogo variant="lockup" label="MeetCue" />
    </div>
  ),
}

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="story-stack">
      <BrandLogo size="small" label="MeetCue 작은 로고" />
      <BrandLogo size="medium" label="MeetCue 중간 로고" />
      <BrandLogo size="large" label="MeetCue 큰 로고" />
    </div>
  ),
}
