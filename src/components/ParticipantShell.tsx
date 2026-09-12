import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CalendarDays, Clock3 } from 'lucide-react'
import { selectResponseCandidates, type ResponseSubmission } from '../domain/participantResponse'
import { ParticipantCandidateResponse } from './ParticipantCandidateResponse'
import { Button } from './ui/button'
import './ParticipantResponseFlow.css'
import {
  deriveAvailabilitySlots,
  deriveParticipantResponses,
  getAvailabilityStateForSlot,
  type AvailabilitySlot,
} from '../domain/availability'
import type {
  AvailabilityWindow,
  Candidate,
  Meeting,
  Participant,
  ResponseValue,
} from '../domain/meeting'
import { useParticipantAvailabilityResponse } from '../hooks/useParticipantAvailabilityResponse'
import { ParticipantAvailabilityPanel } from './ParticipantAvailabilityPanel'
import { ParticipantConfirmedScreen } from './ParticipantConfirmedScreen'
import { ParticipantDoneScreen } from './ParticipantDoneScreen'
import { ParticipantPageShell } from './ParticipantPageShell'

export type ParticipantCoordinationState =
  'PARTICIPANT_NEW' | 'PARTICIPANT_EDITING' | 'PARTICIPANT_DONE' | 'PARTICIPANT_CONFIRMED'

type ParticipantShellProps = {
  meeting: Meeting
  participant: Participant
  state: ParticipantCoordinationState
  now: Date
  onSubmit: (participantDraftWindows: AvailabilityWindow[], submission: ResponseSubmission) => void
  preferredCandidateId?: string
  onEdit: () => void
  onExit: () => void
  showPrototypeReturn: boolean
}

const participantResponseLabels: Record<ResponseValue, string> = {
  available: '가능해요',
  adjustable: '옮겨서 참석',
  unavailable: '어려워요',
}

