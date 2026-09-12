import { type ReactNode, useState } from 'react'
import {
  Bell,
  CalendarCheck2,
  ChevronRight,
  Home,
  Inbox,
  Plus,
  ArrowUpRight,
  CheckCheck,
} from 'lucide-react'
import { formatDeadline } from '../domain/meeting'
import { getEntryStatus, getNotificationId, type WorkspaceEntry } from '../domain/workspace'
import { Button } from './ui/button'
import { PageHeader, EmptyState, MeetingRow, ListToolbar } from './WorkspaceComponents'
import { MainCard } from './ui/main-card'
import { BrandLink } from './BrandLink'
import './AccountScreens.css'

type AccountRoute = 'home' | 'meetings' | 'requests' | 'notifications' | 'create'
const navigation = [
  { route: 'home', label: '홈', icon: Home },
  { route: 'meetings', label: '내 회의', icon: CalendarCheck2 },
  { route: 'requests', label: '받은 요청', icon: Inbox },
] as const

type AccountDataProps = {
  entries: WorkspaceEntry[]
  onOpenMeeting: (id: string) => void
  onOpenRequest: (id: string) => void
}

export function GlobalAccountHeader({
  route,
  onNavigate,
  onCreate,
  mode = 'account',
  unreadCount = 0,
}: {
  route: string
  onNavigate: (route: AccountRoute) => void
  onCreate: () => void
  mode?: 'account' | 'focused'
  unreadCount?: number
}) {
  return (
    <header className="account-topbar">
      <div className="account-topbar__inner">
        <BrandLink />
        <nav className="account-desktop-nav" aria-label="주요 메뉴">
          {navigation.map((item) => (
            <a
              key={item.route}
              href={`#/${item.route}`}
              aria-current={route === item.route ? 'page' : undefined}
              className={route === item.route ? 'is-active' : ''}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="account-topbar__actions">
          <Button
            className="account-icon-button"
            variant="quiet"
            size="iconSmall"
            aria-label={unreadCount ? `알림, 읽지 않은 알림 ${unreadCount}개` : '알림'}
            onClick={() => onNavigate('notifications')}
          >
            <Bell size={20} aria-hidden="true" />
            {unreadCount > 0 ? <span className="account-notification-dot" /> : null}
          </Button>
          {mode === 'focused' ? (
            <a className="header-return" href="#/meetings">
              내 회의로
            </a>
          ) : (
            <Button className="account-create-button" size="action" onClick={onCreate}>
              <Plus size={18} aria-hidden="true" />
              <span>새 회의</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
export function AccountShell({
  route,
  onNavigate,
  onCreate,
  unreadCount,
  children,
}: {
  route: string
  onNavigate: (route: AccountRoute) => void
  onCreate: () => void
  unreadCount: number
  children: ReactNode
}) {
  return (
    <div className="account-shell">
      <GlobalAccountHeader
        route={route}
        onNavigate={onNavigate}
        onCreate={onCreate}
        unreadCount={unreadCount}
      />
      <main className="account-main" id="main-content">
        {children}
      </main>
      <nav className="account-mobile-nav" aria-label="모바일 주요 메뉴">
        {navigation.map(({ route: target, label, icon: Icon }) => (
          <a
            key={target}
            href={`#/${target}`}
            className={route === target ? 'is-active' : ''}
            aria-current={route === target ? 'page' : undefined}
          >
            <Icon size={21} aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
function SectionHead({
  id,
  title,
  count,
  href,
  label = '모두 보기',
}: {
  id: string
  title: string
  count?: number
  href: string
  label?: string
}) {
  return (
    <div className="account-section__head">
      <h2 id={id}>
        {title}
        {count != null ? <span>{count}</span> : null}
      </h2>
      <a href={href}>
        {label}
        <ChevronRight size={15} aria-hidden="true" />
      </a>
    </div>
  )
}
export function AccountHomeScreen({
  entries,
  onOpenMeeting,
  onOpenRequest,
  onCreate,
}: AccountDataProps & { onCreate: () => void }) {
  const pending = entries
    .filter((e) => getEntryStatus(e) === '응답 필요')
    .sort((a, b) => a.meeting.responseDeadline.localeCompare(b.meeting.responseDeadline))
  const active = entries.filter((e) => e.kind === 'host' && e.meeting.status === 'collecting')
  const drafts = entries.filter(
    (e) => e.kind === 'host' && e.meeting.status === 'draft' && e.meeting.title.trim(),
  )
  const confirmed = entries
    .filter((e) => e.meeting.status === 'confirmed')
    .sort((a, b) => {
      const time = (e: WorkspaceEntry) =>
        e.meeting.candidates.find((c) => c.id === e.meeting.confirmedCandidateId)?.startAt ?? ''
      return time(a).localeCompare(time(b))
    })
  const hasCoordination = pending.length + active.length > 0
  function renderRows(items: WorkspaceEntry[], action?: string) {
    return items
      .slice(0, 3)
      .map((entry) => (
        <MeetingRow
          key={entry.meeting.id}
          entry={entry}
          action={action}
          onOpen={() =>
            entry.kind === 'request'
              ? onOpenRequest(entry.meeting.id)
              : onOpenMeeting(entry.meeting.id)
          }
        />
      ))
  }
  return (
    <div className="account-page account-home">
      <PageHeader
        title={pending.length ? '먼저 답할 회의가 있어요' : '회의를 이어서 준비해요'}
        description={
          pending.length
            ? `응답이 필요한 요청 ${pending.length}건을 확인해 주세요.`
            : drafts.length
              ? '작성하던 회의와 확정된 일정을 확인하세요.'
              : '함께할 일정을 한곳에서 확인하세요.'
        }
      >
        <span className="home-today">
          {new Intl.DateTimeFormat('ko-KR', {
            timeZone: 'Asia/Seoul',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          }).format(new Date())}
        </span>
      </PageHeader>
      <div className="home-overview" aria-label="회의 요약">
        {[
          { label: '응답할 요청', count: pending.length, href: '#/requests' },
          { label: '조율 중인 회의', count: active.length, href: '#/meetings?status=collecting' },
          { label: '확정된 회의', count: confirmed.length, href: '#/meetings?status=confirmed' },
        ].map((item) => (
          <a key={item.label} href={item.href} data-count={item.count}>
            <span>
              {item.label}
              <ArrowUpRight size={16} aria-hidden="true" />
            </span>
            <strong>
              {item.count}
              <small>건</small>
            </strong>
          </a>
        ))}
      </div>
      <div className="home-columns">
        <MainCard material="soft" className="home-primary">
          {pending.length ? (
            <section className="account-section" aria-labelledby="home-requests">
              <SectionHead
                id="home-requests"
                title="내 응답이 필요해요"
                count={pending.length}
                href="#/requests"
              />
              {renderRows(pending, '응답하기')}
            </section>
          ) : null}
          {drafts.length ? (
            <section className="account-section" aria-labelledby="home-drafts">
              <SectionHead
                id="home-drafts"
                title="이어서 만들기"
                count={drafts.length}
                href="#/meetings?status=draft"
              />
              {renderRows(drafts, '이어서 만들기')}
            </section>
          ) : null}
          {active.length ? (
            <section className="account-section" aria-labelledby="home-active">
              <SectionHead
                id="home-active"
                title="조율 중인 회의"
                count={active.length}
                href="#/meetings?status=collecting"
              />
              {renderRows(active, '결과 확인')}
            </section>
          ) : null}
          {!hasCoordination && confirmed.length ? (
            <section className="account-section" aria-labelledby="home-confirmed-main">
              <SectionHead
                id="home-confirmed-main"
                title="확정된 일정"
                count={confirmed.length}
                href="#/meetings?status=confirmed"
              />
              {renderRows(confirmed)}
            </section>
          ) : null}
          {!hasCoordination && !drafts.length && !confirmed.length ? (
            <EmptyState
              title="첫 회의를 준비해 볼까요?"
              description="함께할 사람을 초대하고 가능한 시간을 모아보세요."
            >
              <Button onClick={onCreate}>회의 만들기</Button>
            </EmptyState>
          ) : null}
          {!pending.length ? (
            <a className="home-caught-up" href="#/requests">
              <CheckCheck size={18} aria-hidden="true" />
              <span>답할 요청을 모두 확인했어요</span>
              <ChevronRight size={16} aria-hidden="true" />
            </a>
          ) : null}
        </MainCard>
        <aside className="home-agenda" aria-label="일정과 새 회의">
          {hasCoordination ? (
            <>
              <SectionHead
                id="home-confirmed"
                title="확정된 일정"
                href="#/meetings?status=confirmed"
                label="내 회의"
              />
              {confirmed.length ? (
                renderRows(confirmed)
              ) : (
                <p className="agenda-empty">시간이 정해지면 여기에 모아드려요.</p>
              )}
            </>
          ) : null}
          <div className="home-create-prompt">
            <span className="home-create-eyebrow">새로운 일정</span>
            <strong>함께할 시간을 찾아요</strong>
            <p>
              가능한 시간을 모으면
              <br />
              일정 조율이 간단해져요.
            </p>
            <Button size="action" onClick={onCreate}>
              <Plus size={17} aria-hidden="true" />
              회의 만들기
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
export function MeetingsScreen({
  entries,
  onOpenMeeting,
  onCreate,
}: Pick<AccountDataProps, 'entries' | 'onOpenMeeting'> & { onCreate: () => void }) {
  const [filter, setFilter] = useState(() => {
    const status = new URLSearchParams(window.location.hash.split('?')[1]).get('status')
    return ['collecting', 'confirmed', 'draft'].includes(status ?? '') ? status! : 'all'
  })
  const [query, setQuery] = useState('')
  const hosted = entries.filter(
    (e) => e.kind === 'host' && (e.meeting.status !== 'draft' || e.meeting.title.trim()),
  )
  const filters = [
    { id: 'all', label: '전체', count: hosted.length },
    ...[
      { id: 'collecting', label: '조율 중' },
      { id: 'confirmed', label: '확정' },
      { id: 'draft', label: '작성 중' },
    ].map((f) => ({ ...f, count: hosted.filter((e) => e.meeting.status === f.id).length })),
  ]
  const filtered = hosted.filter(
    (e) =>
      (filter === 'all' || e.meeting.status === filter) &&
      e.meeting.title.toLowerCase().includes(query.trim().toLowerCase()),
  )
  return (
    <div className="account-page">
      <PageHeader title="내 회의" description="내가 만든 회의의 응답과 확정 일정을 확인하세요." />
      <ListToolbar
        query={query}
        setQuery={setQuery}
        label="회의 상태 필터"
        filters={filters}
        selected={filter}
        onFilter={setFilter}
      />
      <section className="account-list" aria-label="내 회의 목록">
        {filtered.length ? (
          filtered.map((entry) => (
            <MeetingRow
              key={entry.meeting.id}
              entry={entry}
              onOpen={() => onOpenMeeting(entry.meeting.id)}
            />
          ))
        ) : (
          <EmptyState
            title={query ? '검색 결과가 없어요' : '아직 이 상태의 회의가 없어요'}
            description={
              query
                ? '다른 회의 이름으로 검색해 보세요.'
                : '다른 상태를 선택하거나 새 회의를 만들어 보세요.'
            }
          />
        )}
      </section>
      {!hosted.length ? (
        <Button size="action" onClick={onCreate}>
          첫 회의 만들기
        </Button>
      ) : null}
    </div>
  )
}
export function RequestsScreen({
  entries,
  onOpenRequest,
}: Pick<AccountDataProps, 'entries' | 'onOpenRequest'>) {
  const [filter, setFilter] = useState('pending')
  const [query, setQuery] = useState('')
  const requests = entries.filter((e) => e.kind === 'request')
  const pending = requests.filter((e) => getEntryStatus(e) === '응답 필요')
  const done = requests.filter((e) => getEntryStatus(e) !== '응답 필요')
  const filtered = (filter === 'pending' ? pending : done)
    .filter((e) => e.meeting.title.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.meeting.responseDeadline.localeCompare(b.meeting.responseDeadline))
  return (
    <div className="account-page">
      <PageHeader
        title="받은 요청"
        description={
          pending.length
            ? '마감이 가까운 요청부터 가능한 시간을 알려주세요.'
            : '답할 요청을 모두 확인했어요. 완료한 응답과 확정 일정을 볼 수 있어요.'
        }
      />
      <ListToolbar
        query={query}
        setQuery={setQuery}
        label="응답 상태 필터"
        filters={[
          { id: 'pending', label: '응답 필요', count: pending.length },
          { id: 'done', label: '응답 완료·확정', count: done.length },
        ]}
        selected={filter}
        onFilter={setFilter}
      />
      <section className="account-list" aria-label="받은 요청 목록">
        {filtered.length ? (
          filtered.map((entry) => (
            <MeetingRow
              key={entry.meeting.id}
              entry={entry}
              onOpen={() => onOpenRequest(entry.meeting.id)}
            />
          ))
        ) : (
          <EmptyState
            title={
              query
                ? '검색 결과가 없어요'
                : filter === 'pending'
                  ? '답할 요청을 모두 확인했어요'
                  : '아직 완료한 응답이 없어요'
            }
            description={
              query
                ? '다른 회의 이름으로 검색해 보세요.'
                : '요청의 응답 상태가 바뀌면 이 목록에 반영돼요.'
            }
          >
            {!query && filter === 'pending' && done.length ? (
              <Button variant="quiet" onClick={() => setFilter('done')}>
                완료한 응답 {done.length}건 보기
              </Button>
            ) : null}
          </EmptyState>
        )}
      </section>
    </div>
  )
}
export function NotificationsScreen({
  entries,
  onOpenRequest,
  onOpenMeeting,
  readIds,
  onRead,
}: AccountDataProps & { readIds: string[]; onRead: (ids: string[]) => void }) {
  const notifications = entries.filter((e) => e.meeting.status !== 'draft')
  const unread = notifications.filter((e) => !readIds.includes(getNotificationId(e)))
  return (
    <div className="account-page">
      <PageHeader
        title="알림"
        description={
          unread.length
            ? `확인하지 않은 소식이 ${unread.length}개 있어요.`
            : '새로운 소식을 모두 확인했어요.'
        }
      >
        <Button
          variant="quiet"
          size="text"
          onClick={() => onRead(notifications.map(getNotificationId))}
          disabled={!unread.length}
        >
          <CheckCheck size={17} aria-hidden="true" />
          모두 읽음
        </Button>
      </PageHeader>
      <section className="notification-list" aria-label="알림 목록">
        {notifications.map((entry) => {
          const id = getNotificationId(entry)
          const isRead = readIds.includes(id)
          const status = getEntryStatus(entry)
          return (
            <button
              key={id}
              type="button"
              className={isRead ? 'is-read' : ''}
              onClick={() => {
                onRead([id])
                if (entry.kind === 'request') onOpenRequest(entry.meeting.id)
                else onOpenMeeting(entry.meeting.id)
              }}
            >
              <span className="notification-unread" aria-label={isRead ? '읽음' : '읽지 않음'} />
              <span>
                <small>
                  {status === '확정'
                    ? '일정 확정'
                    : status === '응답 필요'
                      ? '새 회의 요청'
                      : status === '응답 완료'
                        ? '응답 저장'
                        : '회의 응답 현황'}
                </small>
                <strong>{entry.meeting.title}</strong>
                <span>
                  {status === '확정'
                    ? '확정된 시간을 확인하세요.'
                    : status === '응답 필요'
                      ? `${formatDeadline(entry.meeting.responseDeadline)}까지 응답해 주세요.`
                      : status === '응답 완료'
                        ? '내가 보낸 응답을 확인하고 수정할 수 있어요.'
                        : '참석자 응답으로 정할 수 있는 시간을 확인하세요.'}
                </span>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          )
        })}
      </section>
    </div>
  )
}
