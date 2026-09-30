import { useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { SelectableCard } from '../../components/ui/selectable-card'
import './storybook.css'

const meta = {
  title: '02 Primitives/Selectable Card',
  component: SelectableCard,
  parameters: { layout: 'centered' },
  args: { children: '핵심 참석자 중심', isSelected: false },
  argTypes: { variant: { control: 'inline-radio', options: ['default', 'person'] } },
} satisfies Meta<typeof SelectableCard>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

function SingleSelectionHarness() {
  const options = ['전원 참석', '핵심 참석자 중심', '최소 인원 충족']
  const [selected, setSelected] = useState(options[1])
  const group = useRef<HTMLDivElement>(null)

  return (
    <div ref={group} className="story-grid" role="radiogroup" aria-label="회의 성립 기준">
      {options.map((option, index) => (
        <SelectableCard
          key={option}
          role="radio"
          aria-checked={selected === option}
          tabIndex={selected === option ? 0 : -1}
          isSelected={selected === option}
          onClick={() => setSelected(option)}
          onKeyDown={(event) => {
            let nextIndex: number
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
              nextIndex = (index + 1) % options.length
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
              nextIndex = (index + options.length - 1) % options.length
            } else if (event.key === 'Home') {
              nextIndex = 0
            } else if (event.key === 'End') {
              nextIndex = options.length - 1
            } else {
              return
            }

            event.preventDefault()
            setSelected(options[nextIndex])
            group.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex].focus()
          }}
          style={{ minHeight: 64, padding: '12px 16px', display: 'flex', alignItems: 'center' }}
        >
          <strong>{option}</strong>
        </SelectableCard>
      ))}
    </div>
  )
}

export const SingleSelection: Story = {
  render: () => <SingleSelectionHarness />,
  parameters: {
    controls: { exclude: ['children', 'isSelected', 'selected', 'variant'] },
    docs: {
      description: {
        story:
          '이 예시의 라디오 그룹과 화살표 키 이동은 story harness가 조합한 사용 패턴입니다. SelectableCard primitive 자체는 선택 상태를 계산하거나 라디오 키보드 모델을 소유하지 않습니다.',
      },
    },
  },
}

export const Disabled: Story = {
  args: { disabled: true, children: '선택할 수 없는 옵션' },
}

export const SelectedPropCompatibility: Story = {
  args: { selected: true, children: 'selected prop으로 선택됨' },
  parameters: {
    docs: {
      description: {
        story:
          '현재 isSelected와 CVA의 selected prop을 모두 지원하며 isSelected가 우선합니다. 새 사용처에서는 의미가 명확한 isSelected를 우선하는 편이 좋습니다.',
      },
    },
  },
}