export function ParticipantShell({
  meeting,
  participant,
  state,
  now,
  onSubmit,
  preferredCandidateId,
  onEdit,
  onExit,
  showPrototypeReturn,
}: ParticipantShellProps) {
  const calendarDates = [
    ...new Set(
      deriveAvailabilitySlots(meeting.availabilityWindows, meeting.hostId).map((slot) =>
        calendarDateFormatter.format(new Date(slot.startAt)),
      ),
    ),
  ].sort()
  const getCalendarEvent = (slot: AvailabilitySlot) =>
    getSimulatedCalendarEvent(slot, calendarDates)
  const {
    slots,
    draftWindows,
    hasBaseline,
    inputSource,
    manuallyEditedSlotStarts,
    editorStatus,
    remainingCount,
    isSaveConfirmationOpen,
    startManualEntry,
    applyCalendar,
    fillRemainingFromCalendar,
    paintSlot,
    resetBaseline,
    openSaveConfirmation,
    closeSaveConfirmation,
  } = useParticipantAvailabilityResponse({
    meeting,
    participant,
    isCalendarBusy: (slot) => getCalendarEvent(slot) != null,
  })

  const [mode, setMode] = useState<'candidates' | 'range'>(() =>
    participant.responseStatus === 'submitted' && participant.responseScope !== 'candidates'
      ? 'range'
      : 'candidates',
  )
  const [quickCandidates] = useState(() => {
    const savedIds = participant.responseCandidateIds ?? meeting.responseProposalIds
    const saved =
      savedIds == null
        ? []
        : meeting.candidates.filter((c) => savedIds.includes(c.id) || c.id === preferredCandidateId)
    return selectResponseCandidates(
      saved.length > 0 ? saved : meeting.candidates,
      preferredCandidateId,
    )
  })
  const flowRef = useRef<HTMLElement>(null)
  const previousMode = useRef(mode)
  useEffect(() => {
    if (previousMode.current !== mode) flowRef.current?.querySelector('h1')?.focus()
    previousMode.current = mode
  }, [mode])
  const [answers, setAnswers] = useState<Record<string, ResponseValue | undefined>>(() =>
    Object.fromEntries(
      meeting.responses
        .filter((r) => r.participantId === participant.id)
        .map((r) => [r.candidateId, r.value]),
    ),
  )
  function answerCandidate(candidate: Candidate, value: ResponseValue) {
    setAnswers((current) => ({ ...current, [candidate.id]: value }))
    paintSlot(candidate, value)
  }
  function returnToCandidates() {
    const currentResponses = deriveParticipantResponses(
      participant.id,
      quickCandidates,
      draftWindows,
      now.toISOString(),
    )
    setAnswers((current) =>
      Object.fromEntries(
        quickCandidates.map((candidate) => [
          candidate.id,
          current[candidate.id] == null
            ? undefined
            : currentResponses.find((r) => r.candidateId === candidate.id)?.value,
        ]),
      ),
    )
    closeSaveConfirmation()
    setMode('candidates')
  }

  if (state === 'PARTICIPANT_DONE') {
    return (
      <ParticipantDoneScreen
        meeting={meeting}
        participant={participant}
        onEdit={onEdit}
        onExit={onExit}
        showPrototypeReturn={showPrototypeReturn}
      />
    )
  }

  if (state === 'PARTICIPANT_CONFIRMED') {
    return (
      <ParticipantConfirmedScreen meeting={meeting} participant={participant} onExit={onExit} />
    )
  }

  const simulatedCalendarEventCount = new Set(
    slots
      .map(getCalendarEvent)
      .filter((event) => event != null)
      .map((event) => event.id),
  ).size
  const deadlinePassed = new Date(meeting.responseDeadline).getTime() <= now.getTime()

  return (
    <ParticipantPageShell onExit={onExit}>
      <main
        ref={flowRef}
        className={`response-flow${mode === 'range' ? ' response-flow--range' : ''}`}
      >
        <aside className="response-flow-context" aria-label="회의 정보">
          <span className="response-flow-eyebrow">회의 초대</span>
          <h2>{meeting.title}</h2>
          <p>
            {participant.name}님, {meeting.hostLabel}
            님이 시간을 묻고 있어요
          </p>
          <dl>
            <div>
              <dt>
                <Clock3 size={16} />
                소요 시간
              </dt>
              <dd>{meeting.durationMinutes}분</dd>
            </div>
            <div>
              <dt>
                <CalendarDays size={16} />
                응답 마감
              </dt>
              <dd>
                {new Intl.DateTimeFormat('ko-KR', {
                  timeZone: 'Asia/Seoul',
                  month: 'numeric',
                  day: 'numeric',
                  hour: 'numeric',
                }).format(new Date(meeting.responseDeadline))}
              </dd>
            </div>
          </dl>
          {meeting.purpose ? (
            <details>
              <summary>회의 내용 보기</summary>
              <p>{meeting.purpose}</p>
            </details>
          ) : null}
          {deadlinePassed ? (
            <p className="response-flow-deadline">
              응답 마감이 지났어요. 확정 전까지 수정할 수 있어요.
            </p>
          ) : null}
        </aside>
        {mode === 'candidates' && quickCandidates.length > 0 ? (
          <ParticipantCandidateResponse
            participantName={participant.name}
            isEditing={state === 'PARTICIPANT_EDITING'}
            candidates={quickCandidates}
            answers={answers}
            onAnswer={answerCandidate}
            onExpand={() => setMode('range')}
            onSubmit={() =>
              onSubmit(draftWindows, {
                scope: 'candidates',
                candidateIds: quickCandidates.map((c) => c.id),
              })
            }
            getCalendarHint={(candidate) => {
              const events = [
                ...new Set(
                  slots
                    .filter(
                      (slot) => slot.startAt >= candidate.startAt && slot.endAt <= candidate.endAt,
                    )
                    .map(getCalendarEvent)
                    .filter((e) => e != null)
                    .map((e) => e.title),
                ),
              ]
              return events.length > 0 ? events.join(', ') : null
            }}
          />
        ) : (
          <section className="response-flow-range">
            {quickCandidates.length > 0 ? (
              <Button variant="quiet" size="text" onClick={returnToCandidates}>
                <ArrowLeft size={16} />
                처음 후보로 돌아가기
              </Button>
            ) : null}
            <header className="response-flow-heading">
              <h1 tabIndex={-1}>가능한 시간을 더 알려주세요</h1>
              <p>
                주최자가 가능한 시간 안에서 찾아요.
                <br />
                앞에서 고른 응답은 그대로 가져왔어요.
              </p>
            </header>
            <ParticipantAvailabilityPanel
              participant={participant}
              submissionStatus={editorStatus}
              title={`${participant.name}님의 시간표`}
              submitLabel={state === 'PARTICIPANT_EDITING' ? '수정 내용 저장하기' : '응답 저장하기'}
              slots={slots}
              stateLabels={participantResponseLabels}
              hasBaseline={hasBaseline}
              inputSource={inputSource}
              calendarEventCount={simulatedCalendarEventCount}
              availableSlotCount={
                slots.filter(
                  (slot) =>
                    getAvailabilityStateForSlot(draftWindows, participant.id, slot) === 'available',
                ).length
              }
              remainingCount={remainingCount}
              isSaveConfirmationOpen={isSaveConfirmationOpen}
              getState={(slot) =>
                getAvailabilityStateForSlot(draftWindows, participant.id, slot) ?? null
              }
              getCalendarEvent={getCalendarEvent}
              getIsManuallyEdited={(slot) => manuallyEditedSlotStarts.has(slot.startAt)}
              onPaintSlot={paintSlot}
              onStartManualEntry={startManualEntry}
              onApplyCalendar={applyCalendar}
              onFillRemainingFromCalendar={fillRemainingFromCalendar}
              onResetBaseline={resetBaseline}
              onCloseSaveConfirmation={closeSaveConfirmation}
              onOpenSaveConfirmation={openSaveConfirmation}
              onSubmit={() => onSubmit(draftWindows, { scope: 'range' })}
            />
          </section>
        )}
      </main>
    </ParticipantPageShell>
  )
}

const calendarDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function getSimulatedCalendarEvent(slot: AvailabilitySlot, calendarDates: string[]) {
  const date = new Date(slot.startAt)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? 0)
  const dayIndex = calendarDates.indexOf(calendarDateFormatter.format(date))
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)

  const event = simulatedCalendarEvents.find(
    (calendarEvent) => calendarEvent.dayIndex === dayIndex && calendarEvent.hour === hour,
  )
  if (event) {
    return {
      id: `${day}-${event.id}`,
      title: event.title,
      timeLabel: event.timeLabel,
      segment: minute === 0 ? ('start' as const) : ('end' as const),
    }
  }

  return null
}

const simulatedCalendarEvents = [
  {
    dayIndex: 0,
    hour: 10,
    id: 'daily',
    title: '제품팀 데일리',
    timeLabel: '오전 10:00-오전 11:00',
  },
  {
    dayIndex: 0,
    hour: 13,
    id: 'design-review',
    title: '디자인 리뷰',
    timeLabel: '오후 1:00-오후 2:00',
  },
  {
    dayIndex: 1,
    hour: 10,
    id: 'weekly-sync',
    title: '팀 위클리',
    timeLabel: '오전 10:00-오전 11:00',
  },
  {
    dayIndex: 1,
    hour: 13,
    id: 'research-share',
    title: '리서치 공유',
    timeLabel: '오후 1:00-오후 2:00',
  },
  {
    dayIndex: 1,
    hour: 15,
    id: 'partner-meeting',
    title: '파트너사 미팅',
    timeLabel: '오후 3:00-오후 4:00',
  },
  {
    dayIndex: 2,
    hour: 11,
    id: 'one-on-one',
    title: '1:1 미팅',
    timeLabel: '오전 11:00-오후 12:00',
  },
  {
    dayIndex: 2,
    hour: 13,
    id: 'sprint-review',
    title: '스프린트 리뷰',
    timeLabel: '오후 1:00-오후 2:00',
  },
] as const
