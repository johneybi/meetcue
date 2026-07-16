import { useState } from 'react'
import { Check, ChevronDown, Clock3, Triangle, X } from 'lucide-react'
import type { CandidateEvaluationGroup } from '../domain/evaluation'
import type { Candidate, Meeting } from '../domain/meeting'
import { Avatar } from './ui/avatar'
import './HostDecisionMatrix.css'

type HostDecisionMatrixProps = {
  meeting: Meeting
  groups: CandidateEvaluationGroup[]
  selectedCandidateId: string
  defaultOpen?: boolean
}

export function HostDecisionMatrix({
  meeting,
  groups,
  selectedCandidateId,
  defaultOpen = true,
}: HostDecisionMatrixProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <details
      className="decision-matrix-disclosure"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary>
        <div>
          <span className="decision-matrix-heading-default">참석 가능 현황</span>
          <strong className="decision-matrix-heading-default">전체 후보 비교</strong>
          <strong className="decision-matrix-heading-mobile">전체 후보 한눈에 보기</strong>
          <small>{groups.length}개 결과 범위로 묶어 보여드려요</small>
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
              {groups.map((group) => {
                const isSelected = group.evaluations.some(
                  (evaluation) => evaluation.candidate.id === selectedCandidateId,
                )
                return (
                  <th className={isSelected ? 'is-selected' : ''} key={group.id} scope="col">
                    <span className="decision-matrix-date">
                      {formatMatrixDate(group.evaluations[0].candidate)}
                    </span>
                    <span className="decision-matrix-time">{formatMatrixGroupTime(group)}</span>
                    {group.evaluations.length > 1 ? (
                      <span className="decision-matrix-group-count">
                        {group.evaluations.length}개 시간
                      </span>
                    ) : null}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {meeting.participants.map((participant) => (
              <tr key={participant.id}>
                <th scope="row">
                  <span className="decision-matrix-person">
                    <Avatar name={participant.name} size="small" />
                    <span className="decision-matrix-person__copy">
                      <strong>{participant.name}</strong>
                      {participant.role === 'required' ? (
                        <small className="decision-matrix-required" aria-label="필수 참석자">
                          필수
                        </small>
                      ) : null}
                    </span>
                  </span>
                </th>
                {groups.map((group) => {
                  const evaluation =
                    group.evaluations.find((item) => item.candidate.id === selectedCandidateId) ??
                    group.evaluations[0]
                  const isSelected = group.evaluations.some(
                    (item) => item.candidate.id === selectedCandidateId,
                  )
                  const detail = evaluation.responseDetails.find(
                    (item) => item.participant.id === participant.id,
                  )
                  const state = detail?.state
                  return (
                    <td
                      className={`${isSelected ? 'is-selected ' : ''}is-${state ?? 'unknown'}`}
                      key={group.id}
                      aria-label={
                        state === 'available'
                          ? '가능'
                          : state === 'adjustment_commit'
                            ? '조정 시 가능'
                            : state === 'unavailable'
                              ? '참석 어려움'
                              : '응답 전'
                      }
                    >
                      {state === 'available' ? (
                        <Check size={16} />
                      ) : state === 'adjustment_commit' ? (
                        <Triangle
                          className="decision-matrix__adjustment"
                          aria-hidden="true"
                          size={15}
                        />
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
        <span className="is-required" aria-label="별표는 필수 참석자">
          필수
        </span>
        <span className="is-positive">가능</span>
        <span className="is-adjustment">조정 시 가능</span>
        <span className="is-negative">참석 어려움</span>
        <span className="is-unknown">응답 전</span>
      </footer>
    </details>
  )
}

function formatMatrixDate(candidate: Candidate) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(candidate.startAt))
}

function formatMatrixTime(candidate: Candidate) {
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  return `${formatter.format(new Date(candidate.startAt))}–${formatter.format(new Date(candidate.endAt))}`
}

function formatMatrixGroupTime(group: CandidateEvaluationGroup) {
  const firstCandidate = group.evaluations[0].candidate
  const lastCandidate = group.evaluations[group.evaluations.length - 1].candidate
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  if (group.evaluations.length === 1) return formatMatrixTime(firstCandidate)

  return `${formatter.format(new Date(firstCandidate.startAt))}–${formatter.format(new Date(lastCandidate.endAt))}`
}
