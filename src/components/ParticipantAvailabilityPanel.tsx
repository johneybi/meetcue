import { createPortal } from 'react-dom'
import { useEffect, useRef } from 'react'
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
  availableSlotCount: number
  remainingCount: number
  isSaveConfirmationOpen: boolean
  getState: (slot: AvailabilitySlot) => ResponseValue | null
  getCalendarEvent: (slot: AvailabilitySlot) => CalendarEvent | null
  getIsManuallyEdited: (slot: AvailabilitySlot) => boolean
  onPaintSlot: (slot: AvailabilitySlot, state: ResponseValue) => void
  onStartManualEntry: () => void
  onApplyCalendar: () => void
  onFillRemainingFromCalendar: () => void
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
  availableSlotCount,
  remainingCount,
  isSaveConfirmationOpen,
  getState,
  getCalendarEvent,
  getIsManuallyEdited,
  onPaintSlot,
  onStartManualEntry,
  onApplyCalendar,
  onFillRemainingFromCalendar,
  onResetBaseline,
  onCloseSaveConfirmation,
  onOpenSaveConfirmation,
  onSubmit,
}: ParticipantAvailabilityPanelProps) {
  const adjustmentSlotCount = slots.filter((slot) => getState(slot) === 'adjustable').length
  const confirmationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isSaveConfirmationOpen) confirmationRef.current?.focus()
  }, [isSaveConfirmationOpen])

  function handleSubmit() {
    if (remainingCount > 0 || adjustmentSlotCount > 0) {
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
            <strong id="calendar-import-title">예시 캘린더로 채워볼까요?</strong>
            <p>일정 제목은 공유하지 않고, 비어 있음 여부만 사용해요.</p>
          </div>
          <div className="calendar-import-card__actions">
            <Button variant="fieldAction" size="action" onClick={onStartManualEntry}>
              직접 입력
            </Button>
            <Button size="action" onClick={onApplyCalendar}>
              예시 일정 불러오기
            </Button>
          </div>
        </div>
      ) : inputSource === 'calendar' ? (
        <div className="calendar-import-summary" role="status">
          <CalendarDays size={20} aria-hidden="true" />
          <div>
            <strong>예시 캘린더 일정 {calendarEventCount}개를 불러왔어요</strong>
            <span>현재 {availableSlotCount}칸이 ‘가능해요’로 표시되어 있어요</span>
            <span>캘린더에 없는 외근·집중 시간도 확인해 주세요. 저장 전에는 공유되지 않아요.</span>
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

      {inputSource === 'existing' && remainingCount > 0 ? (
        <div className="response-remaining-calendar">
          <p>저장한 응답은 유지하고, 남은 시간만 채울 수 있어요.</p>
          <Button variant="secondary" onClick={onFillRemainingFromCalendar}>
            남은 시간을 예시 일정으로 채우기
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

      {hasBaseline && isSaveConfirmationOpen ? (
        <div
          className="response-save-confirmation"
          role="alert"
          ref={confirmationRef}
          tabIndex={-1}
        >
          <div>
            {adjustmentSlotCount > 0 ? (
              <strong>
                ‘옮겨서 참석’로 표시한 {adjustmentSlotCount}칸은 그 시간으로 확정되면 기존 일정을
                옮겨 참석하는 것으로 전달해요.
              </strong>
            ) : null}
            {remainingCount > 0 ? (
              <strong>선택하지 않은 {remainingCount}칸은 ‘어려워요’로 저장해요.</strong>
            ) : null}
            <span>저장한 뒤에도 받은 요청에서 응답을 다시 수정할 수 있어요.</span>
          </div>
          <div className="button-row">
            <Button variant="secondary" size="action" onClick={onCloseSaveConfirmation}>
              응답 다시 확인하기
            </Button>
            <Button size="action" onClick={onSubmit}>
              {adjustmentSlotCount > 0
                ? '일정을 옮겨 참석하는 것으로 저장하기'
                : '이대로 응답 저장하기'}
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
              <Button className="response-submit" size="action" onClick={handleSubmit}>
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
