import { createPortal } from 'react-dom'
import { CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import type { AvailabilitySlot } from '../domain/availability'
import type { Participant, ResponseValue } from '../domain/meeting'
import { ParticipantTimeGrid, type CalendarEvent } from './ParticipantTimeGrid'
import { Button } from './ui/button'
import { Avatar } from './ui/avatar'
import './ParticipantAvailabilityPanel.css'

type ParticipantAvailabilityPanelProps = {
  participant: Participant
  submissionStatus: Participant['responseStatus']
  title: string
  submitLabel: string
  slots: AvailabilitySlot[]
  stateLabels: Record<ResponseValue, string>
  hasBaseline: boolean
  inputSource: 'calendar' | 'manual' | 'existing' | null
  calendarEventCount: number
  availableCalendarSlotCount: number
  remainingCount: number
  isSaveConfirmationOpen: boolean
  getState: (slot: AvailabilitySlot) => ResponseValue | null
  getCalendarEvent: (slot: AvailabilitySlot) => CalendarEvent | null
  getIsManuallyEdited: (slot: AvailabilitySlot) => boolean
  onPaintSlot: (slot: AvailabilitySlot, state: ResponseValue) => void
  onStartManualEntry: () => void
  onApplyCalendar: () => void
  onResetBaseline: () => void
  onCloseSaveConfirmation: () => void
  onOpenSaveConfirmation: () => void
  onSubmit: () => void
}

export function ParticipantAvailabilityPanel({
  participant,
  submissionStatus,
  title,
  submitLabel,
  slots,
  stateLabels,
  hasBaseline,
  inputSource,
  calendarEventCount,
  availableCalendarSlotCount,
  remainingCount,
  isSaveConfirmationOpen,
  getState,
  getCalendarEvent,
  getIsManuallyEdited,
  onPaintSlot,
  onStartManualEntry,
  onApplyCalendar,
  onResetBaseline,
  onCloseSaveConfirmation,
  onOpenSaveConfirmation,
  onSubmit,
}: ParticipantAvailabilityPanelProps) {
  function handleSubmit() {
    if (remainingCount > 0) {
      onOpenSaveConfirmation()
      return
    }
    onSubmit()
  }

  return (
    <section
      className="response-panel response-panel--participant"
      aria-label="가능한 시간대 응답"
      data-submission-status={submissionStatus}
    >
      <header className="response-guide">
        <div className="response-guide__identity">
          <Avatar name={participant.name} />
          <strong>{title}</strong>
        </div>
        {hasBaseline && participant.responseStatus === 'not_started' ? (
          <Button
            className="response-baseline-reset"
            variant="fieldAction"
            size="text"
            onClick={onResetBaseline}
          >
            선택 초기화하기
          </Button>
        ) : null}
      </header>

      {!hasBaseline ? (
        <div className="calendar-import-card" aria-labelledby="calendar-import-title">
          <div className="calendar-import-card__icon" aria-hidden="true">
            <CalendarDays size={24} strokeWidth={2.3} />
          </div>
          <div className="calendar-import-card__copy">
            <strong id="calendar-import-title">Google Calendar에서 불러올까요?</strong>
            <p>일정 제목은 공유하지 않고, 비어 있음 여부만 사용해요.</p>
          </div>
          <div className="calendar-import-card__actions">
            <Button
              variant="fieldAction"
              size="action"
              onClick={onStartManualEntry}
            >
              직접 입력
            </Button>
            <Button size="action" onClick={onApplyCalendar}>
              캘린더 불러오기
            </Button>
          </div>
        </div>
      ) : inputSource === 'calendar' ? (
        <div className="calendar-import-summary" role="status">
          <CalendarDays size={20} aria-hidden="true" />
          <div>
            <strong>Google Calendar 일정 {calendarEventCount}개를 불러왔어요</strong>
            <span>
              비어 있는 {availableCalendarSlotCount}개 시간을 ‘가능해요’로 자동 입력했어요
            </span>
          </div>
          <Button
            className="calendar-import-reset"
            variant="fieldAction"
            size="text"
            onClick={() => {
              onApplyCalendar()
              toast.success('캘린더를 처음 불러온 상태로 되돌렸어요.')
            }}
          >
            불러온 상태로 되돌리기
          </Button>
        </div>
      ) : null}

      {hasBaseline ? (
        <ParticipantTimeGrid
          slots={slots}
          stateLabels={stateLabels}
          getState={getState}
          getCalendarEvent={inputSource === 'calendar' ? getCalendarEvent : undefined}
          getIsManuallyEdited={getIsManuallyEdited}
          onPaintSlot={onPaintSlot}
        />
      ) : null}

      {hasBaseline && isSaveConfirmationOpen && remainingCount > 0 ? (
        <div className="response-save-confirmation" role="alert">
          <div>
            <strong>선택하지 않은 {remainingCount}칸을 ‘참석하기 어려워요’로 저장할까요?</strong>
            <span>저장한 뒤에도 받은 요청에서 응답을 다시 수정할 수 있어요.</span>
          </div>
          <div className="button-row">
            <Button
              variant="secondary"
              size="action"
              onClick={onCloseSaveConfirmation}
            >
              시간 더 선택하기
            </Button>
            <Button size="action" onClick={onSubmit}>
              이대로 응답 저장하기
            </Button>
          </div>
        </div>
      ) : hasBaseline ? (
        <>
          <Button
            className="response-submit response-submit--desktop"
            size="action"
            onClick={handleSubmit}
          >
            {submitLabel}
          </Button>
          {createPortal(
            <div className="response-submit-bar">
              <Button
                className="response-submit"
                size="action"
                onClick={handleSubmit}
              >
                {submitLabel}
              </Button>
            </div>,
            document.body,
          )}
        </>
      ) : null}
    </section>
  )
}
