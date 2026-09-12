import { useEffect, useReducer, useRef, useState } from 'react'
import { ArrowRight, Check, CheckCheck, Clock3, Users, X } from 'lucide-react'
import { startOfWeek, today } from '@internationalized/date'
import {
  createRecoveryState,
  recoveryReducer,
  type RecoveryCandidateId,
  type RecoveryReply,
} from '../domain/coordinationRecovery'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { MainCard } from './ui/main-card'
import { Avatar } from './ui/avatar'
import { CalendarDate, TimeRange } from './ui/calendar-date'
import { Dialog } from './ui/dialog'
import './CoordinationRecovery.css'

const people = ['지훈', '수진', '민수', '서연', '도윤', '유나']
const candidates = [
  {
    id: 'tuesday',
    person: '수진',
    day: 1,
    hour: 14,
    action: '참석 확인',
    issue: '이 시간에 아직 답하지 않았어요.',
    request: '화요일 이 시간에 참석할 수 있나요?',
  },
  {
    id: 'thursday',
    person: '민수',
    day: 3,
    hour: 16,
    action: '일정 변경 동의',
    issue: '기존 일정은 조정해 볼 수 있다고 했어요.',
    request: '기존 일정을 옮기고 참석할 수 있나요?',
  },
] as const
type Candidate = (typeof candidates)[number]

function CandidateTime({ candidate, monday }: { candidate: Candidate; monday: string }) {
  const day = new Date(`${monday}T00:00:00+09:00`)
  day.setUTCDate(day.getUTCDate() + candidate.day)
  const date = day.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
  const start = `${date}T${candidate.hour}:00:00+09:00`
  return (
    <div className="recovery-time">
      <CalendarDate value={start} compact />
      <div>
        <CalendarDate value={start} />
        <TimeRange start={start} end={`${date}T${candidate.hour + 1}:00:00+09:00`} />
      </div>
    </div>
  )
}

