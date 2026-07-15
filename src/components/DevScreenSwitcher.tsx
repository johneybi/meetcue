import { useState } from 'react'
import { PanelsTopLeft, X } from 'lucide-react'
import type { AppRoute } from '../lib/appRoutes'
import './DevScreenSwitcher.css'

export type DevScreen = {
  label: string
  route: AppRoute
  fixture: 'draft' | 'waiting' | 'collecting' | 'pending' | 'responded' | 'confirmed' | 'current'
  participantToken?: string
}

const devScreenGroups: Array<{ label: string; screens: DevScreen[] }> = [
  {
    label: '핵심 시연',
    screens: [
      { label: '1. 생성', route: 'create', fixture: 'draft' },
      { label: '2. 추가 응답 요청', route: 'host', fixture: 'pending' },
      {
        label: '3. 수진 응답',
        route: 'invite',
        fixture: 'pending',
        participantToken: 'token-p-sujin',
      },
      { label: '4. 재판정 결과', route: 'host', fixture: 'responded' },
      { label: '5. 최종 확정', route: 'message', fixture: 'responded' },
    ],
  },
  {
    label: '주최자',
    screens: [
      { label: '회의 만들기', route: 'create', fixture: 'draft' },
      { label: '요청 발송 완료', route: 'share', fixture: 'collecting' },
      { label: '응답 대기', route: 'host', fixture: 'waiting' },
      { label: '결과 확인', route: 'host', fixture: 'collecting' },
      { label: '참석 기준', route: 'criteria', fixture: 'collecting' },
      { label: '확정 안내', route: 'host', fixture: 'confirmed' },
    ],
  },
  {
    label: '참석자 fixture',
    screens: [
      {
        label: '수진 · 신규',
        route: 'invite',
        fixture: 'collecting',
        participantToken: 'token-p-sujin',
      },
      {
        label: '민수 · 수정',
        route: 'invite-edit',
        fixture: 'collecting',
        participantToken: 'token-p-minsu',
      },
      {
        label: '서연 · 수정',
        route: 'invite-edit',
        fixture: 'collecting',
        participantToken: 'token-p-seoyeon',
      },
      {
        label: '준호 · 수정',
        route: 'invite-edit',
        fixture: 'collecting',
        participantToken: 'token-p-junho',
      },
      {
        label: '하나 · 수정',
        route: 'invite-edit',
        fixture: 'collecting',
        participantToken: 'token-p-hana',
      },
      {
        label: '민수 · 완료',
        route: 'invite-done',
        fixture: 'collecting',
        participantToken: 'token-p-minsu',
      },
      { label: '잘못된 링크', route: 'invite', fixture: 'collecting' },
    ],
  },
  {
    label: '후속 제품 · P0 보류',
    screens: [
      { label: '홈', route: 'home', fixture: 'collecting' },
      { label: '내 회의', route: 'meetings', fixture: 'collecting' },
      { label: '받은 요청', route: 'requests', fixture: 'collecting' },
      { label: '알림', route: 'notifications', fixture: 'collecting' },
    ],
  },
]

export function DevScreenSwitcher({
  route,
  participantToken,
  onOpen,
}: {
  route: AppRoute
  participantToken?: string
  onOpen: (screen: DevScreen) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <aside className={`dev-screen-switcher${isOpen ? ' is-open' : ''}`} aria-label="개발 화면 이동">
      <button
        type="button"
        className="dev-screen-switcher__toggle"
        aria-expanded={isOpen}
        aria-label={isOpen ? '개발 화면 이동 닫기' : '개발 화면 이동 열기'}
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? <X size={18} /> : <PanelsTopLeft size={18} />}
        <span>{isOpen ? '닫기' : '화면'}</span>
      </button>
      {isOpen ? (
        <div className="dev-screen-switcher__panel">
          <header>
            <span>DEV</span>
            <strong>화면 바로가기</strong>
          </header>
          {devScreenGroups.map((group) => (
            <section key={group.label}>
              <p>{group.label}</p>
              <div>
                {group.screens.map((screen) => {
                  const isCurrent =
                    route === screen.route &&
                    (screen.participantToken == null
                      ? participantToken == null
                      : participantToken === screen.participantToken)
                  return (
                    <button
                      key={`${screen.route}-${screen.label}`}
                      type="button"
                      className={isCurrent ? 'is-current' : ''}
                      onClick={() => {
                        onOpen(screen)
                        setIsOpen(false)
                      }}
                    >
                      {screen.label}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </aside>
  )
}
