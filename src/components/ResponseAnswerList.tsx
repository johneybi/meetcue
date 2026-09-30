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
  const answeredCandidates = candidates.filter((candidate) => answers[candidate.id])

  if (answeredCandidates.length === 0) {
    return (
      <div className="response-answer-list" data-empty>
        <p className="response-answer-list__empty">아직 선택한 응답이 없어요.</p>
      </div>
    )
  }

  return (
    <div className="response-answer-list">
      {answeredCandidates.map((candidate) => (
        <div className="response-answer-list__row" key={candidate.id}>
          <div>
            <span>{date.format(new Date(candidate.startAt))}</span>
            <strong>
              <TimeRange start={candidate.startAt} end={candidate.endAt} />
            </strong>
          </div>
          <span className="response-answer-list__value" data-value={answers[candidate.id]}>
            {labels[answers[candidate.id]!]}
          </span>
        </div>
      ))}
    </div>
  )
}
