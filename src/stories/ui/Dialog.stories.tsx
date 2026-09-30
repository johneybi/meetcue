import { useState, type ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '../../components/ui/button'
import { Dialog } from '../../components/ui/dialog'
import './storybook.css'

const meta = {
  title: '02 Primitives/Dialog',
  component: Dialog,
  parameters: { layout: 'centered' },
  args: {
    title: '대화상자',
    description: '집중해서 처리할 작업을 안내합니다.',
    onClose: () => undefined,
    children: <p>대화상자 내용</p>,
  },
  argTypes: {
    onClose: { table: { disable: true } },
    children: { table: { disable: true } },
  },
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

function DialogHarness({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>대화상자 열기</Button>
      {open ? (
        <Dialog title={title} description={description} onClose={() => setOpen(false)}>
          {children}
        </Dialog>
      ) : null}
    </>
  )
}

function renderDialog(args: { title: string; description?: string; children: ReactNode }) {
  return (
    <DialogHarness title={args.title} description={args.description}>
      {args.children}
    </DialogHarness>
  )
}

export const Default: Story = {
  args: {
    title: '응답 요청 보내기',
    description: '선택한 참석자에게 다시 응답을 요청합니다.',
    children: (
      <div className="story-stack">
        <p>수진님과 민호님에게 알림을 보낼까요?</p>
        <div className="story-row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary">취소</Button>
          <Button>요청 보내기</Button>
        </div>
      </div>
    ),
  },
  render: renderDialog,
}

export const WithoutDescription: Story = {
  args: {
    title: '회의 삭제',
    description: undefined,
    children: (
      <div className="story-stack">
        <p>삭제한 회의는 복구할 수 없습니다.</p>
        <Button variant="destructive" width="full">
          회의 삭제
        </Button>
      </div>
    ),
  },
  render: renderDialog,
}

export const LongContent: Story = {
  args: {
    title: '참석자 응답',
    description: '긴 내용에서 스크롤 동작을 확인합니다.',
    children: (
      <div className="story-stack">
        {Array.from({ length: 12 }, (_, index) => (
          <p key={index}>{index + 1}. 참석자 응답과 일정 충돌 내용을 확인합니다.</p>
        ))}
        <Button>확인</Button>
      </div>
    ),
  },
  render: renderDialog,
}

export const FooterApiNotSupported: Story = {
  args: {
    title: '현재 Dialog 계약',
    description: undefined,
    children: <p>액션 영역은 children으로 조합합니다.</p>,
  },
  render: renderDialog,
  parameters: {
    docs: {
      description: {
        story:
          'Dialog에는 전용 footer 또는 action props가 없습니다. 현재는 children 안에서 제품 맥락에 맞게 조합하며, 반복 패턴이 확인되기 전까지 가상의 API를 만들지 않습니다.',
      },
    },
  },
}
