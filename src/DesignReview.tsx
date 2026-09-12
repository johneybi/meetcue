import { useRef, useState } from 'react'
import { createPrototypeMeeting } from './domain/mockMeeting'
import { evaluateCandidates } from './domain/evaluation'
import {
  createDefaultHostAvailabilityWindows,
  deriveCandidatesFromAvailabilityWindows,
  mergeAvailabilityWindows,
} from './domain/availability'
import type { Meeting, ResponseValue } from './domain/meeting'
import { MeetingAvailabilityStep } from './components/MeetingAvailabilityStep'
import { MeetingTimeConstraintsStep } from './components/MeetingTimeConstraintsStep'
import { HostWaitingScreen } from './components/HostWaitingScreen'
import { HostShell } from './components/HostShell'
import { RequestSentScreen } from './components/RequestSentScreen'
import { ParticipantCandidateResponse } from './components/ParticipantCandidateResponse'
import { ParticipantPageShell } from './components/ParticipantPageShell'
import { ParticipantConfirmedScreen } from './components/ParticipantConfirmedScreen'
import { ParticipantDoneScreen } from './components/ParticipantDoneScreen'
import { InvalidParticipantInviteScreen } from './components/InvalidParticipantInviteScreen'
import { MessageScreen } from './components/MessageScreen'
import { CreateFlowFrame } from './components/CreateFlowFrame'
import { Button } from './components/ui/button'
import { TimeEntryComparison } from './components/TimeEntryComparison'
import { CoordinationRecovery } from './components/CoordinationRecovery'
import { CREATE_STEPS } from './hooks/useCreateFlowController'
import './index.css'
import './styles/global.css'
import './styles/CreateScreen.css'
import './components/ParticipantResponseFlow.css'
import './styles/ServiceFoundation.css'
import './styles/DecisionPlanner.css'
import './styles/material-tokens.css'
import './styles/soft-material.css'
import './styles/design-review.css'

