import { Check, ChevronDown, Clock3, X } from 'lucide-react'
import type { CandidateEvaluation } from '../domain/evaluation'
import { formatCandidateTime, type Meeting } from '../domain/meeting'
import './HostDecisionMatrix.css'

type HostDecisionMatrixProps = {
  meeting: Meeting
  evaluations: CandidateEvaluation[]
  selectedCandidateId: string
}

export function HostDecisionMatrix({
  meeting,
  evaluations,
  selectedCandidateId,
}: HostDecisionMatrixProps) {
  return (
    <details className="decision-matrix-disclosure" open>
      <summary>
        <div>
          <span>참석 가능 현황</span>
          <strong>전체 후보 비교</strong>
        </div>
        <span className="decision-matrix-disclosure__affordance">
          <small className="is-closed-label">펼쳐 보기</small>
          <small className="is-open-label">접기</small>
          <ChevronDown aria-hidden="true" size={18} />
        </span>
      </summary>
      <div className="decision-matrix-scroll">
        <table className="decision-matrix">
          <thead>
            <tr>
              <th scope="col">참석자</th>
              {evaluations.map((evaluation) => (
                <th
                  className={
                    evaluation.candidate.id === selectedCandidateId ? 'is-selected' : ''
                  }
                  key={evaluation.candidate.id}
                  scope="col"
                >
                  {formatCandidateTime(evaluation.candidate)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {meeting.participants.map((participant) => (
              <tr key={participant.id}>
                <th scope="row">
                  <strong>{participant.name}</strong>
                  {participant.role === 'required' ? <small>필수</small> : null}
                </th>
                {evaluations.map((evaluation) => {
                  const detail = evaluation.responseDetails.find(
                    (item) => item.participant.id === participant.id,
                  )
                  const state = detail?.state
                  return (
                    <td
                      className={`${evaluation.candidate.id === selectedCandidateId ? 'is-selected ' : ''}is-${state ?? 'unknown'}`}
                      key={evaluation.candidate.id}
                      aria-label={
                        state === 'available' || state === 'adjustment_commit'
                          ? '가능'
                          : state === 'unavailable'
                            ? '참석 어려움'
                            : '응답 전'
                      }
                    >
                      {state === 'available' || state === 'adjustment_commit' ? (
                        <Check size={16} />
                      ) : state === 'unavailable' ? (
                        <X size={16} />
                      ) : (
                        <Clock3 size={15} />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer>
        <span className="is-positive">가능</span>
        <span className="is-negative">참석 어려움</span>
        <span className="is-unknown">응답 전</span>
      </footer>
    </details>
  )
}
