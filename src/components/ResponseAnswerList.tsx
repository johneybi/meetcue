import type { Candidate, ResponseValue } from '../domain/meeting'
import { TimeRange } from './ui/calendar-date'
import './ResponseAnswerList.css'

const labels: Record<ResponseValue, string> = {
  available: '가능해요',
  adjustment_intent: '조정 검토 가능',
  adjustable: '이전 약속 · 옮겨 참석',
  unavailable: '어려워요',
}
const date = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
})

export function ResponseAnswerList({
  candidates,
  answers,
}: {
  candidates: Candidate[]
  answers: Record<string, ResponseValue | undefined>
}) {
  return (
    <div className="response-answer-list">
      {candidates
        .filter((c) => answers[c.id])
        .map((c) => (
          <div className="response-answer-list__row" key={c.id}>
            <div>
              <span>{date.format(new Date(c.startAt))}</span>
              <strong>
                <TimeRange start={c.startAt} end={c.endAt} />
              </strong>
            </div>
            <span className="response-answer-list__value" data-value={answers[c.id]}>
              {labels[answers[c.id]!]}
            </span>
          </div>
        ))}
    </div>
  )
}
