import { CalendarDays, Check, Clock3 } from 'lucide-react'
import type { CandidateEvaluation } from '../domain/evaluation'
import {
  candidateStatusLabels,
  formatCandidateTime,
  type Meeting,
  type Participant,
} from '../domain/meeting'
import { Button } from './ui/button'
import './HostCandidateDetail.css'

type HostCandidateDetailProps = {
  meeting: Meeting
  evaluation: CandidateEvaluation
  isSystemRecommendation: boolean
  fallbackEvaluation?: CandidateEvaluation
  onConfirm: (candidateId: string) => void
  onRequest: (candidateId: string) => void
  onSelectCandidate: (candidateId: string) => void
  onReviewCriteria: () => void
}

export function HostCandidateDetail({
  meeting,
  evaluation,
  isSystemRecommendation,
  fallbackEvaluation,
  onConfirm,
  onRequest,
  onSelectCandidate,
  onReviewCriteria,
}: HostCandidateDetailProps) {
  const canConfirm = evaluation.status === 'ready'
  const selectedPendingCount = evaluation.responseDetails.filter(
    (detail) => detail.state === 'unknown',
  ).length
  const adjustmentParticipants = evaluation.adjustmentCommitParticipants
  const avoidPreferredParticipants = evaluation.responseDetails
    .filter(
      (detail) =>
        (detail.state === 'available' || detail.state === 'adjustment_commit') &&
        (detail.response?.preferenceTags?.length ?? 0) > 0,
    )
    .map((detail) => detail.participant)
  const statusTitle =
    evaluation.status === 'ready'
      ? `${evaluation.availableCount}명 참석 가능, 지금 확정할 수 있어요`
      : evaluation.status === 'pending'
        ? evaluation.requiredPending.length > 0
          ? `${evaluation.requiredPending.map((participant) => participant.name).join(', ')}님의 가능 응답이 필요해요`
          : `아직 응답하지 않은 사람 중 ${evaluation.positiveResponsesNeededAfterRequiredYes}명의 ‘가능해요’ 응답이 필요해요`
        : evaluation.requiredUnavailable.length > 0
          ? '꼭 참석해야 하는 사람의 시간이 맞지 않아요'
          : `최소 ${meeting.minAttendeeCount}명을 채울 수 없어요`
  const statusDescription =
    evaluation.status === 'ready'
      ? `필수 참석자 조건과 최소 ${meeting.minAttendeeCount}명 기준을 충족했어요.`
      : evaluation.reasons.join(' ')

  return (
    <section
      className={`decision-reference-detail is-${getStatusTone(evaluation.status)}`}
      aria-labelledby="selected-time-title"
    >
      <header className="decision-focus-head">
        <div>
          <span>선택한 후보</span>
          <h2 id="selected-time-title">{formatCandidateTime(evaluation.candidate)}</h2>
        </div>
        {isSystemRecommendation ? <strong>시스템 추천</strong> : null}
      </header>

      <div className="decision-state-panel">
        <span className="decision-state-panel__label">
          {candidateStatusLabels[evaluation.status]}
        </span>
        <h3>{statusTitle}</h3>
        <p>{statusDescription}</p>
        {evaluation.status === 'ready' ? (
          <div className="decision-burden-summary" aria-label="확정 전 확인할 일정 부담">
            <div className={adjustmentParticipants.length > 0 ? 'has-burden' : 'is-clear'}>
              {adjustmentParticipants.length > 0 ? (
                <CalendarDays aria-hidden="true" size={16} />
              ) : (
                <Check aria-hidden="true" size={16} />
              )}
              <span>
                {adjustmentParticipants.length > 0
                  ? `${formatParticipantSummary(adjustmentParticipants)} 기존 일정을 옮겨 참석해요.`
                  : '일정 변경 없이 참석할 수 있어요.'}
              </span>
            </div>
            <div className={avoidPreferredParticipants.length > 0 ? 'has-burden' : 'is-clear'}>
              {avoidPreferredParticipants.length > 0 ? (
                <Clock3 aria-hidden="true" size={16} />
              ) : (
                <Check aria-hidden="true" size={16} />
              )}
              <span>
                {avoidPreferredParticipants.length > 0
                  ? `${formatParticipantSummary(avoidPreferredParticipants)} 가능하면 피하고 싶다고 표시했어요.`
                  : '피하고 싶은 표시가 없어요.'}
              </span>
            </div>
          </div>
        ) : null}
        <div className="decision-state-counts" aria-label="선택한 후보 응답 현황">
          <span className="is-positive">
            <strong>{evaluation.availableCount}명</strong> 가능
          </span>
          <span className="is-negative">
            <strong>{evaluation.unavailableCount}명</strong> 참석 어려움
          </span>
          <span className="is-unknown">
            <strong>{selectedPendingCount}명</strong> 응답 전
          </span>
        </div>
        {canConfirm ? (
          <Button
            size="action"
            onClick={() => onConfirm(evaluation.candidate.id)}
          >
            이 시간으로 확정하기
          </Button>
        ) : null}
      </div>

      {evaluation.status === 'pending' ? (
        <div className="decision-pending-groups">
          {evaluation.requiredPending.length > 0 ? (
            <section className="decision-pending-group is-required">
              <header>
                <strong>응답이 꼭 필요한 사람 · {evaluation.requiredPending.length}명</strong>
              </header>
              {evaluation.requiredPending.map((participant) => (
                <div className="decision-pending-person" key={participant.id}>
                  <div>
                    <strong>{participant.name}</strong>
                    <small>꼭 참석해야 하는 사람 · 응답 전</small>
                  </div>
                  <Button
                    variant="fieldAction"
                    size="text"
                    onClick={() => onRequest(evaluation.candidate.id)}
                  >
                    다시 요청하기
                  </Button>
                </div>
              ))}
            </section>
          ) : null}
          {evaluation.optionalPendingPool.length > 0 ? (
            <section className="decision-pending-group">
              <header>
                <strong>아직 응답하지 않은 사람 · {evaluation.optionalPendingPool.length}명</strong>
                {evaluation.positiveResponsesNeededAfterRequiredYes === 0 ? (
                  <span>추가 필요 없음</span>
                ) : (
                  <Button
                    variant="fieldAction"
                    size="text"
                    onClick={() => onRequest(evaluation.candidate.id)}
                  >
                    응답 요청하기
                  </Button>
                )}
              </header>
              <div className="decision-optional-people">
                {evaluation.optionalPendingPool.map((participant) => (
                  <span key={participant.id}>{participant.name}</span>
                ))}
              </div>
              <p>
                {evaluation.positiveResponsesNeededAfterRequiredYes === 0
                  ? '필수 참석자의 응답이 가능이면 이 그룹의 응답 없이도 확정할 수 있어요.'
                  : `이 중 ${evaluation.positiveResponsesNeededAfterRequiredYes}명에게 ‘가능해요’ 응답을 받아야 해요.`}
              </p>
            </section>
          ) : null}
        </div>
      ) : evaluation.status === 'impossible' ? (
        <div className="decision-impossible-guide">
          <strong>다른 후보를 검토해 보세요</strong>
          <p>왼쪽 후보 목록에서 다른 시간을 선택하면 같은 기준으로 바로 비교할 수 있어요.</p>
          <Button
            variant="fieldAction"
            size="text"
            onClick={() =>
              fallbackEvaluation != null
                ? onSelectCandidate(fallbackEvaluation.candidate.id)
                : onReviewCriteria()
            }
          >
            {fallbackEvaluation != null ? '지금 정할 수 있는 시간 보기' : '참석 기준 다시 보기'}
          </Button>
        </div>
      ) : null}

    </section>
  )
}

function getStatusTone(status: CandidateEvaluation['status']) {
  if (status === 'ready') return 'success'
  if (status === 'pending') return 'info'
  return 'danger'
}

function formatParticipantSummary(participants: Participant[]) {
  if (participants.length === 1) return `${participants[0].name} 님은`
  return `${participants[0].name} 님 외 ${participants.length - 1}명이`
}
