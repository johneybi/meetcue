import { ChevronDown } from 'lucide-react'
import type { CandidateEvaluation } from '../domain/evaluation'
import { Avatar } from './ui/avatar'

const labels = {
  available: '가능',
  adjustment_commit: '일정 조정',
  adjustment_intent: '조정 의향 · 동의 전',
  unavailable: '참석 어려움',
  unknown: '이 시간 미확인',
}

/** Summary before evidence. Native disclosure preserves keyboard and screen reader behavior. */
export function AttendanceSummary({ evaluation }: { evaluation: CandidateEvaluation }) {
  const pending = evaluation.responseDetails.filter((item) => item.state === 'unknown').length
  return (
    <details className="mc-attendance">
      <summary>
        <span>
          <strong>{evaluation.availableCount}명 참석 가능</strong>
          {evaluation.unavailableCount > 0 ? ` · ${evaluation.unavailableCount}명 어려움` : ''}
          {evaluation.adjustmentIntentParticipants.length > 0
            ? ` · ${evaluation.adjustmentIntentParticipants.length}명 조정 의향`
            : ''}
          {pending > 0 ? ` · ${pending}명 미확인` : ''}
        </span>
        <span className="mc-attendance__more">
          개별 응답 <ChevronDown size={16} aria-hidden="true" />
        </span>
      </summary>
      <div className="mc-attendance__people" aria-label="이 시간의 참석자별 응답">
        {evaluation.responseDetails.map(({ participant, state }) => (
          <div className="mc-attendance__person" data-state={state} key={participant.id}>
            <Avatar name={participant.name} size="small" />
            <span>
              <strong>{participant.name}</strong>
              <small>{labels[state]}</small>
            </span>
          </div>
        ))}
      </div>
    </details>
  )
}
