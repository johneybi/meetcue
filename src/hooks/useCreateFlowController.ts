import { useEffect, useRef, useState } from 'react'
import { createDefaultHostAvailabilityWindows } from '../domain/availability'
import type { AvailabilityWindow, Meeting } from '../domain/meeting'
import type { AttendeeDecisionMode } from '../components/AttendanceCriteriaStep'

export type HostCreateStep = 'meeting' | 'attendees' | 'times' | 'review'
export type TimeCreateStep = 'constraints' | 'candidates' | 'deadline'

export const CREATE_STEPS: Array<{
  id: HostCreateStep
  label: string
  eyebrow: string
  title: string
  description: string
}> = [
  {
    id: 'meeting',
    label: '회의 정보',
    eyebrow: '1단계',
    title: '어떤 회의인지 알려주세요',
    description: '참석자가 요청을 열었을 때 바로 이해할 수 있도록 필요한 정보만 적어주세요.',
  },
  {
    id: 'attendees',
    label: '참석자',
    eyebrow: '2단계',
    title: '누구와 회의하나요?',
    description: '응답을 받을 사람을 고르고, 회의를 열기 위한 참석 기준을 정해요.',
  },
  {
    id: 'times',
    label: '시간 범위',
    eyebrow: '3단계',
    title: '언제 모일 수 있는지 확인해 볼까요?',
    description: '회의 길이와 확인할 날짜·시간 범위를 정해 주세요.',
  },
  {
    id: 'review',
    label: '최종 확인',
    eyebrow: '4단계',
    title: '이 내용으로 응답을 요청할까요?',
    description: '참석자에게 보일 회의 정보와 시간 범위를 확인해 주세요.',
  },
]

type UseCreateFlowControllerOptions = {
  meeting: Meeting
  hostAvailabilityWindows: AvailabilityWindow[]
  invitedParticipantCount: number
  attendanceMode: AttendeeDecisionMode | null
  areAttendeesFinalized: boolean
  hasInvitee: boolean
  isMeetingComplete: boolean
  isTimeConstraintComplete: boolean
  isRequiredSelectionMissing: boolean
  isMinimumAttendanceValid: boolean
  isResponseDeadlineValid: boolean
  onFinalizeAttendees: () => void
  onAvailabilityWindowsChange: (windows: AvailabilityWindow[]) => void
  onResponseDeadlineChange: (deadline: string) => void
  onSendRequest: () => void
}

