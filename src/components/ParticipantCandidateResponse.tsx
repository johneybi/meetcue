import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight, Check, ChevronRight, CalendarDays, X } from 'lucide-react'
import type { Candidate, ResponseValue } from '../domain/meeting'
import { CalendarDate, TimeRange } from './ui/calendar-date'
import { Button } from './ui/button'

type Props = {
  participantName: string
  isEditing: boolean
  candidates: Candidate[]
  answers: Record<string, ResponseValue | undefined>
  onAnswer: (candidate: Candidate, value: ResponseValue) => void
  onExpand: () => void
  onSubmit: () => void
  getCalendarHint: (candidate: Candidate) => string | null
}
const choices: { value: ResponseValue; label: string }[] = [
  { value: 'available', label: '가능해요' },
  { value: 'adjustable', label: '옮겨서 참석' },
  { value: 'unavailable', label: '어려워요' },
]
const dateFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
})
const timeFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: 'numeric',
  minute: '2-digit',
})

function endTime(candidate: Candidate) {
  const startPeriod = timeFormat
    .formatToParts(new Date(candidate.startAt))
    .find((p) => p.type === 'dayPeriod')?.value
  return timeFormat
    .formatToParts(new Date(candidate.endAt))
    .filter((p) => p.type !== 'dayPeriod' || p.value !== startPeriod)
    .map((p) => p.value)
    .join('')
    .trim()
}

