import { useEffect, useReducer, useRef, useState } from 'react'
import { startOfWeek, today } from '@internationalized/date'
import { Check, ArrowRight, Clock3 } from 'lucide-react'
import {
  constraintReducer,
  createConstraintExample,
  describePath,
  type RecoverySlot,
} from '../domain/constraintRecovery'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { MainCard } from './ui/main-card'
import { Avatar } from './ui/avatar'
import { CalendarDate, TimeRange } from './ui/calendar-date'
import { Dialog } from './ui/dialog'
import './CoordinationRecovery.css'
import './ConstraintRecovery.css'

function SlotTime({ slot }: { slot: RecoverySlot }) {
  return (
    <div className="recovery-time">
      <CalendarDate value={slot.start} compact />
      <div>
        <CalendarDate value={slot.start} />
        <TimeRange start={slot.start} end={slot.end} />
      </div>
    </div>
  )
}
export function ConstraintRecovery({ onOtherScreens }: { onOtherScreens: () => void }) {
  const [state, dispatch] = useReducer(constraintReducer, undefined, () =>
    createConstraintExample(
      startOfWeek(today('Asia/Seoul'), 'ko-KR', 'mon').add({ weeks: 1 }).toString(),
    ),
  )
  const [personId, setPersonId] = useState('host')
  const [requestId, setRequestId] = useState<number | null>(null)
  const [selected, setSelected] = useState<'yes' | 'no' | null>(null)
  const [dialog, setDialog] = useState<'end' | 'add' | string | null>(null)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('14:00')
  const [ownAvailable, setOwnAvailable] = useState(false)
  const [notice, setNotice] = useState('')
  const [openedAt, setOpenedAt] = useState(() => Date.now())
  const heading = useRef<HTMLHeadingElement>(null)
  const active = state.requests.find((r) => r.status === 'active')
  const viewed = state.requests.find((r) => r.id === requestId)
  const viewedSlot = state.slots.find((s) => s.id === viewed?.slotId)
  const person = state.people.find((p) => p.id === personId)!
  const confirmedSlot = state.slots.find((s) => s.id === state.confirmed)
  const paths = state.slots.map((slot) => ({ slot, path: describePath(state, slot) }))
  const viable = paths.filter((p) => !p.path.blocked.length)
  const closed = paths.filter((p) => p.path.blocked.length)
  const requestSlot = state.slots.find((s) => s.id === dialog)
  const myReply = viewed?.replies[personId]
  const canAnswer = viewed?.status === 'active' && myReply === 'pending'
  const isChange = viewedSlot?.answers[personId]?.kind === 'adjustment_intent'
  const changeView = (id: string, rid: number | null) => {
    setPersonId(id)
    setRequestId(rid)
    setSelected(null)
    setNotice('')
  }
  const actionKey = `${personId}-${requestId}-${state.confirmed}-${state.ended}-${myReply}-${viewed?.status}`
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [actionKey])
  const dateStart = newDate ? `${newDate}T${newTime}:00+09:00` : ''
  const validDate =
    !!dateStart &&
    Date.parse(dateStart) > openedAt &&
    !state.slots.some((s) => Date.parse(s.start) === Date.parse(dateStart))
  const title = state.ended
    ? '이번 회의 조율을 종료했어요'
    : confirmedSlot
      ? '회의 시간을 확정했어요'
      : active
        ? describePath(
            state,
            state.slots.find((s) => s.id === active.slotId)!,
          ).ready
          ? '필요한 동의를 모두 받았어요'
          : '선택한 경로의 답을 확인하고 있어요'
        : !viable.length
          ? '현재 조건에서는 회의를 정할 수 없어요'
          : viable.some(({ path }) => path.unknown.length)
            ? '새 시간의 참석 여부를 확인해요'
            : state.requests.some((r) => r.status === 'rejected')
              ? '남아 있는 경로로 이어서 조율해요'
              : '아직 함께 모일 시간이 없어요'
  return (
    <div className="recovery-page constraint-recovery-page">
      <div className="recovery-preview">
        <span>
          <strong>복구 경로 시안</strong>가상 회의 · 실제 발송 없음 · 새로고침 시 초기화
        </span>
        <div>
          {personId !== 'host' && (
            <Button variant="quiet" size="text" onClick={() => changeView('host', null)}>
              주최자 화면으로
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
          <Avatar name={person.name} />
          {person.name} · {personId === 'host' ? '주최자' : '참석자'}
        </span>
      </header>
      <main
        className={`recovery-main${personId !== 'host' || state.ended || state.confirmed ? ' recovery-main--focused' : ''}`}
      >
        <p className="recovery-context">
          프로덕트 방향성 리뷰 <span>· 1시간 · 필수 4명 / 선택 2명</span>
        </p>
        <p className="sr-only" role="status">
          {notice}
        </p>
        {personId !== 'host' && viewed && viewedSlot ? (
          <>
            <header className="recovery-heading">
              <p className="recovery-eyebrow">
                지훈님이 보낸 {isChange ? '일정 변경 동의' : '참석 확인'} 요청
              </p>
              <h1 ref={heading} tabIndex={-1}>
                {viewed.status === 'rejected' || viewed.status === 'canceled'
                  ? '이 후보로는 진행하지 않아요'
                  : viewed.status === 'confirmed'
                    ? '이 시간으로 회의를 확정했어요'
                    : myReply === 'yes'
                      ? '답을 전달했어요. 최종 확정을 기다려주세요.'
                      : isChange
                        ? '이 시간에 맞춰 기존 일정을 옮길 수 있나요?'
                        : '이 시간에 참석할 수 있나요?'}
              </h1>
              <p>
                {viewed.status === 'rejected' || viewed.status === 'canceled'
                  ? '기존 일정을 바꾸지 않아도 돼요. 이미 보낸 답은 기록에 남겨두었어요.'
                  : isChange
                    ? '변경에 동의하더라도 주최자의 최종 확정 전에는 기존 일정을 옮기지 마세요.'
                    : '이 후보의 참석 여부만 확인해 주세요.'}
              </p>
            </header>
            <MainCard material="soft" className="recovery-answer">
              <SlotTime slot={viewedSlot} />
              {isChange && (
                <p className="recovery-explanation">
                  변경이 필요한 일정: {viewedSlot.answers[personId].conflicts.join(' · ')}
                </p>
              )}
              {canAnswer ? (
                <>
                  <fieldset className="recovery-choices">
                    <legend className="sr-only">요청에 대한 답</legend>
                    {(['yes', 'no'] as const).map((value) => (
                      <label key={value} data-selected={selected === value}>
                        <input
                          type="radio"
                          name="consent"
                          checked={selected === value}
                          onChange={() => setSelected(value)}
                        />
                        <span>
                          <strong>
                            {value === 'yes'
                              ? isChange
                                ? '확정되면 일정을 옮길게요'
                                : '참석할 수 있어요'
                              : isChange
                                ? '일정 변경이 어려워요'
                                : '참석하기 어려워요'}
                          </strong>
                          <small>
                            {value === 'yes'
                              ? '이 후보로 진행하는 데 동의해요.'
                              : '이 후보로 진행하지 말아 주세요.'}
                          </small>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <Button
                    width="full"
                    disabled={!selected}
                    onClick={() => {
                      if (selected) {
                        dispatch({ type: 'reply', requestId: viewed.id, personId, value: selected })
                        setNotice('응답을 반영했어요.')
                      }
                    }}
                  >
                    응답 보내기
                  </Button>
                </>
              ) : (
                <p className="recovery-receipt">
                  <Check size={18} />
                  {myReply === 'yes'
                    ? '내 응답: 동의'
                    : myReply === 'no'
                      ? '내 응답: 거절'
                      : '이 요청은 종료되어 응답할 필요가 없어요.'}
                </p>
              )}
            </MainCard>
            <Button variant="secondary" width="full" onClick={() => changeView('host', null)}>
              주최자 화면에서 결과 보기 <ArrowRight size={16} />
            </Button>
          </>
        ) : (
          <>
            <header className="recovery-heading">
              <p className="recovery-eyebrow">
                {state.confirmed
                  ? '일정 확정'
                  : state.ended
                    ? '조율 종료'
                    : '응답 결과 · 다음 단계'}
              </p>
              <h1 ref={heading} tabIndex={-1}>
                {title}
              </h1>
              <p>
                {state.ended
                  ? '응답과 변경 요청 이력은 남겼어요. 진행 중이던 요청은 종료했어요.'
                  : confirmedSlot
                    ? '필수 참석 조건을 충족했어요. 동의한 사람에게 이 시간으로 진행한다는 상태를 보여줘요.'
                    : active
                      ? '현재 후보가 성립하려면 아래 사람들의 답이 필요해요.'
                      : !viable.length
                        ? '필수 참석자를 제외하거나 변경 불가 일정을 옮기는 것으로 처리하지 않아요.'
                        : '조정 의향이 있는 참석자에게 변경을 요청할 수 있어요. 어떤 시간으로 이어갈지 골라 주세요.'}
              </p>
            </header>
            {confirmedSlot ? (
              <MainCard material="soft" className="recovery-answer">
                <SlotTime slot={confirmedSlot} />
                <p className="recovery-receipt">
                  참석 확인:{' '}
                  {describePath(state, confirmedSlot)
                    .available.map((p) => p.name)
                    .join(' · ')}
                </p>
                <p className="recovery-explanation">
                  선택 참석자 미확인:{' '}
                  {state.people
                    .filter((p) => !p.required && confirmedSlot.answers[p.id]?.kind === 'unknown')
                    .map((p) => p.name)
                    .join(' · ') || '없음'}
                </p>
                <p className="recovery-footnote">
                  실제 캘린더 변경·알림 발송은 하지 않는 로컬 시안이에요.
                </p>
              </MainCard>
            ) : (
              !state.ended && (
                <>
                  {!!viable.length && (
                    <div className="constraint-comparison-heading">
                      <h2>
                        이어갈 수 있는 후보 <span>{viable.length}</span>
                      </h2>
                      <p>동의 전에는 확정되지 않아요</p>
                    </div>
                  )}
                  <div className="constraint-paths">
                    {viable.map(({ slot, path }) => (
                      <MainCard
                        material="soft"
                        as="article"
                        className="recovery-candidate"
                        key={slot.id}
                        aria-label={`${slot.id} 복구 경로`}
                      >
                        <header className="recovery-candidate-top">
                          <span className="constraint-path-type">
                            {path.unknown.length ? '추가 응답 확인' : '일정 변경 동의'}
                          </span>
                          <Badge tone={path.ready ? 'success' : 'info'} size="compact">
                            {path.ready
                              ? '확정 가능'
                              : path.request?.status === 'active'
                                ? '확인 중'
                                : path.unknown.length
                                  ? '미응답 있음'
                                  : '동의하면 성립'}
                          </Badge>
                        </header>
                        <SlotTime slot={slot} />
                        <div className="constraint-path-explanation">
                          <h2>
                            {path.ready
                              ? '필요한 참석 조건을 충족했어요'
                              : `${path.remaining.map((p) => p.name).join('·')}님의 ${path.unknown.length ? '답변' : '동의'}가 필요해요`}
                          </h2>
                          <p>
                            {path.changes.length
                              ? `${path.changes.length}명 일정 조정 · ${path.unknownChangeCount ? '변경 건수 미확인' : `변경할 일정 ${path.changeCount}건`}`
                              : `${path.unknown.length}명 참석 여부 미확인`}
                          </p>
                        </div>
                        <div className="constraint-conditions">
                          {path.needed.map((p) => (
                            <div key={p.id} className="constraint-person">
                              <Avatar name={p.name} />
                              <div>
                                <strong>
                                  {p.name} <small>필수 참석</small>
                                </strong>
                                <p>
                                  {slot.answers[p.id]?.kind === 'adjustment_intent'
                                    ? slot.answers[p.id].conflicts.join(' · ') ||
                                      '변경할 일정의 상세 내용 미공유'
                                    : '새 시간의 참석 여부 미확인'}
                                </p>
                              </div>
                              <span>
                                {path.request?.replies[p.id] === 'yes'
                                  ? '동의함'
                                  : path.request?.status === 'active'
                                    ? '답변 대기'
                                    : slot.answers[p.id]?.kind === 'adjustment_intent'
                                      ? '조정 의향'
                                      : '미확인'}
                              </span>
                            </div>
                          ))}
                        </div>
                        <details className="recovery-evidence">
                          <summary>
                            참석 가능 {path.available.length}명 · 기존 응답 유지 <span>상세</span>
                          </summary>
                          <ul>
                            {state.people.map((p) => (
                              <li key={p.id}>
                                <span>
                                  {p.name} · {p.required ? '필수' : '선택'}
                                </span>
                                <span>
                                  {path.request?.replies[p.id] === 'yes'
                                    ? '동의'
                                    : {
                                        available: '가능',
                                        unknown: '미확인',
                                        adjustment_intent: '조정 의향',
                                        unavailable: '불가',
                                      }[slot.answers[p.id]?.kind ?? 'unknown']}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                        <footer>
                          {path.request?.status === 'active' ? (
                            <>
                              <p>
                                <Clock3 size={16} />
                                {path.remaining.length
                                  ? `${path.remaining.map((p) => p.name).join('·')} 확인이 남았어요`
                                  : '필요한 답을 모두 받았어요'}
                              </p>
                              <Button
                                width="full"
                                disabled={!path.ready}
                                onClick={() =>
                                  dispatch({ type: 'confirm', requestId: path.request!.id })
                                }
                              >
                                이 시간으로 확정
                              </Button>
                              <Button
                                variant="quiet"
                                size="compact"
                                onClick={() => {
                                  dispatch({ type: 'cancel', requestId: path.request!.id })
                                  setNotice('요청을 취소했어요.')
                                }}
                              >
                                이 경로의 요청 취소
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="secondary"
                              width="full"
                              disabled={!!active}
                              onClick={() => setDialog(slot.id)}
                            >
                              {path.changes.length
                                ? `${path.needed.map((p) => p.name).join('·')}님에게 동의 요청`
                                : '이 시간의 참석 확인 요청'}{' '}
                              <ArrowRight size={16} />
                            </Button>
                          )}
                        </footer>
                      </MainCard>
                    ))}
                  </div>
                  {!!closed.length && (
                    <section className="constraint-closed">
                      <h2>현재 진행할 수 없는 후보</h2>
                      {closed.map(({ slot, path }) => (
                        <div key={slot.id}>
                          <SlotTime slot={slot} />
                          <p>
                            <strong>
                              {path.blocked.map((p) => p.name).join(' · ')}{' '}
                              {path.request?.status === 'rejected' ? '확인 요청 거절' : '참석 불가'}
                            </strong>
                            <span>
                              {path.blocked
                                .map((p) => slot.answers[p.id]?.conflicts.join(' · '))
                                .join(' / ')}
                            </span>
                            {path.request?.status === 'rejected' && (
                              <span>이 경로의 동의·대기 중인 요청도 종료했어요.</span>
                            )}
                          </p>
                        </div>
                      ))}
                    </section>
                  )}
                  {!active && (
                    <div className="recovery-next">
                      <p>
                        {!viable.length
                          ? '새 후보를 물어보거나 조율을 종료할 수 있어요.'
                          : '다른 시간도 검토할 수 있어요.'}
                        <br />
                        <small>새 시간에는 기존 답을 복사하지 않고 다시 확인해요.</small>
                      </p>
                      <div>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setOpenedAt(Date.now())
                            setDialog('add')
                          }}
                        >
                          새 시간 제안
                        </Button>
                        <Button variant="quiet" onClick={() => setDialog('end')}>
                          조율 종료
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )
            )}
            {!!state.requests.length && (
              <section className="constraint-history">
                <h2>확인 요청과 응답 이력</h2>
                <p>아래 ‘받은 요청 보기’는 참석자 화면을 확인하는 시연용 버튼이에요.</p>
                {[...state.requests].reverse().map((r) => (
                  <div key={r.id} className="constraint-history-group">
                    <header>
                      <CalendarDate value={state.slots.find((s) => s.id === r.slotId)!.start} />
                      <strong>
                        {
                          {
                            active: '진행 중',
                            rejected: '거절로 종료',
                            canceled: '요청 취소',
                            confirmed: '최종 확정',
                          }[r.status]
                        }
                      </strong>
                    </header>
                    {Object.entries(r.replies).map(([id, value]) => (
                      <div key={id}>
                        <span>
                          {state.people.find((p) => p.id === id)!.name} ·{' '}
                          {value === 'yes' ? '동의' : value === 'no' ? '거절' : '미응답'}
                          {r.status === 'rejected' || r.status === 'canceled'
                            ? ' · 진행하지 않음'
                            : ''}
                        </span>
                        <Button variant="quiet" size="compact" onClick={() => changeView(id, r.id)}>
                          {state.people.find((p) => p.id === id)!.name} 받은 요청 보기
                        </Button>
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </main>
      {requestSlot && (
        <Dialog title="이 경로의 확인을 요청할까요?" onClose={() => setDialog(null)}>
          <div className="recovery-request">
            <SlotTime slot={requestSlot} />
            <p className="recovery-explanation">
              {describePath(state, requestSlot)
                .needed.map((p) => p.name)
                .join(' · ')}
              에게 이 시간만 확인해요. 모두 동의해야 확정할 수 있어요.
            </p>
            <p className="recovery-footnote">
              최종 확정 전에는 기존 일정을 옮기지 않도록 안내해요. 다른 후보의 변경 요청은 함께
              진행하지 않아요.
            </p>
            <Button
              width="full"
              onClick={() => {
                dispatch({ type: 'request', slotId: requestSlot.id })
                setDialog(null)
                setNotice('확인 요청을 만들었어요. 아래에서 참석자의 받은 요청을 열어볼 수 있어요.')
              }}
            >
              확인 요청하기
            </Button>
          </div>
        </Dialog>
      )}
      {dialog === 'add' && (
        <Dialog title="새로운 시간을 제안해요" onClose={() => setDialog(null)}>
          <form
            className="recovery-request constraint-new"
            onSubmit={(e) => {
              e.preventDefault()
              if (validDate && ownAvailable && Date.parse(dateStart) > Date.now()) {
                dispatch({ type: 'add', start: dateStart })
                setDialog(null)
                setOwnAvailable(false)
                setNotice('새 후보를 추가했어요. 필수 참석자의 답을 새로 확인해 주세요.')
              }
            }}
          >
            <p>
              기존 응답은 원래 시간에만 남겨둬요. 새 후보는 지훈님을 제외한 참석자 모두 미확인으로
              시작해요.
            </p>
            <label>
              날짜
              <input
                type="date"
                required
                min={today('Asia/Seoul').toString()}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </label>
            <label>
              시작 시간 · 1시간 회의
              <input
                type="time"
                required
                step="1800"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </label>
            <label className="constraint-checkbox">
              <input
                type="checkbox"
                checked={ownAvailable}
                onChange={(e) => setOwnAvailable(e.target.checked)}
              />
              주최자인 저는 이 시간에 참석할 수 있어요.
            </label>
            {newDate && !validDate && (
              <p role="status">아직 제안하지 않은 미래 시간을 골라주세요.</p>
            )}
            <Button type="submit" width="full" disabled={!validDate || !ownAvailable}>
              새 후보 추가
            </Button>
          </form>
        </Dialog>
      )}
      {dialog === 'end' && (
        <Dialog title="이번 회의 조율을 종료할까요?" onClose={() => setDialog(null)}>
          <div className="recovery-request">
            <p>
              일정은 확정하지 않고 응답과 요청 이력을 보존해요. 이번 시안에서는 새로고침하면
              처음부터 시작해요.
            </p>
            <Button
              width="full"
              onClick={() => {
                dispatch({ type: 'end' })
                setDialog(null)
              }}
            >
              확정 없이 조율 종료
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
