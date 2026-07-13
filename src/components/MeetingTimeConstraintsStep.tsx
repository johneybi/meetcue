import { useRef, useState, type RefObject } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import {
  formatMeetingDuration,
  type MeetingDuration,
  type SchedulingWindow,
} from '../domain/meeting'
import {
  isValidMeetingDuration,
  MEETING_DURATION_MAX,
  MEETING_DURATION_MIN,
  MEETING_DURATION_PRESETS,
  MEETING_DURATION_STEP,
} from '../lib/meetingDuration'
import { Button } from './ui/button'
import { Field } from './ui/field'
import { Input } from './ui/input'
import { SelectableCard } from './ui/selectable-card'
import './MeetingTimeConstraintsStep.css'

type MeetingTimeConstraintsStepProps = {
  sectionRef: RefObject<HTMLElement | null>
  schedulingWindow: SchedulingWindow
  durationMinutes: MeetingDuration | null
  todayInput: string
  isSchedulingWindowValid: boolean
  onSchedulingWindowChange: (window: SchedulingWindow) => void
  onDurationChange: (duration: MeetingDuration | null) => void
}

export function MeetingTimeConstraintsStep({
  sectionRef,
  schedulingWindow,
  durationMinutes,
  todayInput,
  isSchedulingWindowValid,
  onSchedulingWindowChange,
  onDurationChange,
}: MeetingTimeConstraintsStepProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(
    () => durationMinutes != null && !MEETING_DURATION_PRESETS.includes(durationMinutes),
  )
  const [customInput, setCustomInput] = useState(() =>
    durationMinutes != null && !MEETING_DURATION_PRESETS.includes(durationMinutes)
      ? String(durationMinutes)
      : '',
  )
  const customTriggerRef = useRef<HTMLButtonElement>(null)
  const parsedCustomDuration = Number(customInput)
  const isCustomInputValid = isValidMeetingDuration(
    customInput !== '' && Number.isInteger(parsedCustomDuration) ? parsedCustomDuration : null,
  )

  function selectPresetDuration(duration: MeetingDuration) {
    setIsCustomOpen(false)
    setCustomInput('')
    onDurationChange(duration)
  }

  function updateCustomInput(value: string) {
    setCustomInput(value)
    const duration = Number(value)
    onDurationChange(
      value !== '' && Number.isInteger(duration) && isValidMeetingDuration(duration)
        ? duration
        : null,
    )
  }

  function stepCustomDuration(direction: -1 | 1) {
    const baseDuration = isCustomInputValid ? parsedCustomDuration : MEETING_DURATION_MIN
    updateCustomInput(
      String(
        Math.min(
          MEETING_DURATION_MAX,
          Math.max(MEETING_DURATION_MIN, baseDuration + direction * MEETING_DURATION_STEP),
        ),
      ),
    )
  }

  function closeCustomInput() {
    setIsCustomOpen(false)
    setCustomInput('')
    onDurationChange(null)
    window.requestAnimationFrame(() => customTriggerRef.current?.focus())
  }

  return (
    <section ref={sectionRef} className="time-create-stage" aria-labelledby="time-window-title">
      <header className="time-create-stage__header">
        <h2 id="time-window-title" tabIndex={-1}>
          회의를 언제 열면 될까요?
        </h2>
        <p>참석자에게 물어볼 날짜의 범위를 먼저 정해요.</p>
      </header>

      <div className="time-window-fields">
        <Field className="time-window-field" label="시작일">
          <Input
            type="date"
            value={schedulingWindow.startDate}
            min={todayInput}
            max={schedulingWindow.endDate || undefined}
            onChange={(event) =>
              onSchedulingWindowChange({ ...schedulingWindow, startDate: event.target.value })
            }
          />
        </Field>
        <span className="time-window-fields__separator" aria-hidden="true">
          -
        </span>
        <Field className="time-window-field" label="마지막 날">
          <Input
            type="date"
            value={schedulingWindow.endDate}
            min={schedulingWindow.startDate || todayInput}
            onChange={(event) =>
              onSchedulingWindowChange({ ...schedulingWindow, endDate: event.target.value })
            }
          />
        </Field>
      </div>

      <fieldset className="meeting-duration-fieldset">
        <legend>참석자들이 얼마 동안 시간을 비워두면 될까요?</legend>
        {!isCustomOpen ? (
          <div className="meeting-duration-options" role="radiogroup">
            {MEETING_DURATION_PRESETS.map((duration) => (
              <SelectableCard
                key={duration}
                isSelected={durationMinutes === duration}
                role="radio"
                aria-checked={durationMinutes === duration}
                onClick={() => selectPresetDuration(duration)}
              >
                {formatMeetingDuration(duration)}
              </SelectableCard>
            ))}
            <SelectableCard
              ref={customTriggerRef}
              className="meeting-duration-custom-trigger"
              isSelected={false}
              role="radio"
              aria-checked="false"
              onClick={() => {
                const initialDuration = durationMinutes ?? MEETING_DURATION_MIN
                setIsCustomOpen(true)
                setCustomInput(String(initialDuration))
                onDurationChange(initialDuration)
              }}
            >
              직접 입력
            </SelectableCard>
          </div>
        ) : (
          <div
            className="meeting-duration-custom-wrap"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                closeCustomInput()
              }
            }}
          >
            <div className="meeting-duration-custom-head">
              <strong>직접 입력</strong>
              <Button
                variant="quiet"
                size="icon"
                aria-label="직접 입력 닫기"
                title="직접 입력 닫기"
                onClick={closeCustomInput}
              >
                <X size={18} />
              </Button>
            </div>
            <div className="meeting-duration-custom">
              <Button
                variant="quiet"
                size="icon"
                aria-label="확보 시간 30분 줄이기"
                title="30분 줄이기"
                disabled={!isCustomInputValid || parsedCustomDuration <= MEETING_DURATION_MIN}
                onClick={() => stepCustomDuration(-1)}
              >
                <Minus size={18} />
              </Button>
              <label>
                <span className="sr-only">회의 시간 직접 입력</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={MEETING_DURATION_MIN}
                  max={MEETING_DURATION_MAX}
                  step={MEETING_DURATION_STEP}
                  value={customInput}
                  aria-describedby="custom-duration-help"
                  autoFocus
                  onChange={(event) => updateCustomInput(event.target.value)}
                />
                <strong>분</strong>
              </label>
              <Button
                variant="quiet"
                size="icon"
                aria-label="확보 시간 30분 늘리기"
                title="30분 늘리기"
                disabled={isCustomInputValid && parsedCustomDuration >= MEETING_DURATION_MAX}
                onClick={() => stepCustomDuration(1)}
              >
                <Plus size={18} />
              </Button>
            </div>
            <p
              id="custom-duration-help"
              className={customInput !== '' && !isCustomInputValid ? 'is-error' : ''}
            >
              30~240분 사이에서 30분 단위로 입력해 주세요.
            </p>
          </div>
        )}
      </fieldset>

      {!isSchedulingWindowValid ? (
        <p className="time-create-stage__error" role="alert">
          오늘 이후의 시작일과 마지막 날을 순서대로 정해주세요.
        </p>
      ) : null}
    </section>
  )
}
