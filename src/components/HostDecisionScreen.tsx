import { useState } from 'react'
import {
  hasSameRecommendationPriority,
  selectCandidateShortlist,
  type CandidateEvaluation,
} from '../domain/evaluation'
import { formatDeadline, type Meeting, type Participant } from '../domain/meeting'
import { HostCandidateDetail } from './HostCandidateDetail'
import { HostCandidateShortlist } from './HostCandidateShortlist'
import { HostDecisionMatrix } from './HostDecisionMatrix'
import { HostResponseRequestDialog } from './HostResponseRequestDialog'
import { Button } from './ui/button'
import './HostDecisionScreen.css'

type HostDecisionScreenProps = {
  meeting: Meeting
  evaluations: CandidateEvaluation[]
  selectedEvaluation: CandidateEvaluation
  onSelectCandidate: (candidateId: string) => void
  onConfirm: (candidateId: string) => void
  onReviewCriteria: () => void
  onSendRequest: (evaluation: CandidateEvaluation, recipientIds: string[]) => void
  requestedParticipant?: Participant
  onOpenRequestedParticipant: (participant: Participant) => void
}

export function HostDecisionScreen({
  meeting,
  evaluations,
  selectedEvaluation,
  onSelectCandidate,
  onConfirm,
  onReviewCriteria,
  onSendRequest,
  requestedParticipant,
  onOpenRequestedParticipant,
}: HostDecisionScreenProps) {
  const [requestCandidateId, setRequestCandidateId] = useState<string | null>(null)
  const recommendedEvaluation = selectedEvaluation
  const systemRecommendedEvaluation = evaluations[0] ?? selectedEvaluation
  const readyCount = evaluations.filter((evaluation) => evaluation.status === 'ready').length
  const shortlistEvaluations = selectCandidateShortlist(evaluations, 6)
  const requiredCount = meeting.participants.filter(
    (participant) => participant.role === 'required',
  ).length
  const criteriaSummary =
    meeting.preset === 'all_hands'
      ? `주최자 포함 ${meeting.participants.length}명 모두 참석`
      : `꼭 참석해야 하는 사람 ${requiredCount}명 · 최소 ${meeting.minAttendeeCount}명 참석`
  const isSystemRecommendation =
    systemRecommendedEvaluation.status === 'ready' &&
    hasSameRecommendationPriority(recommendedEvaluation, systemRecommendedEvaluation)
  const fallbackEvaluation = evaluations.find(
    (evaluation) =>
      evaluation.candidate.id !== recommendedEvaluation.candidate.id &&
      evaluation.status === 'ready',
  )
  const candidateStatusSummary = `추천 ${shortlistEvaluations.length}개 · 가능한 시간 ${readyCount}개`

  return (
    <div className="decision-board">
      <section className="decision-candidate-workspace" aria-labelledby="decision-candidates-title">
        <header className="decision-candidate-head">
          <div className="decision-candidate-head__meeting">
            <div className="decision-candidate-head__title">
              <h1 id="decision-candidates-title">{meeting.title}</h1>
              <span>{formatDeadline(meeting.responseDeadline)} 마감</span>
            </div>
            <div className="decision-meeting-criteria">
              <span>참석 기준</span>
              <strong>{criteriaSummary}</strong>
              <Button variant="quiet" size="text" onClick={onReviewCriteria}>
                수정
              </Button>
            </div>
          </div>
          <p>{candidateStatusSummary}</p>
        </header>

        <HostCandidateShortlist
          meeting={meeting}
          evaluations={shortlistEvaluations}
          selectedEvaluation={recommendedEvaluation}
          systemRecommendedEvaluation={systemRecommendedEvaluation}
          onSelect={(evaluation) => {
            onSelectCandidate(evaluation.candidate.id)
            setRequestCandidateId(null)
          }}
          onConfirm={onConfirm}
          onRequest={setRequestCandidateId}
          onShowAlternative={() =>
            fallbackEvaluation != null
              ? onSelectCandidate(fallbackEvaluation.candidate.id)
              : onReviewCriteria()
          }
        />

        <HostCandidateDetail
          meeting={meeting}
          evaluation={recommendedEvaluation}
          isSystemRecommendation={isSystemRecommendation}
          fallbackEvaluation={fallbackEvaluation}
          onConfirm={onConfirm}
          onRequest={setRequestCandidateId}
          onSelectCandidate={onSelectCandidate}
          onReviewCriteria={onReviewCriteria}
        />
      </section>

      <HostDecisionMatrix
        meeting={meeting}
        evaluations={evaluations}
        selectedCandidateId={recommendedEvaluation.candidate.id}
      />

      {requestCandidateId === recommendedEvaluation.candidate.id ? (
        <HostResponseRequestDialog
          key={recommendedEvaluation.candidate.id}
          evaluation={recommendedEvaluation}
          onCancel={() => setRequestCandidateId(null)}
          onSend={(recipientIds) => {
            onSendRequest(recommendedEvaluation, recipientIds)
            setRequestCandidateId(null)
          }}
        />
      ) : null}

      {requestedParticipant ? (
        <div className="prototype-flow-action prototype-flow-action--decision">
          <div>
            <span>요청이 전달됐어요</span>
            <strong>{requestedParticipant.name}님의 응답이 오면 결과를 다시 계산해요</strong>
          </div>
          <Button
            size="action"
            onClick={() => onOpenRequestedParticipant(requestedParticipant)}
          >
            {requestedParticipant.name}님 응답 이어보기
          </Button>
        </div>
      ) : null}

      {evaluations.some((evaluation) => evaluation.deadlinePassed) ? (
        <div className="decision-deadline-notice" role="status">
          응답 마감이 지났지만, 아직 응답하지 않은 사람을 ‘참석하기 어려워요’로 처리하지 않았어요.
          늦게 온 응답도 반영해 결과를 다시 계산해요.
        </div>
      ) : null}
    </div>
  )
}