const views = [
  '조율 다시 잇기',
  '시간 입력 비교',
  '시간 선택',
  '조건 입력',
  '초대 현황',
  '응답 대기',
  '참석자 응답',
  '주최자 확정',
  '참석자 확정',
  '응답 완료',
  '초대 오류',
] as const
type View = (typeof views)[number]
const noop = () => {}
function makeExample(): Meeting {
  const m = createPrototypeMeeting()
  const start = new Date()
  start.setDate(start.getDate() + ((8 - start.getDay()) % 7 || 7))
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 4)
  const date = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const schedulingWindow = { startDate: date(start), endDate: date(end) }
  const candidates = m.candidates.map((c, index) => {
    const begin = new Date(start)
    begin.setDate(begin.getDate() + (index % 5))
    begin.setHours(index === 0 ? 15 : index === 1 ? 14 : 10)
    const finish = new Date(begin)
    finish.setHours(begin.getHours() + 1)
    return { ...c, startAt: begin.toISOString(), endAt: finish.toISOString() }
  })
  return {
    ...m,
    candidates,
    schedulingWindow,
    durationMinutes: 60,
    availabilityWindows: createDefaultHostAvailabilityWindows({
      meetingId: m.id,
      hostId: m.hostId,
      ...schedulingWindow,
    }),
  }
}
export function DesignReview() {
  const [view, setView] = useState<View>(() =>
    new URLSearchParams(window.location.search).get('view') === 'recovery'
      ? '조율 다시 잇기'
      : new URLSearchParams(window.location.search).get('view') === 'time-comparison'
        ? '시간 입력 비교'
        : '시간 선택',
  )
  const [meeting, setMeeting] = useState(makeExample)
  const [answers, setAnswers] = useState<Record<string, ResponseValue | undefined>>({})
  const [notice, setNotice] = useState('')
  const stage = useRef<HTMLElement>(null)
  const workflow = useRef<HTMLElement>(null)
  const candidate = meeting.candidates[0]
  const confirmed = { ...meeting, status: 'confirmed' as const, confirmedCandidateId: candidate.id }
  const participant = meeting.participants.find((p) => p.id === 'p-sujin')!
  const evaluation = evaluateCandidates(confirmed).find((e) => e.candidate.id === candidate.id)!
  const startToday = new Date().toLocaleDateString('en-CA')
  const validDates =
    meeting.schedulingWindow.startDate >= startToday &&
    meeting.schedulingWindow.endDate >= meeting.schedulingWindow.startDate
  const canContinue =
    view === '시간 선택'
      ? deriveCandidatesFromAvailabilityWindows(
          meeting.id,
          meeting.hostId,
          meeting.availabilityWindows,
          meeting.durationMinutes,
        ).length > 0
      : validDates && meeting.durationMinutes != null
  const participantView = ['참석자 응답', '참석자 확정', '응답 완료', '초대 오류'].includes(view)
  let content
  if (view === '시간 선택' || view === '조건 입력') {
    content = (
      <CreateFlowFrame
        workflowRef={workflow}
        stepClassName={`create-workflow--times create-workflow--time-${view === '시간 선택' ? 'candidates' : 'constraints'}`}
        currentStepIndex={2}
        stepCount={4}
        activeStep={{
          ...CREATE_STEPS[2],
          title: view === '시간 선택' ? '회의 후보 시간을 정해주세요' : '언제, 얼마나 모일까요?',
          description:
            view === '시간 선택'
              ? '참석자는 이 범위 안에서 가능한 시간을 응답해요.'
              : '날짜 범위와 회의 길이를 정해 주세요.',
        }}
        isMeetingStep={false}
        canContinue={canContinue}
        desktopPrimaryLabel="이 시간대로 계속"
        mobilePrimaryLabel="이 시간대로 계속"
        onBack={() => setView('조건 입력')}
        onPrimary={() =>
          view === '조건 입력'
            ? setView('시간 선택')
            : setNotice('예시 데이터로 다음 단계를 확인했어요.')
        }
      >
        {view === '시간 선택' ? (
          <MeetingAvailabilityStep
            sectionRef={stage}
            meeting={{ ...meeting, durationMinutes: meeting.durationMinutes ?? 60 }}
            availabilityWindows={meeting.availabilityWindows}
            onAvailabilityWindowsChange={(windows) =>
              setMeeting((m) => ({ ...m, availabilityWindows: mergeAvailabilityWindows(windows) }))
            }
            onEditConstraints={() => setView('조건 입력')}
          />
        ) : (
          <MeetingTimeConstraintsStep
            sectionRef={stage}
            schedulingWindow={meeting.schedulingWindow}
            durationMinutes={meeting.durationMinutes}
            todayInput={startToday}
            isSchedulingWindowValid={validDates}
            onSchedulingWindowChange={(schedulingWindow) =>
              setMeeting((m) => ({ ...m, schedulingWindow }))
            }
            onDurationChange={(durationMinutes) => setMeeting((m) => ({ ...m, durationMinutes }))}
          />
        )}
      </CreateFlowFrame>
    )
  } else if (view === '초대 현황')
    content = <RequestSentScreen meeting={meeting} onOpenHost={() => setView('응답 대기')} />
  else if (view === '응답 대기')
    content = (
      <HostWaitingScreen
        meeting={{
          ...meeting,
          participants: meeting.participants.map((p) => ({ ...p, responseStatus: 'not_started' })),
        }}
        onRemindParticipant={() => setNotice('예시 알림 상태만 변경했어요.')}
      />
    )
  else if (view === '주최자 확정')
    content = (
      <MessageScreen
        meeting={confirmed}
        evaluation={evaluation}
        onConfirm={noop}
        onHome={() => setNotice('검토 화면입니다. 저장된 회의는 바뀌지 않아요.')}
      />
    )
  else if (view === '참석자 확정')
    content = (
      <ParticipantConfirmedScreen meeting={confirmed} participant={participant} onExit={noop} />
    )
  else if (view === '참석자 응답')
    content = (
      <ParticipantPageShell onExit={noop}>
        <main className="review-response response-flow">
          <ParticipantCandidateResponse
            participantName="수진"
            isEditing={false}
            candidates={meeting.candidates.slice(0, 3)}
            answers={answers}
            onAnswer={(c, value) => setAnswers((a) => ({ ...a, [c.id]: value }))}
            onExpand={() => setNotice('다른 시간 찾기는 서비스의 전체 시간표로 연결됩니다.')}
            onSubmit={() => {
              setMeeting((m) => ({
                ...m,
                responses: [
                  ...m.responses.filter((r) => r.participantId !== participant.id),
                  ...m.candidates
                    .filter((c) => answers[c.id] != null)
                    .map((c) => ({
                      id: `review-${c.id}`,
                      participantId: participant.id,
                      candidateId: c.id,
                      value: answers[c.id]!,
                      preferenceTags: [],
                      updatedAt: new Date().toISOString(),
                      updateSource: 'participant_edit' as const,
                    })),
                ],
              }))
              setView('응답 완료')
              setNotice('예시 응답을 완료했어요.')
            }}
            getCalendarHint={(c) => (c.id === meeting.candidates[1].id ? '팀 주간 회의' : null)}
          />
        </main>
      </ParticipantPageShell>
    )
  else if (view === '응답 완료')
    content = (
      <ParticipantDoneScreen
        meeting={meeting}
        participant={participant}
        onEdit={() => setView('참석자 응답')}
        onExit={noop}
        showPrototypeReturn={false}
      />
    )
  else content = <InvalidParticipantInviteScreen meeting={meeting} onExit={noop} />
  return (
    <>
      <div hidden={view !== '조율 다시 잇기'}>
        <CoordinationRecovery
          onOtherScreens={() => setView('시간 선택')}
          onNewTimes={() => {
            setView('시간 선택')
            setNotice(
              '새 범위를 살펴보는 기존 입력 시안이에요. 새 후보의 재요청은 아직 연결되지 않았어요. 「조율 다시 잇기」로 돌아가면 받은 답이 유지돼요.',
            )
          }}
        />
      </div>
      {view !== '조율 다시 잇기' && (
        <>
          <nav className="design-review-nav" aria-label="디자인 시스템 검토">
            <header>
              <strong>MeetCue · 화면과 상태</strong>
              <span>예시 전용 · 실제 회의에 저장되지 않아요</span>
            </header>
            <div>
              {views.map((v) => (
                <Button
                  key={v}
                  variant="quiet"
                  size="compact"
                  aria-pressed={v === view}
                  onClick={() => {
                    setView(v)
                    setNotice('')
                  }}
                >
                  {v}
                </Button>
              ))}
            </div>
          </nav>
          {notice ? (
            <p className="design-review-notice" role="status">
              {notice}
            </p>
          ) : null}
          {view === '시간 입력 비교' ? (
            <TimeEntryComparison example={meeting} />
          ) : participantView ? (
            content
          ) : (
            <HostShell
              meeting={meeting}
              state={
                view === '주최자 확정'
                  ? 'HOST_CONFIRMED'
                  : view === '응답 대기'
                    ? 'HOST_WAITING_EMPTY'
                    : 'HOST_DRAFT'
              }
              route={
                view === '시간 선택' || view === '조건 입력'
                  ? 'create'
                  : view === '초대 현황'
                    ? 'share'
                    : 'host'
              }
              onNavigate={(route) => {
                if (route === 'share') setView('초대 현황')
                else if (route === 'host') setView('응답 대기')
                else setNotice('이 화면의 전체 기능은 서비스에서 확인할 수 있어요.')
              }}
              onCreate={() => setView('조건 입력')}
              unreadCount={0}
            >
              {content}
            </HostShell>
          )}
        </>
      )}
    </>
  )
}
