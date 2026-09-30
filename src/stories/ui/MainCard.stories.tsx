import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  MainCard,
  MainCardContent,
  MainCardFooter,
  MainCardHeader,
} from '../../components/ui/main-card'
import { Button } from '../../components/ui/button'
import './storybook.css'

const meta = {
  title: '02 Primitives/Main Card',
  component: MainCard,
  parameters: { layout: 'centered' },
  args: { material: 'plain', selected: false, interactive: false },
  argTypes: {
    as: { control: 'inline-radio', options: ['section', 'article'] },
    material: { control: 'inline-radio', options: ['plain', 'soft'] },
  },
} satisfies Meta<typeof MainCard>

export default meta
type Story = StoryObj<typeof meta>

export const Composition: Story = {
  render: (args) => (
    <MainCard {...args} style={{ width: 'min(100%, 360px)', overflow: 'hidden' }}>
      <MainCardHeader style={{ padding: '20px 20px 0' }}>
        <strong>주간 제품 리뷰</strong>
      </MainCardHeader>
      <MainCardContent style={{ padding: 20 }}>
        <p>9월 22일 화요일 · 14:00—15:00</p>
      </MainCardContent>
      <MainCardFooter style={{ padding: '0 20px 20px' }}>
        <Button size="compact">자세히 보기</Button>
      </MainCardFooter>
    </MainCard>
  ),
}

export const MaterialsAndSelection: Story = {
  parameters: { controls: { exclude: ['as', 'material', 'selected', 'interactive'] } },
  render: () => (
    <div className="story-grid">
      <MainCard style={{ padding: 20 }}>Plain</MainCard>
      <MainCard material="soft" style={{ padding: 20 }}>
        Soft
      </MainCard>
      <MainCard selected style={{ padding: 20 }}>
        Selected
      </MainCard>
      <MainCard material="soft" selected interactive style={{ padding: 20 }}>
        Selected interactive surface
      </MainCard>
    </div>
  ),
}

export const InteractionSemantics: Story = {
  args: { interactive: true },
  render: (args) => (
    <MainCard {...args} style={{ width: 'min(100%, 360px)', padding: 20 }}>
      interactive는 시각적 표식이며 카드 자체는 클릭하거나 포커스할 수 없습니다.
    </MainCard>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'interactive prop은 data attribute만 제공합니다. 카드 전체를 가짜 버튼으로 만들지 말고, 실제 제품 카드에서는 내부 Button 또는 링크가 키보드와 클릭 상호작용을 소유해야 합니다.',
      },
    },
  },
}
