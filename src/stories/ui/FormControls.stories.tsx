import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Field } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import './storybook.css'

const meta = {
  title: '02 Primitives/Form Controls',
  component: Field,
  parameters: { layout: 'centered' },
  args: {
    label: '필드 라벨',
    children: <Input placeholder="값을 입력하세요" />,
  },
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <div className="story-form">
      <Field {...args} />
    </div>
  ),
}

function ControlledForm() {
  const [title, setTitle] = useState('주간 제품 리뷰')
  const [purpose, setPurpose] = useState('이번 주 주요 의사결정과 다음 행동을 정합니다.')

  return (
    <div className="story-form story-surface">
      <Field label="회의 제목" hint={`${title.length}/40자`}>
        <Input
          controlSize="field"
          value={title}
          maxLength={40}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <Field label="회의 목적" hint="참석자가 준비할 내용을 구체적으로 적어주세요.">
        <Textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} />
      </Field>
    </div>
  )
}

export const Controlled: Story = { render: () => <ControlledForm /> }

export const InputSizes: Story = {
  render: () => (
    <div className="story-form">
      <Input placeholder="기본 높이" aria-label="기본 입력" />
      <Input controlSize="field" placeholder="필드 높이" aria-label="큰 입력" />
    </div>
  ),
}

export const EmptyAndDisabled: Story = {
  render: () => (
    <div className="story-form story-surface">
      <Field label="회의 제목" hint="필수 입력">
        <Input controlSize="field" placeholder="회의 제목을 입력하세요" />
      </Field>
      <Field label="저장된 설명">
        <Textarea disabled defaultValue="현재는 수정할 수 없습니다." />
      </Field>
    </div>
  ),
}

export const ValidationNotSupported: Story = {
  render: () => (
    <div className="story-form story-surface">
      <Field label="회의 제목" hint="오류 스타일은 아직 정의되지 않았습니다.">
        <Input aria-invalid="true" value="" readOnly />
      </Field>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'aria-invalid의 danger border는 지원하지만, 오류 메시지를 렌더링하고 aria-describedby로 연결하는 공통 Field API는 아직 없습니다. 부분 지원 범위를 그대로 보여줍니다.',
      },
    },
  },
}