export function ParticipantCandidateResponse({
  participantName,
  isEditing,
  candidates,
  answers,
  onAnswer,
  onExpand,
  onSubmit,
  getCalendarHint,
}: Props) {
  const [confirmAdjustment, setConfirmAdjustment] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)
  const answered = candidates.filter((c) => answers[c.id] != null).length
  const complete = candidates.length > 0 && answered === candidates.length
  const allUnavailable = complete && candidates.every((c) => answers[c.id] === 'unavailable')
  const hasAdjustment = candidates.some((c) => answers[c.id] === 'adjustable')
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (confirmAdjustment && !dialog.open) dialog.showModal()
    else if (!confirmAdjustment && dialog.open) {
      dialog.close()
      submitRef.current?.focus()
    }
  }, [confirmAdjustment])

  function submit() {
    if (hasAdjustment) setConfirmAdjustment(true)
    else onSubmit()
  }

  return (
    <section className="candidate-response" aria-labelledby="candidate-response-title">
      <header className="response-flow-heading">
        <span className="response-flow-eyebrow">
          {participantName}님의 {isEditing ? '응답 수정' : '시간 응답'}
        </span>
        <h1 id="candidate-response-title" tabIndex={-1}>
          {isEditing ? '달라진 일정을 알려주세요' : '참석 가능한 시간을 알려주세요'}
        </h1>
        <p>
          {isEditing
            ? '확정 전까지 응답을 바꿀 수 있어요.'
            : `주최자가 가능한 ${candidates.length}개 시간이에요.`}
        </p>
      </header>
      <div className="response-selection-progress">
        <span>
          후보 시간 <small>한국 시간</small>
        </span>
        <span className="response-selection-progress__count" aria-live="polite">
          <strong>{answered}</strong> / {candidates.length}
        </span>
        <div className="response-selection-progress__track" aria-hidden="true">
          <span
            style={{ transform: `scaleX(${candidates.length ? answered / candidates.length : 0})` }}
          />
        </div>
      </div>
      <div className="candidate-response-list">
        {candidates.map((candidate, index) => {
          const selectedIndex = choices.findIndex((c) => c.value === answers[candidate.id])
          const conflict = getCalendarHint(candidate)
          return (
            <fieldset
              className={`candidate-response-row${selectedIndex >= 0 ? ' is-answered' : ''}`}
              key={candidate.id}
            >
              <legend className="sr-only">
                후보 {index + 1} · {dateFormat.format(new Date(candidate.startAt))}{' '}
                {timeFormat.format(new Date(candidate.startAt))}
              </legend>
              <CalendarDate compact value={candidate.startAt} className="response-date" />
              <div className="response-time">
                <div className="response-time__heading">
                  <h2>
                    <TimeRange start={candidate.startAt} end={candidate.endAt} />
                  </h2>
                  <span
                    className="response-row-check"
                    aria-label={selectedIndex >= 0 ? '응답 선택됨' : undefined}
                  >
                    {selectedIndex >= 0 ? <Check size={16} aria-hidden="true" /> : null}
                  </span>
                </div>
                <p className={`response-calendar-hint${conflict ? ' has-conflict' : ''}`}>
                  {conflict ? (
                    <>
                      <CalendarDays size={13} aria-hidden="true" />
                      {conflict} 일정과 겹쳐요
                    </>
                  ) : (
                    '겹치는 일정 없음'
                  )}
                </p>
                <div
                  className={`candidate-response-choices${selectedIndex < 0 ? ' is-empty' : ''}`}
                  style={{ '--selected-index': Math.max(0, selectedIndex) } as CSSProperties}
                >
                  <span className="response-choice-indicator" aria-hidden="true" />
                  {choices.map((choice) => (
                    <label key={choice.value}>
                      <input
                        type="radio"
                        name={`candidate-${candidate.id}`}
                        value={choice.value}
                        checked={answers[candidate.id] === choice.value}
                        aria-describedby={
                          choice.value === 'adjustable' ? 'response-adjustment-meaning' : undefined
                        }
                        onChange={() => onAnswer(candidate, choice.value)}
                      />
                      <span>{choice.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>
          )
        })}
      </div>
      <p className="candidate-response-meaning" id="response-adjustment-meaning">
        ‘옮겨서 참석’은 기존 일정을 옮겨 이 회의에 참석한다는 뜻이에요.
      </p>
      <button className="candidate-response-expand" onClick={onExpand} type="button">
        <span>{allUnavailable ? '모두 어렵다면, 다른 시간 찾아보기' : '다른 시간도 알려주기'}</span>
        <ChevronRight size={17} aria-hidden="true" />
      </button>
      <footer className="response-flow-actions">
        <Button
          ref={submitRef}
          size="action"
          width="full"
          disabled={!complete}
          onClick={allUnavailable ? onExpand : submit}
        >
          <span key={complete ? 'complete' : answered} className="response-action-label">
            {allUnavailable
              ? '다른 시간 찾아보기'
              : complete
                ? '응답 보내기'
                : `${candidates.length - answered}개 시간에 더 응답해 주세요`}
          </span>
          {complete ? <ArrowRight size={18} aria-hidden="true" /> : null}
        </Button>
        {allUnavailable ? (
          <Button variant="quiet" width="full" onClick={submit}>
            이 후보들은 어렵다고 보내기
          </Button>
        ) : null}
        <p>확인한 후보의 응답만 전달해요</p>
      </footer>
      <p className="response-flow-privacy">시연용 예시 캘린더예요. 일정 이름은 나에게만 보여요.</p>
      <dialog
        className="response-adjustment-dialog"
        ref={dialogRef}
        aria-labelledby="response-adjustment-title"
        aria-describedby="response-adjustment-description"
        onCancel={() => setConfirmAdjustment(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setConfirmAdjustment(false)
        }}
      >
        <div className="response-adjustment-dialog__body">
          <Button
            variant="quiet"
            size="icon"
            className="response-adjustment-dialog__close"
            aria-label="일정 조정 확인 닫기"
            onClick={() => setConfirmAdjustment(false)}
          >
            <X size={20} />
          </Button>
          <span className="response-flow-eyebrow">응답 보내기 전 확인</span>
          <h2 id="response-adjustment-title">
            기존 일정을 옮겨
            <br />
            참석할 수 있나요?
          </h2>
          <p id="response-adjustment-description">
            ‘옮겨서 참석’을 고른 시간도 참석 가능한 후보에 포함돼요.
          </p>
          <ul>
            {candidates
              .filter((c) => answers[c.id] === 'adjustable')
              .map((c) => (
                <li key={c.id}>
                  <CalendarDays size={17} aria-hidden="true" />
                  <span>
                    {dateFormat.format(new Date(c.startAt))}
                    <strong>
                      {timeFormat.format(new Date(c.startAt))} – {endTime(c)}
                    </strong>
                  </span>
                </li>
              ))}
          </ul>
          <Button width="full" onClick={onSubmit}>
            이대로 응답 보내기
          </Button>
          <Button variant="quiet" width="full" onClick={() => setConfirmAdjustment(false)}>
            다시 확인하기
          </Button>
        </div>
      </dialog>
    </section>
  )
}
