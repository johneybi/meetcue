import type { ReactNode } from 'react'
import { formatMeetingDuration, type Meeting } from '../domain/meeting'
import { GlobalAccountHeader } from './AccountScreens'
import type { AppRoute } from '../lib/appRoutes'
import { Badge } from './ui/badge'
import './HostShell.css'

export type HostCoordinationState =
  'HOST_DRAFT' | 'HOST_SHARE_READY' | 'HOST_WAITING_EMPTY' | 'HOST_DECISION' | 'HOST_CONFIRMED'

const hostStateCopy: Record<HostCoordinationState, { title: string; description: string }> = {
  HOST_DRAFT: {
    title: '회의 정보를 입력해 주세요',
    description: '참석자가 응답하기 전에 회의 정보와 참석 기준을 정해요.',
  },
  HOST_SHARE_READY: {
    title: '참석자에게 응답을 요청했어요',
    description: '참석자는 받은 요청에서 가능한 시간을 알려줄 수 있어요.',
  },
  HOST_WAITING_EMPTY: {
    title: '아직 받은 응답이 없어요',
    description: '첫 응답이 저장되면 정할 수 있는 시간을 확인할 수 있어요.',
  },
  HOST_DECISION: {
    title: '지금 정할 수 있는 시간을 확인해 보세요',
    description: '바로 정할 수 있는 시간과 아직 응답이 필요한 시간을 나눠서 보여드려요.',
  },
  HOST_CONFIRMED: {
    title: '회의 시간을 확정했어요',
    description: '확정 알림을 참석자에게 보낼 수 있어요.',
  },
}

export function HostShell({
  meeting,
  state,
  route,
  onNavigate,
  onCreate,
  children,
}: {
  meeting: Meeting
  state: HostCoordinationState
  route: AppRoute
  onNavigate: (route: AppRoute) => void
  onCreate: () => void
  children: ReactNode
}) {
  const copy = hostStateCopy[state]
  const navigationItems = getHostNavigationItems(route)
  const isWaiting = state === 'HOST_WAITING_EMPTY'
  const contextDescription =
    route === 'create'
      ? '회의 요청을 만드는 중'
      : `${meeting.participants.filter((participant) => participant.id !== meeting.hostId).length}명에게 ${formatMeetingDuration(meeting.durationMinutes)} 회의 시간을 묻는 중`

  return (
    <div className="account-shell host-account-shell">
      <GlobalAccountHeader
        route={route}
        onNavigate={onNavigate}
        onCreate={onCreate}
        mode="focused"
      />
      <div
        className={`tds-app host-shell${route === 'create' ? ' host-shell--create' : ''}${
          route === 'share' ? ' host-shell--share' : ''
        }${route === 'message' || state === 'HOST_CONFIRMED' ? ' host-shell--message' : ''}${
          route === 'host' && isWaiting ? ' host-shell--waiting' : ''
        }${route === 'host' && state === 'HOST_DECISION' ? ' host-shell--decision' : ''}`}
      >
        <header className="host-context-bar" aria-label="회의 조율 상태">
          <div className="host-context-main">
            <strong>{meeting.title || '새 회의 만들기'}</strong>
            <span>{contextDescription}</span>
          </div>
          {navigationItems.length > 0 ? (
            <div className="host-context-actions">
              {navigationItems.map((item) => (
                <button
                  key={item.route}
                  className={route === item.route ? 'is-active' : ''}
                  type="button"
                  onClick={() => onNavigate(item.route)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </header>

        <main className={`host-stage${route === 'create' ? ' host-stage--create' : ''}`}>
          {route !== 'create' &&
          route !== 'share' &&
          route !== 'message' &&
          route !== 'criteria' &&
          state !== 'HOST_CONFIRMED' &&
          !(route === 'host' && isWaiting) &&
          !(route === 'host' && state === 'HOST_DECISION') ? (
            <section className="host-stage__head">
              <Badge className="state-badge" tone={getHostStateTone(state)}>
                {getHostStateLabel(state)}
              </Badge>
              <h1>{copy.title}</h1>
              <p>{copy.description}</p>
            </section>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  )
}

function getHostNavigationItems(route: AppRoute) {
  if (route === 'create') return []
  if (route === 'share') {
    return [
      { route: 'criteria' as const, label: '참석 기준 보기' },
      { route: 'host' as const, label: '응답 현황 보기' },
    ]
  }
  if (route === 'criteria') {
    return [
      { route: 'host' as const, label: '결과로 돌아가기' },
      { route: 'share' as const, label: '응답 현황 보기' },
    ]
  }
  if (route === 'message') return [{ route: 'host' as const, label: '회의 결과 보기' }]
  return [{ route: 'share' as const, label: '응답 현황 보기' }]
}

function getHostStateLabel(state: HostCoordinationState) {
  if (state === 'HOST_DRAFT') return '요청 작성'
  if (state === 'HOST_SHARE_READY') return '요청 완료'
  if (state === 'HOST_WAITING_EMPTY') return '응답 전'
  if (state === 'HOST_DECISION') return '결과 확인'
  if (state === 'HOST_CONFIRMED') return '회의 시간 확정'
  return '결과 확인'
}

function getHostStateTone(state: HostCoordinationState): 'success' | 'info' {
  if (state === 'HOST_DECISION' || state === 'HOST_CONFIRMED') return 'success'
  return 'info'
}
