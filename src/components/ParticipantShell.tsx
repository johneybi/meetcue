import { getAvailabilityStateForSlot, type AvailabilitySlot } from '../domain/availability'
import type { AvailabilityWindow, Meeting, Participant, ResponseValue } from '../domain/meeting'
import { useParticipantAvailabilityResponse } from '../hooks/useParticipantAvailabilityResponse'
import { ParticipantAvailabilityPanel } from './ParticipantAvailabilityPanel'
import { ParticipantConfirmedScreen } from './ParticipantConfirmedScreen'
import { ParticipantDoneScreen } from './ParticipantDoneScreen'
import { ParticipantMeetingContext } from './ParticipantMeetingContext'
import { ParticipantPageShell } from './ParticipantPageShell'

export type ParticipantCoordinationState =
  'PARTICIPANT_NEW' | 'PARTICIPANT_EDITING' | 'PARTICIPANT_DONE' | 'PARTICIPANT_CONFIRMED'

type ParticipantShellProps = {
  meeting: Meeting
  participant: Participant
  state: ParticipantCoordinationState
  now: Date
  onSubmit: (participantDraftWindows: AvailabilityWindow[]) => void
  onEdit: () => void
  onExit: () => void
  showPrototypeReturn: boolean
}

const participantResponseLabels: Record<ResponseValue, string> = {
  available: '가능해요',
  adjustable: '조정하면 가능해요',
  unavailable: '참석하기 어려워요',
}

export function ParticipantShell({
  meeting,
  participant,
  state,
  now,
  onSubmit,
  onEdit,
  onExit,
  showPrototypeReturn,
}: ParticipantShellProps) {
  const {
    slots,
    draftWindows,
    hasBaseline,
    inputSource,
    manuallyEditedSlotStarts,
    editorStatus,
    remainingCount,
    isSaveConfirmationOpen,
    startManualEntry,
    applyCalendar,
    paintSlot,
    resetBaseline,
    openSaveConfirmation,
    closeSaveConfirmation,
  } = useParticipantAvailabilityResponse({
    meeting,
    participant,
    isCalendarBusy: isSimulatedCalendarBusy,
  })

  if (state === 'PARTICIPANT_DONE') {
    return (
      <ParticipantDoneScreen
        meeting={meeting}
        participant={participant}
        onEdit={onEdit}
        onExit={onExit}
        showPrototypeReturn={showPrototypeReturn}
      />
    )
  }

  if (state === 'PARTICIPANT_CONFIRMED') {
    return (
      <ParticipantConfirmedScreen meeting={meeting} participant={participant} onExit={onExit} />
    )
  }

  const simulatedCalendarEventCount = new Set(
    slots
      .map(getSimulatedCalendarEvent)
      .filter((event) => event != null)
      .map((event) => event.id),
  ).size
  const deadlinePassed = new Date(meeting.responseDeadline).getTime() <= now.getTime()

  return (
    <ParticipantPageShell onExit={onExit}>
      <main
        className={`respond-main${state === 'PARTICIPANT_EDITING' ? ' is-participant-editing' : ''}${
          hasBaseline ? ' is-schedule-entry' : ''
        }`}
      >
        <ParticipantMeetingContext
          meeting={meeting}
          isScheduleEntry={hasBaseline}
          isEditing={state === 'PARTICIPANT_EDITING'}
          remainingCount={remainingCount}
          deadlinePassed={deadlinePassed}
        />

        <ParticipantAvailabilityPanel
          participant={participant}
          submissionStatus={editorStatus}
          title={getParticipantTitle(state, participant)}
          submitLabel={state === 'PARTICIPANT_EDITING' ? '수정 내용 저장하기' : '응답 저장하기'}
          slots={slots}
          stateLabels={participantResponseLabels}
          hasBaseline={hasBaseline}
          inputSource={inputSource}
          calendarEventCount={simulatedCalendarEventCount}
          availableCalendarSlotCount={slots.filter((slot) => !isSimulatedCalendarBusy(slot)).length}
          remainingCount={remainingCount}
          isSaveConfirmationOpen={isSaveConfirmationOpen}
          getState={(slot) =>
            getAvailabilityStateForSlot(draftWindows, participant.id, slot) ?? null
          }
          getCalendarEvent={getSimulatedCalendarEvent}
          getIsManuallyEdited={(slot) => manuallyEditedSlotStarts.has(slot.startAt)}
          onPaintSlot={paintSlot}
          onStartManualEntry={startManualEntry}
          onApplyCalendar={applyCalendar}
          onResetBaseline={resetBaseline}
          onCloseSaveConfirmation={closeSaveConfirmation}
          onOpenSaveConfirmation={openSaveConfirmation}
          onSubmit={() => onSubmit(draftWindows)}
        />
      </main>
    </ParticipantPageShell>
  )
}

function getParticipantTitle(state: ParticipantCoordinationState, participant: Participant) {
  if (state === 'PARTICIPANT_EDITING') {
    return `${participant.name}님, 이전 응답을 수정할 수 있어요`
  }
  return '내 일정을 알려주세요'
}

function getSimulatedCalendarEvent(slot: AvailabilitySlot) {
  const date = new Date(slot.startAt)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? 0)
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? ''
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)

  if (weekday === 'Tue' && hour === 14) {
    return {
      id: `${day}-design-review`,
      title: '디자인 리뷰',
      timeLabel: '오후 2:00-오후 3:00',
      segment: minute === 0 ? ('start' as const) : ('end' as const),
    }
  }

  if (weekday === 'Wed' && hour === 10) {
    return {
      id: `${day}-daily`,
      title: '제품팀 데일리',
      timeLabel: '오전 10:00-오전 11:00',
      segment: minute === 0 ? ('start' as const) : ('end' as const),
    }
  }

  if (weekday === 'Thu' && hour === 14) {
    return {
      id: `${day}-partner-meeting`,
      title: '파트너사 미팅',
      timeLabel: '오후 2:00-오후 3:00',
      segment: minute === 0 ? ('start' as const) : ('end' as const),
    }
  }

  return null
}

function isSimulatedCalendarBusy(slot: AvailabilitySlot) {
  return getSimulatedCalendarEvent(slot) != null
}
