import { useState } from 'react'
import { ChevronRight, PanelsTopLeft, RotateCcw, X } from 'lucide-react'
import type { Meeting } from '../domain/meeting'
import type { AppRoute } from '../lib/appRoutes'
import type { DevScreen } from './DevScreenSwitcher'
import './DemoGuide.css'

const demoGuideSteps: Array<DevScreen & { title: string; description: string }> = [
  {
    label: '1',
    title: '회의 만들기',
    description: '회의 정보와 참석 기준, 확인할 시간 범위를 정해요.',
    route: 'create',
    fixture: 'draft',
  },
  {
    label: '2',
    title: '추가 응답 요청하기',
    description: '아직 정할 수 없는 이유를 보고 필요한 사람에게 요청해요.',
    route: 'host',
    fixture: 'pending',
  },
  {
    label: '3',
    title: '참석자 응답',
    description: '수진이 캘린더를 확인하고 가능한 시간을 제출해요.',
    route: 'invite',
    fixture: 'pending',
    participantToken: 'token-p-sujin',
  },
  {
    label: '4',
    title: '바뀐 결과 확인',
    description: '새 응답으로 달라진 결과와 판단 근거를 확인해요.',
    route: 'host',
    fixture: 'responded',
  },
  {
    label: '5',
    title: '회의 확정',
    description: '선택한 시간을 확인하고 직접 회의를 확정해요.',
    route: 'message',
    fixture: 'responded',
  },
]

export function DemoGuide({
  route,
  meeting,
  onOpen,
}: {
  route: AppRoute
  meeting: Meeting
  onOpen: (screen: DevScreen) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const currentStepIndex = getCurrentDemoStepIndex(route, meeting)

  return (
    <aside className={`demo-guide${isOpen ? ' is-open' : ''}`} aria-label="데모 가이드">
      <button
        type="button"
        className="demo-guide__toggle"
        aria-expanded={isOpen}
        aria-label={isOpen ? '데모 가이드 닫기' : '데모 가이드 열기'}
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? <X size={18} /> : <PanelsTopLeft size={18} />}
        <span>{isOpen ? '닫기' : '데모 가이드'}</span>
      </button>

      {isOpen ? (
        <div className="demo-guide__panel">
          <header className="demo-guide__header">
            <div>
              <span>약 3분</span>
              <strong>MeetCue 둘러보기</strong>
            </div>
            <p>원하는 장면부터 확인해도 흐름이 이어져요.</p>
          </header>
          <ol className="demo-guide__steps">
            {demoGuideSteps.map((step, index) => {
              const isCurrent = index === currentStepIndex
              return (
                <li key={`${step.route}-${step.label}`}>
                  <button
                    type="button"
                    className={isCurrent ? 'is-current' : ''}
                    aria-current={isCurrent ? 'step' : undefined}
                    onClick={() => {
                      onOpen(step)
                      setIsOpen(false)
                    }}
                  >
                    <span className="demo-guide__step-number">{step.label}</span>
                    <span className="demo-guide__step-copy">
                      <strong>{step.title}</strong>
                      <small>{step.description}</small>
                    </span>
                    <ChevronRight aria-hidden="true" size={17} />
                  </button>
                </li>
              )
            })}
          </ol>
          <button
            type="button"
            className="demo-guide__restart"
            onClick={() => {
              onOpen(demoGuideSteps[0])
              setIsOpen(false)
            }}
          >
            <RotateCcw aria-hidden="true" size={16} />
            처음부터 보기
          </button>
        </div>
      ) : null}
    </aside>
  )
}

function getCurrentDemoStepIndex(route: AppRoute, meeting: Meeting) {
  if (route === 'create') return 0
  if (route === 'invite' || route === 'invite-edit' || route === 'invite-done') return 2
  if (route === 'message' || (route === 'host' && meeting.status === 'confirmed')) return 4
  if (
    route === 'host' &&
    meeting.participants.find((participant) => participant.id === 'p-sujin')?.responseStatus ===
      'submitted'
  ) {
    return 3
  }
  if (route === 'host') return 1
  return -1
}
