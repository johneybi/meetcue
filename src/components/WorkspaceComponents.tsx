import type { ReactNode } from 'react'
import { CalendarCheck2, ChevronRight, FilePenLine, Search } from 'lucide-react'
import {
  formatCandidateTime,
  formatDeadline,
  formatMeetingDuration,
  formatSchedulingWindow,
} from '../domain/meeting'
import { getEntryStatus, type WorkspaceEntry } from '../domain/workspace'
import { CalendarDate } from './ui/calendar-date'
import { Input } from './ui/input'

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <header className="account-page-head">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </header>
  )
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="account-empty" role="status">
      <CalendarCheck2 size={28} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  )
}
function DateTile({ entry }: { entry: WorkspaceEntry }) {
  const m = entry.meeting
  const selected = m.candidates.find((c) => c.id === m.confirmedCandidateId)
  const date =
    selected?.startAt ??
    (entry.kind === 'request'
      ? m.responseDeadline
      : `${m.schedulingWindow.startDate}T00:00:00+09:00`)
  if (m.status === 'draft')
    return (
      <span className="account-date-tile">
        <FilePenLine size={24} aria-hidden="true" />
      </span>
    )
  return <CalendarDate compact value={date} className="account-date-tile" />
}
export function MeetingRow({
  entry,
  onOpen,
  action,
}: {
  entry: WorkspaceEntry
  onOpen: () => void
  action?: string
}) {
  const m = entry.meeting
  const status = getEntryStatus(entry)
  const recipients = m.participants.filter((p) => p.id !== m.hostId)
  const completed = recipients.filter((p) => p.responseStatus === 'submitted').length
  const candidate = m.candidates.find((c) => c.id === m.confirmedCandidateId)
  return (
    <button className="account-meeting-row" type="button" onClick={onOpen}>
      <DateTile entry={entry} />
      <span className="account-row-copy">
        <strong>{m.title || '이름 없는 회의'}</strong>
        <span>
          {candidate
            ? formatCandidateTime(candidate)
            : m.status === 'draft'
              ? '작성한 내용부터 이어서 만들 수 있어요'
              : `${formatSchedulingWindow(m.schedulingWindow)} · ${formatMeetingDuration(m.durationMinutes)}`}
        </span>
        {!candidate ? (
          <small>
            {entry.kind === 'request'
              ? `${m.hostLabel} · ${formatDeadline(m.responseDeadline)} 마감`
              : m.status === 'draft'
                ? '이 브라우저에 임시 저장됨'
                : `${completed}/${recipients.length}명 응답`}
          </small>
        ) : null}
      </span>
      <span className="account-row-end">
        <span className="account-status" data-status={status}>
          {status}
        </span>
        {action ? <span className="account-row-action">{action}</span> : null}
      </span>
      <ChevronRight size={18} aria-hidden="true" />
    </button>
  )
}
export function ListToolbar({
  query,
  setQuery,
  label,
  filters,
  selected,
  onFilter,
}: {
  query: string
  setQuery: (value: string) => void
  label: string
  filters: { id: string; label: string; count: number }[]
  selected: string
  onFilter: (value: string) => void
}) {
  return (
    <div className="account-list-toolbar">
      <div className="account-filter-tabs" role="group" aria-label={label}>
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={selected === f.id}
            className={selected === f.id ? 'is-active' : ''}
            onClick={() => onFilter(f.id)}
          >
            {f.label}
            <span>{f.count}</span>
          </button>
        ))}
      </div>
      <label className="account-search">
        <Search size={17} aria-hidden="true" />
        <Input
          type="search"
          aria-label="회의 검색"
          placeholder="회의 이름 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
    </div>
  )
}