export function CoordinationRecovery({
  onOtherScreens,
  onNewTimes,
}: {
  onOtherScreens: () => void
  onNewTimes: () => void
}) {
  const [state, dispatch] = useReducer(recoveryReducer, undefined, createRecoveryState)
  const [role, setRole] = useState<'host' | RecoveryCandidateId>('host')
  const [request, setRequest] = useState<Candidate | null>(null)
  const [reply, setReply] = useState<RecoveryReply | null>(null)
  const [comparison, setComparison] = useState(false)
  const [monday] = useState(() =>
    startOfWeek(today('Asia/Seoul'), 'ko-KR', 'mon').add({ weeks: 1 }).toString(),
  )
  const heading = useRef<HTMLHeadingElement>(null)
  const pending = candidates.find((c) => state.statuses[c.id] === 'pending')
  const active = candidates.find((c) => c.id === role)
  const confirmed = candidates.find((c) => c.id === state.confirmed)
  const declined = candidates.filter((c) => state.statuses[c.id] === 'declined')
  const accepted = candidates.find((c) => state.statuses[c.id] === 'accepted')
  const statusOrder = { accepted: 0, pending: 1, unasked: 2, declined: 3 }
  const orderedCandidates = [...candidates].sort(
    (a, b) => statusOrder[state.statuses[a.id]] - statusOrder[state.statuses[b.id]],
  )
  const replied = active && ['accepted', 'declined'].includes(state.statuses[active.id])
  const scene = `${role}-${confirmed?.id ?? ''}-${replied ?? false}`
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [scene])

  return (
    <div className="recovery-page">
      <div className="recovery-preview">
        <span>
          <strong>조율 복구 시안</strong> 가상 회의 · 실제 발송 없음 · 새로고침 시 초기화
        </span>
        <div>
          {role !== 'host' ? (
            <Button
              variant="quiet"
              size="text"
              onClick={() => {
                setRole('host')
                setReply(null)
              }}
            >
              주최자 화면으로 <ArrowRight size={14} />
            </Button>
          ) : pending ? (
            <Button variant="quiet" size="text" onClick={() => setRole(pending.id)}>
              {pending.person}
              {pending.id === 'tuesday' ? '으로' : '로'} 응답해 보기 <ArrowRight size={14} />
            </Button>
          ) : (
            <Button variant="quiet" size="text" onClick={() => setComparison(true)}>
              바뀐 흐름 보기
            </Button>
          )}
          <Button variant="quiet" size="text" onClick={onOtherScreens}>
            다른 시안
          </Button>
        </div>
      </div>
      <header className="recovery-brandbar">
        <a
          className="account-brand respond-brand"
          href={`${import.meta.env.BASE_URL}toss/#/home`}
          aria-label="MeetCue 홈으로"
        >
          <img
            className="brand-dot"
            src={`${import.meta.env.BASE_URL}brand/meetcue-emblem-64.png`}
            alt=""
          />
          <strong className="brand-wordmark">MeetCue</strong>
        </a>
        <span>
          <Avatar name={active?.person ?? '지훈'} size="small" />
          {active ? `${active.person} · 참석자` : '지훈 · 주최자'}
        </span>
      </header>

      <main
        className={`recovery-main${active || confirmed ? ' recovery-main--focused' : ''}`}
        key={scene}
      >
        <p className="recovery-context">
          프로덕트 방향성 리뷰 <span>· 1시간 · 6명</span>
        </p>
        {active ? (
          <>
            <header className="recovery-heading">
              <p className="recovery-eyebrow">
                {replied ? '응답 완료' : `지훈님이 ${active.person}님에게 확인을 요청했어요`}
              </p>
              <h1 ref={heading} tabIndex={-1}>
                {replied
                  ? state.statuses[active.id] === 'accepted'
                    ? '참석 가능하다고 전달했어요'
                    : '참석이 어렵다고 전달했어요'
                  : active.request}
              </h1>
              <p>
                {replied
                  ? state.statuses[active.id] === 'accepted'
                    ? '주최자가 시간을 확정하면 조율이 끝나요.'
                    : '이 시간은 확정하지 않아요. 다른 시간에 남긴 답은 그대로예요.'
                  : '다른 5명은 이 시간에 참석할 수 있어요.'}
              </p>
            </header>
            <MainCard material="soft" className="recovery-answer">
              <CandidateTime candidate={active} monday={monday} />
              {!replied && (
                <>
                  {active.id === 'thursday' && (
                    <p className="recovery-explanation">
                      기존 일정을 실제로 옮길 수 있는지 확인한 뒤 답해주세요. 변경에 동의하기 전에는
                      이 회의를 확정하지 않아요.
                    </p>
                  )}
                  <fieldset className="recovery-choices">
                    <legend className="sr-only">참석 여부</legend>
                    {(['accepted', 'declined'] as const).map((value) => (
                      <label key={value} data-selected={reply === value}>
                        <input
                          type="radio"
                          name="recovery-reply"
                          value={value}
                          checked={reply === value}
                          onChange={() => setReply(value)}
                        />
                        <span>
                          <strong>
                            {value === 'accepted'
                              ? active.id === 'thursday'
                                ? '일정을 옮기고 참석할게요'
                                : '참석할 수 있어요'
                              : active.id === 'thursday'
                                ? '일정을 옮기기 어려워요'
                                : '이 시간은 어려워요'}
                          </strong>
                          <small>
                            {value === 'accepted'
                              ? '이 시간으로 회의를 정해도 괜찮아요.'
                              : '다른 후보를 검토해 주세요.'}
                          </small>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <Button
                    width="full"
                    disabled={!reply}
                    onClick={() => {
                      if (reply) dispatch({ type: 'reply', candidateId: active.id, reply })
                    }}
                  >
                    응답 보내기
                  </Button>
                </>
              )}
              {replied && (
                <div className="recovery-receipt">
                  <CheckCheck size={20} />
                  <span>이 시간의 응답만 업데이트했어요.</span>
                </div>
              )}
            </MainCard>
            {replied ? (
              <Button
                width="full"
                variant="secondary"
                onClick={() => {
                  setRole('host')
                  setReply(null)
                }}
              >
                주최자 화면에서 결과 보기 <ArrowRight size={16} />
              </Button>
            ) : (
              <p className="recovery-footnote">아직 확인이 필요하면 나중에 답해도 괜찮아요.</p>
            )}
          </>
        ) : confirmed ? (
          <>
            <div className="recovery-success">
              <Check size={28} />
            </div>
            <header className="recovery-heading">
              <p className="recovery-eyebrow">일정 확정</p>
              <h1 ref={heading} tabIndex={-1}>
                여섯 명이 만날 시간을 정했어요
              </h1>
              <p>
                {confirmed.person}님의{' '}
                {confirmed.id === 'thursday' ? '일정 변경 동의' : '참석 확인'}를 반영했어요.
              </p>
            </header>
            <MainCard material="soft" className="recovery-answer">
              <CandidateTime candidate={confirmed} monday={monday} />
              <div className="recovery-receipt">
                <Users size={18} />
                <span>지훈 · 수진 · 민수 · 서연 · 도윤 · 유나</span>
              </div>
              <p className="recovery-explanation">
                {confirmed.id === 'thursday'
                  ? '민수님이 기존 일정을 옮기기로 동의했어요. 캘린더의 기존 일정은 자동으로 변경되지 않아요.'
                  : '기존에 받은 5명의 답과 수진님의 추가 응답으로 확정했어요.'}
              </p>
            </MainCard>
            <p className="recovery-footnote">
              시안 안에서 확정했어요. 실제 캘린더와 알림에는 반영되지 않아요.
            </p>
          </>
        ) : (
          <>
            <header className="recovery-heading">
              <p className="recovery-eyebrow">
                {accepted
                  ? '확정 준비 완료'
                  : pending
                    ? '추가 확인 중'
                    : declined.length === 2
                      ? '새 후보가 필요해요'
                      : '마지막 확인이 남았어요'}
              </p>
              <h1 ref={heading} tabIndex={-1}>
                {accepted
                  ? '이제 회의 시간을 정할 수 있어요'
                  : pending
                    ? `${pending.person}님의 답을 기다리고 있어요`
                    : declined.length === 2
                      ? '이번 두 시간에는 만나기 어려워요'
                      : declined.length
                        ? '다른 후보로 이어서 조율해요'
                        : '한 사람의 확인을 더 받으면 돼요'}
              </h1>
              <p>
                {pending
                  ? '다른 사람에게 받은 답은 유지돼요. 아직 회의는 확정되지 않았어요.'
                  : declined.length === 2
                    ? '필수 참석자가 어려운 시간은 제외하고 새 후보를 찾아요.'
                    : accepted
                      ? '필수 참석자 4명을 포함해 6명 모두 참석할 수 있어요.'
                      : declined.length
                        ? `${declined[0].person}님이 ${declined[0].id === 'tuesday' ? '화요일 참석이' : '목요일 일정 변경이'} 어렵다고 답했어요. 다른 후보의 응답은 그대로예요.`
                        : '두 후보 모두 5명은 가능해요. 누구에게 무엇을 확인할지 골라주세요.'}
              </p>
            </header>
            <div className="recovery-candidates">
              {orderedCandidates.map((c) => {
                const status = state.statuses[c.id]
                return (
                  <MainCard
                    as="article"
                    material="soft"
                    key={c.id}
                    className="recovery-candidate"
                    aria-labelledby={`candidate-${c.id}`}
                  >
                    <header className="recovery-candidate-top">
                      <h2 id={`candidate-${c.id}`}>{c.action}</h2>
                      <Badge
                        tone={
                          status === 'accepted'
                            ? 'success'
                            : status === 'declined'
                              ? 'danger'
                              : 'info'
                        }
                        size="compact"
                      >
                        {status === 'accepted'
                          ? '확정 가능'
                          : status === 'declined'
                            ? '참석 불가'
                            : status === 'pending'
                              ? '답변 대기'
                              : '확인 필요'}
                      </Badge>
                    </header>
                    <CandidateTime candidate={c} monday={monday} />
                    <div className="recovery-person">
                      <Avatar name={c.person} />
                      <div>
                        <strong>
                          {c.person} <small>필수 참석</small>
                        </strong>
                        <p>
                          {status === 'accepted'
                            ? c.id === 'thursday'
                              ? '일정을 옮기고 참석하기로 동의했어요.'
                              : '참석할 수 있다고 답했어요.'
                            : status === 'declined'
                              ? c.id === 'thursday'
                                ? '기존 일정을 옮기기 어렵다고 답했어요.'
                                : '이 시간에는 참석이 어렵다고 답했어요.'
                              : status === 'pending'
                                ? '이 시간에 대한 확인을 요청했어요.'
                                : c.issue}
                        </p>
                      </div>
                    </div>
                    <details className="recovery-evidence">
                      <summary>
                        <CheckCheck size={16} />
                        다른 5명은 참석 가능 <span>응답 보기</span>
                      </summary>
                      <ul>
                        {people
                          .filter((name) => name !== c.person)
                          .map((name) => (
                            <li key={name}>
                              <span>
                                {name}
                                {name === '지훈' ? ' (주최자)' : ''}
                              </span>
                              <span>
                                <Check size={14} />
                                가능
                              </span>
                            </li>
                          ))}
                      </ul>
                    </details>
                    <footer>
                      {status === 'accepted' ? (
                        <Button
                          width="full"
                          onClick={() => dispatch({ type: 'confirm', candidateId: c.id })}
                        >
                          이 시간으로 확정 <Check size={16} />
                        </Button>
                      ) : status === 'declined' ? (
                        <p>
                          <X size={16} />이 후보로는 확정하지 않아요
                        </p>
                      ) : status === 'pending' ? (
                        <p>
                          <Clock3 size={16} />
                          {c.person}님의 답변 대기 중
                        </p>
                      ) : (
                        <Button
                          width="full"
                          variant={c.id === 'tuesday' || declined.length ? 'primary' : 'secondary'}
                          disabled={!!pending || !!accepted}
                          onClick={() => setRequest(c)}
                        >
                          {c.person}에게 {c.id === 'tuesday' ? '참석 확인' : '변경 동의'} 요청{' '}
                          <ArrowRight size={16} />
                        </Button>
                      )}
                    </footer>
                  </MainCard>
                )
              })}
            </div>
            {pending && (
              <div className="recovery-waiting">
                <p className="recovery-footnote">
                  기다리기 어렵다면 현재 요청을 취소하고 다른 후보를 확인할 수 있어요.
                </p>
                <Button
                  variant="quiet"
                  size="compact"
                  onClick={() => dispatch({ type: 'cancel', candidateId: pending.id })}
                >
                  확인 요청 취소
                </Button>
              </div>
            )}
            {declined.length === 2 && (
              <div className="recovery-next">
                <p>
                  다른 시간은 새 확인이 필요해요.
                  <br />
                  <small>이미 불가능하다고 답한 두 후보의 기록은 이 시안에 남아 있어요.</small>
                </p>
                <Button onClick={onNewTimes}>
                  새 시간 범위 살펴보기 <ArrowRight size={16} />
                </Button>
              </div>
            )}
            <details className="recovery-background">
              <summary>회의 조건과 지금까지의 응답</summary>
              <p>
                다음 주에 진행하는 1시간 회의예요. 지훈·수진·민수·서연은 필수, 도윤·유나는 선택
                참석자예요. 두 후보에서 도윤·유나는 모두 참석 가능하다고 답했어요.
              </p>
              <p>수진의 미응답은 불참으로, 민수의 조정 의향은 변경 동의로 계산하지 않았어요.</p>
            </details>
          </>
        )}
      </main>

      {request && (
        <Dialog
          title={`${request.person}님에게 이 시간만 확인해요`}
          onClose={() => setRequest(null)}
        >
          <div className="recovery-request">
            <CandidateTime candidate={request} monday={monday} />
            <blockquote>{request.request}</blockquote>
            <p>
              {request.id === 'thursday'
                ? '일정을 옮기는 데 동의하는지 물어요. 기존 일정은 자동으로 바뀌지 않아요.'
                : '다른 시간표를 다시 작성할 필요 없이 이 시간의 참석 여부만 물어요.'}
            </p>
            <p className="recovery-footnote">다른 5명에게는 다시 요청하지 않아요.</p>
            <Button
              width="full"
              onClick={() => {
                dispatch({ type: 'request', candidateId: request.id })
                setRequest(null)
              }}
            >
              {request.person}에게 확인 요청
            </Button>
          </div>
        </Dialog>
      )}
      {comparison && (
        <Dialog title="첫 조율이 막혔을 때의 흐름" onClose={() => setComparison(false)}>
          <div className="recovery-comparison">
            <p>응답표를 받은 뒤에도 남는 재확인 과정을 제품 안에 연결한 시안이에요.</p>
            <section>
              <h3>기존 MeetCue + 메신저</h3>
              <ol>
                <li>후보별 응답과 조건을 확인한다.</li>
                <li>주최자가 따로 연락해 참석이나 일정 변경을 확인한다.</li>
                <li>받은 답을 결과와 대조하고 회의를 확정한다.</li>
              </ol>
            </section>
            <section>
              <h3>이번 시안</h3>
              <ol>
                <li>후보마다 누구의 어떤 확인이 필요한지 본다.</li>
                <li>그 사람에게 해당 시간만 묻고, 답을 후보에 반영한다.</li>
                <li>수락하면 확정한다. 거절하면 다른 후보의 답을 유지하고 이어간다.</li>
              </ol>
            </section>
            <small>
              기존 방식은 비교용으로 재구성한 흐름이며 실제 사용자 관찰 기록이 아니에요. 두 후보가
              모두 거절된 이후의 새 범위 조율은 기존 입력 시안으로 연결돼요.
            </small>
          </div>
        </Dialog>
      )}
    </div>
  )
}
