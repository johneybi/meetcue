import { Fragment, useRef, useState } from 'react'
import { Check, Clock3, X } from 'lucide-react'
import {
  hasSameRecommendationPriority,
  type CandidateEvaluation,
} from '../domain/evaluation'
import {
  candidateStatusLabels,
  type CandidateStatus,
} from '../domain/meeting'
import { useMediaQuery } from '../hooks/useMediaQuery'
import {
  formatCandidateDay,
  formatCandidateFullDate,
  formatCandidateMinutes,
  formatCandidateStartTime,
  formatCandidateWeekday,
  getCandidateDateKey,
  getCandidateMinuteOfDay,
} from '../lib/candidateTime'

const candidateStatusOrder: CandidateStatus[] = ['ready', 'pending', 'impossible']

type HostCandidateCalendarProps = {
  evaluations: CandidateEvaluation[]
  selectedEvaluation: CandidateEvaluation
  systemRecommendedEvaluation: CandidateEvaluation
  onSelect: (candidateId: string) => void
}

export function HostCandidateCalendar({
  evaluations,
  selectedEvaluation,
  systemRecommendedEvaluation,
  onSelect,
}: HostCandidateCalendarProps) {
  const selectedCandidateDateKey = getCandidateDateKey(selectedEvaluation.candidate.startAt)
  const isMobile = useMediaQuery('(max-width: 760px)')
  const [dateSelection, setDateSelection] = useState<{
    candidateId: string
    dateKey: string
  } | null>(null)
  const selectedDateKey =
    dateSelection?.candidateId === selectedEvaluation.candidate.id
      ? dateSelection.dateKey
      : selectedCandidateDateKey
  const calendarRef = useRef<HTMLElement>(null)
  const readyCount = evaluations.filter((evaluation) => evaluation.status === 'ready').length
  const pendingCount = evaluations.filter((evaluation) => evaluation.status === 'pending').length
  const impossibleCount = evaluations.filter(
    (evaluation) => evaluation.status === 'impossible',
  ).length
  const dateGroups = Array.from(
    evaluations.reduce((groups, evaluation) => {
      const dateKey = getCandidateDateKey(evaluation.candidate.startAt)
      const current = groups.get(dateKey) ?? []
      current.push(evaluation)
      groups.set(dateKey, current)
      return groups
    }, new Map<string, CandidateEvaluation[]>()),
  ).sort(([left], [right]) => left.localeCompare(right))
  const visibleDateGroups = isMobile
    ? dateGroups.filter(([dateKey]) => dateKey === selectedDateKey)
    : dateGroups
  const candidateMinuteValues = evaluations.map((evaluation) =>
    getCandidateMinuteOfDay(evaluation.candidate.startAt),
  )
  const firstCandidateMinute = Math.min(...candidateMinuteValues)
  const lastCandidateMinute = Math.max(...candidateMinuteValues)
  const candidateMapMinutes = Array.from(
    { length: Math.floor((lastCandidateMinute - firstCandidateMinute) / 30) + 1 },
    (_, index) => firstCandidateMinute + index * 30,
  )

  return (
    <details className="candidate-calendar-disclosure" open={!isMobile}>
      <summary>
        <div>
          <span>전체 {evaluations.length}개</span>
          <strong>모든 시간 보기</strong>
        </div>
        <small>
          {readyCount}개 확정 가능 · {pendingCount}개 응답 대기 · {impossibleCount}개 제외
        </small>
      </summary>
      <section
        className="candidate-calendar"
        aria-labelledby="candidate-calendar-title"
        ref={calendarRef}
      >
        <div className="candidate-comparison__head">
          <div>
            <span>전체 후보</span>
            <h2 id="candidate-calendar-title">회의를 시작할 수 있는 구간을 한눈에 보세요</h2>
          </div>
          <div className="candidate-map-head-meta">
            <small>{evaluations.length}개 시작 시각</small>
            <div className="candidate-map-legend" aria-label="시간 지도 범례">
              <span>
                <Check aria-hidden="true" size={14} />
                지금 결정
              </span>
              <span>
                <Clock3 aria-hidden="true" size={14} />
                응답 필요
              </span>
              <span>
                <X aria-hidden="true" size={14} />
                제외 권장
              </span>
            </div>
          </div>
        </div>

        <div className="candidate-date-strip" aria-label="후보가 있는 날짜">
          {dateGroups.map(([dateKey, dateEvaluations]) => {
            const statuses = new Set(dateEvaluations.map((evaluation) => evaluation.status))
            const isSelected = dateKey === selectedDateKey

            return (
              <button
                key={dateKey}
                type="button"
                className={isSelected ? 'is-selected' : ''}
                aria-pressed={isSelected}
                onClick={() =>
                  setDateSelection({
                    candidateId: selectedEvaluation.candidate.id,
                    dateKey,
                  })
                }
              >
                <span>{formatCandidateWeekday(dateKey)}</span>
                <strong>{formatCandidateDay(dateKey)}</strong>
                <small>{dateEvaluations.length}개 시간</small>
                <span
                  className="candidate-date-dots"
                  aria-label={formatDateStatusSummary(dateEvaluations)}
                >
                  {candidateStatusOrder.map((status) =>
                    statuses.has(status) ? (
                      <i key={status} className={`is-${getStatusTone(status)}`} />
                    ) : null,
                  )}
                </span>
              </button>
            )
          })}
        </div>

        <div
          className="candidate-decision-map"
          style={{
            gridTemplateColumns: `64px repeat(${visibleDateGroups.length}, minmax(120px, 1fr))`,
          }}
          aria-label="후보 시작 시각 지도"
        >
          <div className="candidate-decision-map__corner">시작</div>
          {visibleDateGroups.map(([dateKey]) => (
            <div className="candidate-decision-map__date" key={`head-${dateKey}`}>
              <span>{formatCandidateWeekday(dateKey)}</span>
              <strong>{formatCandidateDay(dateKey)}</strong>
            </div>
          ))}

          {candidateMapMinutes.map((minutes) => (
            <Fragment key={minutes}>
              <div className="candidate-decision-map__time">{formatCandidateMinutes(minutes)}</div>
              {visibleDateGroups.map(([dateKey, dateEvaluations]) => {
                const evaluation = dateEvaluations.find(
                  (candidate) => getCandidateMinuteOfDay(candidate.candidate.startAt) === minutes,
                )

                if (evaluation == null) {
                  return <div className="candidate-decision-map__empty" key={`${dateKey}-${minutes}`} />
                }

                const previous = dateEvaluations.find(
                  (candidate) =>
                    getCandidateMinuteOfDay(candidate.candidate.startAt) === minutes - 30,
                )
                const next = dateEvaluations.find(
                  (candidate) =>
                    getCandidateMinuteOfDay(candidate.candidate.startAt) === minutes + 30,
                )
                const connectsBefore = hasSameDecisionBand(previous, evaluation)
                const connectsAfter = hasSameDecisionBand(next, evaluation)
                const isRecommended =
                  systemRecommendedEvaluation.status === 'ready' &&
                  hasSameRecommendationPriority(evaluation, systemRecommendedEvaluation)
                const isSelected = evaluation.candidate.id === selectedEvaluation.candidate.id

                return (
                  <button
                    key={evaluation.candidate.id}
                    type="button"
                    className={`candidate-decision-map__slot is-${getStatusTone(evaluation.status)}${
                      connectsBefore ? ' is-connected-before' : ''
                    }${connectsAfter ? ' is-connected-after' : ''}${
                      isRecommended ? ' is-recommended' : ''
                    }${isSelected ? ' is-selected' : ''}`}
                    aria-label={`${formatCandidateFullDate(dateKey)} ${formatCandidateStartTime(
                      evaluation.candidate.startAt,
                    )}, ${candidateStatusLabels[evaluation.status]}${isRecommended ? ', 추천' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => {
                      onSelect(evaluation.candidate.id)
                      setDateSelection({ candidateId: evaluation.candidate.id, dateKey })
                    }}
                  >
                    <span>{formatCandidateStartTime(evaluation.candidate.startAt)}</span>
                    {isRecommended ? (
                      <strong>추천</strong>
                    ) : evaluation.status === 'ready' ? (
                      <Check aria-hidden="true" size={13} />
                    ) : evaluation.status === 'pending' ? (
                      <Clock3 aria-hidden="true" size={13} />
                    ) : (
                      <X aria-hidden="true" size={13} />
                    )}
                  </button>
                )
              })}
            </Fragment>
          ))}
        </div>

        <p className="candidate-map-hint">
          캘린더는 후보의 근거를 확인하는 영역이에요. 시간을 누르면 위의 후보와 근거가 함께
          바뀌어요.
        </p>
      </section>
    </details>
  )
}

function hasSameDecisionBand(
  adjacent: CandidateEvaluation | undefined,
  current: CandidateEvaluation,
) {
  return (
    adjacent != null &&
    adjacent.status === current.status &&
    adjacent.reasons[0] === current.reasons[0]
  )
}

function formatDateStatusSummary(evaluations: CandidateEvaluation[]) {
  const counts = candidateStatusOrder
    .map((status) => ({
      status,
      count: evaluations.filter((evaluation) => evaluation.status === status).length,
    }))
    .filter(({ count }) => count > 0)

  return counts.map(({ status, count }) => `${candidateStatusLabels[status]} ${count}개`).join(', ')
}

function getStatusTone(status: CandidateStatus) {
  if (status === 'ready') return 'success'
  if (status === 'pending') return 'info'
  return 'danger'
}