export function useCreateFlowController({
  meeting,
  hostAvailabilityWindows,
  invitedParticipantCount,
  attendanceMode,
  areAttendeesFinalized,
  hasInvitee,
  isMeetingComplete,
  isTimeConstraintComplete,
  isRequiredSelectionMissing,
  isMinimumAttendanceValid,
  isResponseDeadlineValid,
  onFinalizeAttendees,
  onAvailabilityWindowsChange,
  onResponseDeadlineChange,
  onSendRequest,
}: UseCreateFlowControllerOptions) {
  const [step, setStep] = useState<HostCreateStep>('meeting')
  const [timeStep, setTimeStep] = useState<TimeCreateStep>('constraints')
  const [initializedHostScopeKey, setInitializedHostScopeKey] = useState<string | null>(null)
  const workflowRef = useRef<HTMLElement>(null)
  const timeStepRef = useRef<HTMLElement>(null)
  const previousCreateStepRef = useRef<HostCreateStep>('meeting')
  const currentStepIndex = Math.max(
    0,
    CREATE_STEPS.findIndex((item) => item.id === step),
  )
  const hostScopeKey = `${meeting.schedulingWindow.startDate}:${meeting.schedulingWindow.endDate}:${meeting.durationMinutes ?? 'unset'}`
  const canGoNext =
    step === 'meeting'
      ? isMeetingComplete
      : step === 'attendees'
        ? areAttendeesFinalized &&
          hasInvitee &&
          attendanceMode !== null &&
          !isRequiredSelectionMissing &&
          isMinimumAttendanceValid
        : step === 'times'
          ? timeStep === 'constraints'
            ? isTimeConstraintComplete
            : timeStep === 'candidates'
              ? hostAvailabilityWindows.length > 0
              : isResponseDeadlineValid
          : true
  const isChoosingAttendees = step === 'attendees' && !areAttendeesFinalized
  const attendeePrimaryActionLabel = isChoosingAttendees
    ? hasInvitee
      ? `${invitedParticipantCount}명 선택 완료`
      : '사람을 선택해 주세요'
    : attendanceMode == null
      ? '참석 방식을 선택해 주세요'
      : isRequiredSelectionMissing
        ? '꼭 필요한 사람을 선택해 주세요'
        : !isMinimumAttendanceValid
          ? '진행할 인원을 정해 주세요'
          : '회의 시간 정하기'
  const primaryActionLabel =
    step === 'meeting'
      ? '초대할 사람 정하기'
      : step === 'attendees'
        ? attendeePrimaryActionLabel
        : step === 'times'
          ? timeStep === 'constraints'
            ? '가능한 시간대 고르기'
            : timeStep === 'candidates'
              ? hostAvailabilityWindows.length > 0
                ? '이 시간대로 계속'
                : '시간 범위를 남겨 주세요'
              : '요청 내용 확인하기'
          : '응답 요청 보내기'
  const canContinue = isChoosingAttendees ? hasInvitee : canGoNext

  useEffect(() => {
    if (previousCreateStepRef.current === step) return

    previousCreateStepRef.current = step
    const frame = window.requestAnimationFrame(() => {
      const workflow = workflowRef.current
      const activePhase = workflow?.querySelector<HTMLElement>(
        '.create-task[aria-current="step"]',
      )
      const heading = activePhase?.querySelector<HTMLElement>('h1')
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      workflow?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
      heading?.focus({ preventScroll: true })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [step])

  useEffect(() => {
    if (step !== 'times') return

    const frame = window.requestAnimationFrame(() => {
      const heading = timeStepRef.current?.querySelector<HTMLElement>('h2')
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      timeStepRef.current?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      })
      heading?.focus({ preventScroll: true })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [step, timeStep])

  function goToNextStep() {
    if (!canGoNext) return

    if (step === 'review') {
      onSendRequest()
      return
    }

    const nextStep = CREATE_STEPS[Math.min(currentStepIndex + 1, CREATE_STEPS.length - 1)]
    setStep(nextStep.id)
  }

  function goToPreviousStep() {
    if (step === 'times' && timeStep !== 'constraints') {
      setTimeStep(timeStep === 'deadline' ? 'candidates' : 'constraints')
      return
    }

    const previousStep = CREATE_STEPS[Math.max(currentStepIndex - 1, 0)]
    setStep(previousStep.id)
  }

  function handlePrimaryAction() {
    if (isChoosingAttendees) {
      onFinalizeAttendees()
      return
    }

    if (step === 'times' && timeStep === 'constraints') {
      if (meeting.durationMinutes == null) return

      if (initializedHostScopeKey !== hostScopeKey) {
        onAvailabilityWindowsChange(
          createDefaultHostAvailabilityWindows({
            meetingId: meeting.id,
            hostId: meeting.hostId,
            startDate: meeting.schedulingWindow.startDate,
            endDate: meeting.schedulingWindow.endDate,
          }),
        )
        setInitializedHostScopeKey(hostScopeKey)
      }

      setTimeStep('candidates')
      return
    }

    if (step === 'times' && timeStep === 'candidates') {
      if (!isResponseDeadlineValid) {
        const suggestedDeadline = suggestResponseDeadline(hostAvailabilityWindows)
        if (suggestedDeadline) onResponseDeadlineChange(suggestedDeadline)
      }

      setTimeStep('deadline')
      return
    }

    goToNextStep()
  }

  return {
    step,
    timeStep,
    setTimeStep,
    workflowRef,
    timeStepRef,
    currentStepIndex,
    activeCreateStep: CREATE_STEPS[currentStepIndex],
    stepCount: CREATE_STEPS.length,
    canContinue,
    primaryActionLabel,
    goToPreviousStep,
    handlePrimaryAction,
  }
}

function suggestResponseDeadline(windows: AvailabilityWindow[]) {
  if (windows.length === 0) return ''

  const earliestCandidate = new Date(
    Math.min(...windows.map((window) => new Date(window.startAt).getTime())),
  )
  const now = new Date()
  const preferred = new Date(earliestCandidate.getTime() - 24 * 60 * 60 * 1000)
  const fallback = new Date(earliestCandidate.getTime() - 60 * 60 * 1000)

  if (preferred.getTime() > now.getTime()) return preferred.toISOString()
  return fallback.getTime() > now.getTime() ? fallback.toISOString() : ''
}
