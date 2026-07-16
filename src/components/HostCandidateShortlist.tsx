import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Info, Star } from 'lucide-react'
import { hasSameRecommendationPriority, type CandidateEvaluation } from '../domain/evaluation'
import { candidateStatusLabels, formatCandidateTime, type Meeting } from '../domain/meeting'
import { Button } from './ui/button'
import './HostCandidateShortlist.css'

type HostCandidateShortlistProps = {
  meeting: Meeting
  evaluations: CandidateEvaluation[]
  selectedEvaluation: CandidateEvaluation
  systemRecommendedEvaluation: CandidateEvaluation
  onSelect: (evaluation: CandidateEvaluation) => void
  onConfirm: (candidateId: string) => void
  onRequest: (candidateId: string) => void
  onShowAlternative: () => void
}

export function HostCandidateShortlist({
  meeting,
  evaluations,
  selectedEvaluation,
  systemRecommendedEvaluation,
  onSelect,
  onConfirm,
  onRequest,
  onShowAlternative,
}: HostCandidateShortlistProps) {
  const canConfirm = selectedEvaluation.status === 'ready'
  const listRef = useRef<HTMLDivElement>(null)
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: true })
  const [showMobileAlternatives, setShowMobileAlternatives] = useState(false)

  const updateScrollEdges = useCallback((list: HTMLDivElement) => {
    const nextEdges = {
      left: list.scrollLeft > 2,
      right: list.scrollLeft + list.clientWidth < list.scrollWidth - 2,
    }
    setScrollEdges((currentEdges) =>
      currentEdges.left === nextEdges.left && currentEdges.right === nextEdges.right
        ? currentEdges
        : nextEdges,
    )
  }, [])

  useEffect(() => {
    const list = listRef.current
    if (list == null) return

    updateScrollEdges(list)
    const observer = new ResizeObserver(() => updateScrollEdges(list))
    observer.observe(list)
    return () => observer.disconnect()
  }, [updateScrollEdges])

  useEffect(() => {
    const list = listRef.current
    if (list == null || !window.matchMedia('(max-width: 760px)').matches) return

    const selectedCard = list
      .querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.closest<HTMLElement>('.decision-reference-card')
    if (selectedCard == null) return

    list.scrollTo({
      left: Math.max(0, selectedCard.offsetLeft - 20),
      behavior: 'smooth',
    })
  }, [selectedEvaluation.candidate.id])

  return (
    <div
      className="decision-reference-candidates-viewport"
      data-scroll-hint={scrollEdges.right}
      data-can-scroll-left={scrollEdges.left}
      data-can-scroll-right={scrollEdges.right}
    >
      <button
        className="decision-reference-candidates__mobile-toggle"
        type="button"
        aria-expanded={showMobileAlternatives}
        aria-controls="mobile-alternative-candidates"
        onClick={() => setShowMobileAlternatives((isOpen) => !isOpen)}
      >
        <span>다른 후보 {Math.max(0, evaluations.length - 1)}개 보기</span>
        <ChevronDown aria-hidden="true" size={18} />
      </button>
      <span className="decision-reference-candidates__mobile-label">
        <span className="decision-reference-candidates__label-default">후보 시간</span>
        <span className="decision-reference-candidates__label-alternatives">다른 후보</span>
      </span>
      <div
        id="mobile-alternative-candidates"
        ref={listRef}
        className="decision-reference-candidates"
        aria-label="후보 시간 목록"
        data-mobile-expanded={showMobileAlternatives}
        onScroll={(event) => {
          updateScrollEdges(event.currentTarget)
        }}
      >
        <header>
          <div>
            <strong>추천 후보</strong>
            <span className="candidate-ranking-help">
              <button
                type="button"
                aria-label="추천 후보 선정 기준"
                aria-describedby="candidate-ranking-description"
              >
                <Info aria-hidden="true" size={15} />
              </button>
              <span id="candidate-ranking-description" role="tooltip">
                참석 기준을 충족한 시간 중 일정 조정과 기피 표시가 적은 순이에요.
              </span>
            </span>
          </div>
        </header>
        {evaluations.map((evaluation) => {
          const isSelected = evaluation.candidate.id === selectedEvaluation.candidate.id

          return (
            <article
              className={`decision-reference-card is-${getStatusTone(evaluation.status)}${isSelected ? ' is-selected' : ''}`}
              key={evaluation.candidate.id}
            >
              <button
                className="decision-reference-card__select"
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(evaluation)}
              >
                <span className="decision-reference-card__copy">
                  <strong>{formatCandidateTime(evaluation.candidate)}</strong>
                  <span>
                    <small>{candidateStatusLabels[evaluation.status]}</small>
                  </span>
                  <em>
                    {evaluation.availableCount}/{meeting.participants.length}명 가능
                  </em>
                </span>
                {systemRecommendedEvaluation.status === 'ready' &&
                hasSameRecommendationPriority(evaluation, systemRecommendedEvaluation) ? (
                  <span
                    className="decision-reference-card__recommendation"
                    aria-label="같은 우선순위의 추천 후보"
                  >
                    <Star aria-hidden="true" size={15} fill="currentColor" />
                  </span>
                ) : null}
                {isSelected ? (
                  <span className="decision-reference-card__selection" aria-hidden="true">
                    <Check size={14} strokeWidth={2.5} />
                  </span>
                ) : null}
              </button>
              {isSelected ? (
                canConfirm ? (
                  <Button size="action" onClick={() => onConfirm(evaluation.candidate.id)}>
                    이 시간으로 정하기
                  </Button>
                ) : evaluation.status === 'pending' ? (
                  <Button size="action" onClick={() => onRequest(evaluation.candidate.id)}>
                    응답 요청하기
                  </Button>
                ) : (
                  <Button size="action" onClick={onShowAlternative}>
                    다른 시간 보기
                  </Button>
                )
              ) : null}
            </article>
          )
        })}
      </div>
    </div>
  )
}

function getStatusTone(status: CandidateEvaluation['status']) {
  if (status === 'ready') return 'success'
  if (status === 'pending') return 'info'
  return 'danger'
}
