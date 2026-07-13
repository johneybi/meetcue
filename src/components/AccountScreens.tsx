import { type ReactNode, useState } from 'react'
import {
  Bell,
  CalendarCheck2,
  Check,
  ChevronRight,
  Home,
  Inbox,
  Plus,
  RotateCcw,
} from 'lucide-react'
import { formatSchedulingWindow, type Meeting } from '../domain/meeting'
import type { AccountScenarioId } from '../domain/accountScenarios'
import { Button } from './ui/button'
import './AccountScreens.css'

const meetCueEmblemUrl = `${import.meta.env.BASE_URL}brand/meetcue-emblem-64.png`

type AccountRoute = 'home' | 'meetings' | 'requests' | 'notifications' | 'create'

const accountNavigationItems: Array<{
  route: 'home' | 'meetings' | 'requests'
  label: string
  icon: typeof Home
}> = [
  { route: 'home', label: '홈', icon: Home },
  { route: 'meetings', label: '내 회의', icon: CalendarCheck2 },
  { route: 'requests', label: '받은 요청', icon: Inbox },
]

export function AccountShell({
  route,
  onNavigate,
  onCreate,
  children,
}: {
  route: string
  onNavigate: (route: AccountRoute) => void
  onCreate: () => void
  children: ReactNode
}) {
  return (
    <div className="account-shell">
      <GlobalAccountHeader route={route} onNavigate={onNavigate} onCreate={onCreate} />
      <main className="account-main">{children}</main>
      <nav className="account-mobile-nav" aria-label="주요 메뉴">
        {accountNavigationItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.route}
              type="button"
              className={route === item.route ? 'is-active' : ''}
              aria-current={route === item.route ? 'page' : undefined}
              onClick={() => onNavigate(item.route)}
            >
              <Icon size={21} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export function GlobalAccountHeader({
  route,
  onNavigate,
  onCreate,
  mode = 'account',
}: {
  route: AccountRoute | string
  onNavigate: (route: AccountRoute) => void
  onCreate: () => void
  mode?: 'account' | 'focused'
}) {
  const isFocused = mode === 'focused'

  return (
    <header className="account-topbar">
      <div className="account-topbar__inner">
        <button
          className="account-brand"
          type="button"
          onClick={isFocused ? onCreate : () => onNavigate('home')}
        >
          <img className="brand-dot" src={meetCueEmblemUrl} alt="" />
          <strong className="brand-wordmark">MeetCue</strong>
        </button>

        {isFocused ? (
          <div className="account-focused-context">회의 시간 결정</div>
        ) : (
          <nav className="account-desktop-nav" aria-label="주요 메뉴">
            {accountNavigationItems.map((item) => (
              <button
                key={item.route}
                type="button"
                className={route === item.route ? 'is-active' : ''}
                aria-current={route === item.route ? 'page' : undefined}
                onClick={() => onNavigate(item.route)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}

        <div className="account-topbar__actions">
          {isFocused ? (
            <Button
              className="account-restart-button"
              variant="quiet"
              size="text"
              onClick={onCreate}
            >
              <RotateCcw size={17} aria-hidden="true" />
              <span>처음부터</span>
            </Button>
          ) : (
            <>
              <Button
                className={`account-icon-button${route === 'notifications' ? ' is-active' : ''}`}
                variant="quiet"
                size="iconSmall"
                aria-label="알림"
                onClick={() => onNavigate('notifications')}
              >
                <Bell size={20} aria-hidden="true" />
                <span className="account-notification-dot" />
              </Button>
              <Button
                className={`account-create-button${route === 'create' ? ' is-current' : ''}`}
                size="action"
                aria-current={route === 'create' ? 'page' : undefined}
                onClick={onCreate}
              >
                <Plus size={18} aria-hidden="true" />
                <span>새 회의</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function AccountPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <header className="account-page-head">
      {eyebrow ? <span>{eyebrow}</span> : null}
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  )
}

export function AccountHomeScreen({
  meeting,
  onOpenRequest,
  onOpenMeeting,
  onOpenConfirmed,
  onCreate,
  onNavigate,
}: {
  meeting: Meeting
  onOpenRequest: () => void
  onOpenMeeting: () => void
  onOpenConfirmed: () => void
  onCreate: () => void
  onNavigate: (route: 'meetings' | 'requests') => void
}) {
  const responseTargets = meeting.participants.filter(
    (participant) => participant.id !== meeting.hostId,
  )
  const completedCount = responseTargets.filter(
    (participant) => participant.responseStatus === 'submitted',
  ).length
  const meetingActionLabel = meeting.status === 'confirmed' ? '확정 내용 보기' : '결과 확인'

  return (
    <div className="account-page account-home">
      <AccountPageHeader
        title="지금 확인할 일이 있어요"
        description="답할 요청과 내가 만든 회의의 변화를 한곳에서 확인하세요."
      />
      <section className="account-section" aria-labelledby="home-action-title">
        <div className="account-section__head">
          <h2 id="home-action-title">먼저 확인해 주세요</h2>
          <Button variant="quiet" size="text" onClick={() => onNavigate('requests')}>
            모두 보기
          </Button>
        </div>
        <div className="account-task-stack">
          <button
            className="account-task-row account-task-row--primary"
            type="button"
            onClick={onOpenRequest}
          >
            <span className="account-task-icon account-task-icon--request">
              <Inbox size={20} aria-hidden="true" />
            </span>
            <span className="account-task-copy">
              <span className="account-task-kicker">오늘 18:00까지 응답</span>
              <strong>온보딩 개선안 논의</strong>
              <small>피플팀 지우 · 1시간</small>
            </span>
            <span className="account-task-action">
              응답하기
              <ChevronRight size={18} aria-hidden="true" />
            </span>
          </button>
          <button className="account-task-row" type="button" onClick={onOpenMeeting}>
            <span className="account-task-icon account-task-icon--meeting">
              <CalendarCheck2 size={20} aria-hidden="true" />
            </span>
            <span className="account-task-copy">
              <span className="account-task-kicker">
                {meeting.status === 'confirmed'
                  ? '회의 시간 확정'
                  : `새 응답 · ${completedCount}/${responseTargets.length}명 완료`}
              </span>
              <strong>{meeting.title}</strong>
              <small>현재 응답으로 정할 수 있는 시간을 확인하세요</small>
            </span>
            <span className="account-task-action">
              {meetingActionLabel}
              <ChevronRight size={18} aria-hidden="true" />
            </span>
          </button>
        </div>
      </section>
      <section className="account-section" aria-labelledby="home-upcoming-title">
        <div className="account-section__head">
          <h2 id="home-upcoming-title">다가오는 회의</h2>
          <Button variant="quiet" size="text" onClick={() => onNavigate('meetings')}>
            내 회의
          </Button>
        </div>
        <button className="account-upcoming-row" type="button" onClick={onOpenConfirmed}>
          <span className="account-date-tile account-date-tile--confirmed">
            <small>7월</small>
            <strong>15</strong>
          </span>
          <span>
            <strong>3분기 목표 점검</strong>
            <small>오전 10:00 · 1시간 · 프로덕트팀</small>
          </span>
          <span className="account-status account-status--done">확정</span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </section>
      <Button
        className="account-empty-action"
        variant="secondary"
        size="action"
        onClick={onCreate}
      >
        <Plus size={19} aria-hidden="true" />
        다른 회의 만들기
      </Button>
    </div>
  )
}

export function MeetingsScreen({
  meeting,
  onOpenMeeting,
}: {
  meeting: Meeting
  onOpenMeeting: (scenarioId: AccountScenarioId) => void
}) {
  const [filter, setFilter] = useState<'all' | 'active' | 'confirmed'>('all')
  const responseTargets = meeting.participants.filter(
    (participant) => participant.id !== meeting.hostId,
  )
  const completedCount = responseTargets.filter(
    (participant) => participant.responseStatus === 'submitted',
  ).length

  return (
    <div className="account-page">
      <AccountPageHeader eyebrow="내가 만든 회의" title="진행 상황을 이어서 확인하세요" />
      <div className="account-filter-tabs" role="tablist" aria-label="내 회의 필터">
        {(['all', 'active', 'confirmed'] as const).map((value, index) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            className={filter === value ? 'is-active' : ''}
            onClick={() => setFilter(value)}
          >
            {['전체 2', '진행 중 1', '확정 1'][index]}
          </button>
        ))}
      </div>
      <section className="account-list" aria-label="내가 만든 회의 목록">
        {filter !== 'confirmed' ? (
          <button
            className="account-list-row"
            type="button"
            onClick={() => onOpenMeeting('product-review')}
          >
            <span className="account-date-tile">
              <small>7월</small>
              <strong>15</strong>
            </span>
            <span className="account-list-row__copy">
              <strong>{meeting.title}</strong>
              <span>{formatSchedulingWindow(meeting.schedulingWindow)}</span>
              <small>
                {completedCount}/{responseTargets.length}명 응답 · 새 응답이 들어왔어요
              </small>
            </span>
            <span className="account-status account-status--attention">결정 필요</span>
            <ChevronRight size={19} aria-hidden="true" />
          </button>
        ) : null}
        {filter !== 'active' ? (
          <button
            className="account-list-row"
            type="button"
            onClick={() => onOpenMeeting('quarterly-goals')}
          >
            <span className="account-date-tile account-date-tile--confirmed">
              <small>7월</small>
              <strong>15</strong>
            </span>
            <span className="account-list-row__copy">
              <strong>3분기 목표 점검</strong>
              <span>7. 15. (수) 오전 10:00</span>
              <small>참석자 6명 · 확정 알림 전송 완료</small>
            </span>
            <span className="account-status account-status--done">확정</span>
            <ChevronRight size={19} aria-hidden="true" />
          </button>
        ) : null}
      </section>
    </div>
  )
}

export function RequestsScreen({
  onOpenRequest,
}: {
  meeting: Meeting
  onOpenRequest: (scenarioId: AccountScenarioId, responseState?: 'new' | 'done') => void
}) {
  const [filter, setFilter] = useState<'pending' | 'done'>('pending')
  return (
    <div className="account-page">
      <AccountPageHeader
        eyebrow="받은 요청"
        title="내 응답이 필요한 회의"
        description="마감이 가까운 요청부터 보여드려요."
      />
      <div className="account-filter-tabs" role="tablist" aria-label="받은 요청 필터">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'pending'}
          className={filter === 'pending' ? 'is-active' : ''}
          onClick={() => setFilter('pending')}
        >
          응답 필요 1
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'done'}
          className={filter === 'done' ? 'is-active' : ''}
          onClick={() => setFilter('done')}
        >
          응답 완료 1
        </button>
      </div>
      <section className="account-list" aria-label="받은 회의 요청 목록">
        {filter === 'pending' ? (
          <button
            className="account-list-row"
            type="button"
            onClick={() => onOpenRequest('onboarding')}
          >
            <span className="account-date-tile account-date-tile--request">
              <small>마감</small>
              <strong>13</strong>
            </span>
            <span className="account-list-row__copy">
              <strong>온보딩 개선안 논의</strong>
              <span>피플팀 지우</span>
              <small>7. 14. - 7. 16. · 1시간 · 오늘 18:00까지</small>
            </span>
            <span className="account-status account-status--attention">응답 필요</span>
            <ChevronRight size={19} aria-hidden="true" />
          </button>
        ) : (
          <button
            className="account-list-row"
            type="button"
            onClick={() => onOpenRequest('design-qa', 'done')}
          >
            <span className="account-date-tile account-date-tile--complete">
              <small>제출</small>
              <Check size={21} aria-hidden="true" />
            </span>
            <span className="account-list-row__copy">
              <strong>디자인 QA 기준 정리</strong>
              <span>디자인팀 서연</span>
              <small>7. 14. - 7. 16. · 응답을 수정할 수 있어요</small>
            </span>
            <span className="account-status account-status--done">응답 완료</span>
            <ChevronRight size={19} aria-hidden="true" />
          </button>
        )}
      </section>
    </div>
  )
}

export function NotificationsScreen({
  meeting,
  onOpenRequest,
  onOpenMeeting,
}: {
  meeting: Meeting
  onOpenRequest: (scenarioId: AccountScenarioId, responseState?: 'new' | 'done') => void
  onOpenMeeting: (scenarioId: AccountScenarioId) => void
}) {
  return (
    <div className="account-page">
      <AccountPageHeader eyebrow="알림" title="새로 바뀐 내용을 확인하세요" />
      <section className="notification-list" aria-label="알림 목록">
        <button type="button" onClick={() => onOpenRequest('onboarding')}>
          <span className="notification-unread" />
          <span>
            <strong>온보딩 개선안 논의 응답 요청이 도착했어요</strong>
            <small>피플팀 지우 · 10분 전</small>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onOpenMeeting('product-review')}>
          <span className="notification-unread" />
          <span>
            <strong>{meeting.title}에 새 응답이 들어왔어요</strong>
            <small>현재 응답을 기준으로 결과가 다시 계산됐어요 · 1시간 전</small>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onOpenMeeting('quarterly-goals')}>
          <span className="notification-unread" />
          <span>
            <strong>3분기 목표 점검 시간이 확정됐어요</strong>
            <small>7. 15. (수) 오전 10:00 · 3시간 전</small>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <button
          className="is-read"
          type="button"
          onClick={() => onOpenRequest('design-qa', 'done')}
        >
          <span className="notification-unread" />
          <span>
            <strong>디자인 QA 기준 정리 응답이 저장됐어요</strong>
            <small>필요하면 마감 전까지 수정할 수 있어요 · 어제</small>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <button className="is-read" type="button" onClick={() => onOpenMeeting('product-review')}>
          <span className="notification-unread" />
          <span>
            <strong>제품 리뷰 회의 응답 마감이 내일이에요</strong>
            <small>아직 1명이 응답하지 않았어요 · 어제</small>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </section>
    </div>
  )
}
