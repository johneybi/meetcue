import { useState } from 'react'
import { CalendarDays, Check, CheckCircle2, ChevronDown, Clock3, X } from 'lucide-react'
import type { CandidateEvaluation } from '../domain/evaluation'
import {
  candidateStatusLabels,
  formatCandidateTime,
  type Meeting,
  type Participant,
} from '../domain/meeting'
import { Button } from './ui/button'
import { Avatar } from './ui/avatar'
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
  const [showParticipantResponses, setShowParticipantResponses] = useState(false)
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
  const requiredCount = meeting.participants.filter(
    (participant) => participant.role === 'required',
  ).length
  const mobileReasons =
    evaluation.status === 'ready'
      ? [
          `필수 참석자 ${requiredCount}명 모두 가능해요`,
          adjustmentParticipants.length > 0
            ? `${formatParticipantSummary(adjustmentParticipants)} 일정 조정 후 참석해요`
            : '일정 조정 없이 참석할 수 있어요',
        ]
      : evaluation.reasons.slice(0, 2)

  return (
    <section
      className={`decision-reference-detail is-${getStatusTone(evaluation.status)}`}
      aria-labelledby="selected-time-title"
    >
      <section className="decision-mobile-focus" aria-labelledby="mobile-selected-time-title">
        <span className="decision-mobile-focus__context">
          {isSystemRecommendation ? '가장 먼저 추천하는 시간' : '선택한 후보 시간'}
        </span>

        <h2 id="mobile-selected-time-title">{formatCandidateTime(evaluation.candidate)}</h2>

        <div className="decision-mobile-focus__status">
          {evaluation.status === 'ready' ? (
            <CheckCircle2 aria-hidden="true" size={18} />
          ) : evaluation.status === 'pending' ? (
            <Clock3 aria-hidden="true" size={18} />
          ) : (
            <X aria-hidden="true" size={18} />
          )}
          <span>{candidateStatusLabels[evaluation.status]}</span>
        </div>

        <button
          className="decision-mobile-response-toggle"
          type="button"
          aria-expanded={showParticipantResponses}
          aria-controls="mobile-participant-responses"
          onClick={() => setShowParticipantResponses((isOpen) => !isOpen)}
        >
          <span className="is-positive">
            <strong>{evaluation.availableCount}명</strong>
            <small>참석 가능</small>
          </span>
          <span className="is-unknown">
            <strong>{selectedPendingCount}명</strong>
            <small>응답 전</small>
          </span>
          <ChevronDown aria-hidden="true" size={18} />
        </button>

        <div
          className="decision-mobile-participants"
          id="mobile-participant-responses"
          hidden={!showParticipantResponses}
        >
          {evaluation.responseDetails.map((detail) => (
            <div className="decision-mobile-participant" key={detail.participant.id}>
              <span className="decision-mobile-participant__identity">
                <Avatar name={detail.participant.name} size="small" />
                <strong>{detail.participant.name}</strong>
                {detail.participant.role === 'required' ? <small>필수</small> : null}
              </span>
              <span className={`decision-mobile-participant__state is-${detail.state}`}>
                {detail.state === 'available' ? (
                  <CheckCircle2 aria-hidden="true" size={15} />
                ) : detail.state === 'adjustment_commit' ? (
                  <CalendarDays aria-hidden="true" size={15} />
                ) : detail.state === 'unavailable' ? (
                  <X aria-hidden="true" size={15} />
                ) : (
                  <Clock3 aria-hidden="true" size={15} />
                )}
                {getParticipantStateLabel(detail.state)}
              </span>
            </div>
          ))}
        </div>

        <div className="decision-mobile-reasons">
          <strong>확정할 수 있는 이유</strong>
          {mobileReasons.map((reason, index) => (
            <div key={reason}>
              {index === 0 ? (
                <CheckCircle2 aria-hidden="true" size={17} />
              ) : (
                <CalendarDays aria-hidden="true" size={17} />
              )}
              <span>{reason}</span>
            </div>
          ))}
        </div>
      </section>

      <header className="decision-state-panel__time">
        <div>
          <span className="decision-state-panel__time-label-default">선택한 후보</span>
          <span className="decision-state-panel__time-label-mobile">
            {isSystemRecommendation ? '추천 시간' : '선택한 시간'}
          </span>
          <h2 id="selected-time-title">{formatCandidateTime(evaluation.candidate)}</h2>
        </div>
        {isSystemRecommendation ? <strong>시스템 추천</strong> : null}
      </header>

      <div className="decision-state-panel">
        <div className="decision-summary">
          <span className="decision-state-panel__label">
            {candidateStatusLabels[evaluation.status]}
          </span>
          <h3>{statusTitle}</h3>
          <p>{statusDescription}</p>
          <div className="decision-state-counts" aria-label="선택한 후보 응답 현황">
            <span className="is-positive" hidden={evaluation.availableCount === 0}>
              <strong>{evaluation.availableCount}명</strong> 가능
            </span>
            <span className="is-negative" hidden={evaluation.unavailableCount === 0}>
              <strong>{evaluation.unavailableCount}명</strong> 참석 어려움
            </span>
            <span className="is-unknown" hidden={selectedPendingCount === 0}>
              <strong>{selectedPendingCount}명</strong> 응답 전
            </span>
          </div>
        </div>
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
                  ? `${formatParticipantSummary(adjustmentParticipants)} 조정 시 참석 가능해요.`
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
        <div className={`decision-action-footer is-${evaluation.status}`}>
          {canConfirm ? (
            <Button size="action" onClick={() => onConfirm(evaluation.candidate.id)}>
              {formatCandidateActionTime(evaluation.candidate.startAt)}로 확정하기
            </Button>
          ) : evaluation.status === 'pending' ? (
            <Button size="action" onClick={() => onRequest(evaluation.candidate.id)}>
              응답 요청하기
            </Button>
          ) : (
            <Button
              size="action"
              onClick={() =>
                fallbackEvaluation != null
                  ? onSelectCandidate(fallbackEvaluation.candidate.id)
                  : onReviewCriteria()
              }
            >
              {fallbackEvaluation != null ? '다른 후보 보기' : '참석 기준 다시 보기'}
            </Button>
          )}
        </div>
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
                  <div className="decision-pending-person__identity">
                    <Avatar name={participant.name} size="small" />
                    <div>
                      <strong>{participant.name}</strong>
                      <small>꼭 참석해야 하는 사람 · 응답 전</small>
                    </div>
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
                  <span className="decision-optional-person" key={participant.id}>
                    <Avatar name={participant.name} />
                    <strong>{participant.name}</strong>
                  </span>
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
          <p>후보 시간에서 다른 시간을 선택하면 같은 기준으로 바로 비교할 수 있어요.</p>
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

function getParticipantStateLabel(state: CandidateEvaluation['responseDetails'][number]['state']) {
  if (state === 'available') return '가능'
  if (state === 'adjustment_commit') return '일정 조정'
  if (state === 'unavailable') return '참석 어려움'
  return '응답 전'
}

function formatCandidateActionTime(startAt: string) {
  const start = new Date(startAt)
  const date = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
  }).format(start)
  const timeParts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(start)
  const dayPeriod = timeParts.find((part) => part.type === 'dayPeriod')?.value ?? ''
  const hour = timeParts.find((part) => part.type === 'hour')?.value ?? ''
  const minute = timeParts.find((part) => part.type === 'minute')?.value ?? '00'
  const time = minute === '00' ? `${dayPeriod} ${hour}시` : `${dayPeriod} ${hour}시 ${minute}분`

  return `${date} ${time}`
}
