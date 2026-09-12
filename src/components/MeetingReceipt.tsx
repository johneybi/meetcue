import { type ReactNode, useId } from 'react'
import { Check } from 'lucide-react'
import type { Candidate } from '../domain/meeting'
import { MainCard } from './ui/main-card'
import { CalendarDate, TimeRange } from './ui/calendar-date'
import './MeetingReceipt.css'

export function MeetingSchedule({ title, candidate }: { title: string; candidate: Candidate }) {
  return (
    <div className="meeting-schedule">
      <h2>{title}</h2>
      <CalendarDate value={candidate.startAt} className="meeting-schedule__date" />
      <TimeRange
        start={candidate.startAt}
        end={candidate.endAt}
        className="meeting-schedule__time"
      />
      <span className="meeting-schedule__zone">한국 시간 기준</span>
    </div>
  )
}

export function MeetingReceipt({
  title,
  description,
  confirmed,
  children,
  actions,
}: {
  title: string
  description: string
  confirmed: boolean
  children: ReactNode
  actions: ReactNode
}) {
  const titleId = useId()
  return (
    <MainCard material="soft" className="meeting-receipt" aria-labelledby={titleId}>
      <header className="meeting-receipt__header">
        <span className="meeting-receipt__state" data-confirmed={confirmed}>
          {confirmed ? <Check size={16} aria-hidden="true" /> : null}
          {confirmed ? '일정 확정' : '최종 확인'}
        </span>
        <h1 id={titleId}>{title}</h1>
        <p>{description}</p>
      </header>
      {children}
      <footer className="meeting-receipt__actions">{actions}</footer>
    </MainCard>
  )
}
