import { useState } from 'react'
import type {
  AvailabilityWindow,
  Meeting,
  MeetingDuration,
  ParticipantRole,
  SchedulingWindow,
} from '../domain/meeting'
import { isValidMeetingDuration } from '../lib/meetingDuration'
import { useAttendeeSelection } from '../hooks/useAttendeeSelection'
import { useCreateFlowController } from '../hooks/useCreateFlowController'
import {
  AttendanceCriteriaStep,
  type AttendeeDecisionMode,
  type AttendanceThresholdMode,
} from './AttendanceCriteriaStep'
import { AttendeePeopleStep } from './AttendeePeopleStep'
import type { MeetingWithDuration } from './AvailabilityWindowPicker'
import { CreateFlowFrame } from './CreateFlowFrame'
import { CreateReviewStep } from './CreateReviewStep'
import { MeetingAvailabilityStep } from './MeetingAvailabilityStep'
import { MeetingBriefStep } from './MeetingBriefStep'
import { MeetingTimeConstraintsStep } from './MeetingTimeConstraintsStep'
import { ResponseDeadlineStep } from './ResponseDeadlineStep'
import './CreateAttendeeFlow.css'

type CreateScreenProps = {
  meeting: Meeting
  onTitleChange: (title: string) => void
  onPurposeChange: (purpose: string) => void
  onReferenceMaterialChange: (referenceMaterial: string) => void
  onSchedulingWindowChange: (schedulingWindow: SchedulingWindow) => void
  onDurationChange: (durationMinutes: MeetingDuration | null) => void
  onResponseDeadlineChange: (responseDeadline: string) => void
  onAttendanceModeChange: (mode: AttendeeDecisionMode) => void
  onAttendanceThresholdModeChange: (mode: AttendanceThresholdMode) => void
  onMinAttendeeCountChange: (count: number) => void
  onParticipantRoleChange: (participantId: string, role: ParticipantRole) => void
  onParticipantAdd: (name?: string) => void
  onParticipantRemove: (participantId: string) => void
  onAvailabilityWindowsChange: (windows: AvailabilityWindow[]) => void
  onSendRequest: () => void
}

export function CreateScreen({
  meeting,
  onTitleChange,
  onPurposeChange,
  onReferenceMaterialChange,
  onSchedulingWindowChange,
  onDurationChange,
  onResponseDeadlineChange,
  onAttendanceModeChange,
  onAttendanceThresholdModeChange,
  onMinAttendeeCountChange,
  onParticipantRoleChange,
  onParticipantAdd,
  onParticipantRemove,
  onAvailabilityWindowsChange,
  onSendRequest,
}: CreateScreenProps) {
  const [createNow] = useState(() => new Date())
  const {
    participants: invitedParticipants,
    requiredParticipants,
    hasInvitee,
    query: attendeeQuery,
    setQuery: setAttendeeQuery,
    visiblePeople,
    isPickerOpen: isPeoplePickerOpen,
    setIsPickerOpen: setIsPeoplePickerOpen,
    isFinalized: areAttendeesFinalized,
    announcement: attendeeAnnouncement,
    decisionMode: attendeeDecisionMode,
    peopleStepRef,
    decisionStepRef,
    removeAttendee,
    toggleAttendee,
    finalizeAttendees,
    editAttendees,
    selectDecisionMode: selectAttendanceMode,
  } = useAttendeeSelection({
    meeting,
    onParticipantAdd,
    onParticipantRemove,
    onAttendanceModeChange,
  })
  const hostAvailabilityWindows = meeting.availabilityWindows.filter(
    (window) => window.ownerId === meeting.hostId,
  )
  const isMeetingComplete = meeting.title.trim() !== '' && meeting.purpose.trim() !== ''
  const todayInput = formatDateInput(createNow)
  const isDurationValid = isValidMeetingDuration(meeting.durationMinutes)
  const isSchedulingWindowValid =
    meeting.schedulingWindow.startDate >= todayInput &&
    meeting.schedulingWindow.endDate >= meeting.schedulingWindow.startDate
  const isTimeConstraintComplete = isSchedulingWindowValid && isDurationValid
  const meetingWithDuration: MeetingWithDuration | null =
    meeting.durationMinutes == null
      ? null
      : { ...meeting, durationMinutes: meeting.durationMinutes }
  const earliestAvailabilityStart = getEarliestAvailabilityStart(hostAvailabilityWindows)
  const responseDeadlineTime = new Date(meeting.responseDeadline).getTime()
  const isResponseDeadlineValid =
    earliestAvailabilityStart != null &&
    !Number.isNaN(responseDeadlineTime) &&
    responseDeadlineTime > createNow.getTime() &&
    responseDeadlineTime < earliestAvailabilityStart.getTime()
  const isRequiredSelectionMissing =
    attendeeDecisionMode === 'required' && requiredParticipants.length === 0
  const minimumAllowedAttendees = Math.max(1, requiredParticipants.length + 1)
  const attendanceThresholdMode: AttendanceThresholdMode =
    meeting.preset === 'quorum' ? 'minimum_count' : 'required_only'
  const maximumAttendees = invitedParticipants.length + 1
  const isMinimumAttendanceValid =
    attendeeDecisionMode !== 'required' ||
    (meeting.minAttendeeCount >= minimumAllowedAttendees &&
      meeting.minAttendeeCount <= maximumAttendees)
  const {
    step,
    timeStep,
    setTimeStep,
    workflowRef,
    timeStepRef,
    currentStepIndex,
    activeCreateStep,
    stepCount,
    canContinue,
    primaryActionLabel,
    goToPreviousStep,
    handlePrimaryAction,
  } = useCreateFlowController({
    meeting,
    hostAvailabilityWindows,
    invitedParticipantCount: invitedParticipants.length,
    attendanceMode: attendeeDecisionMode,
    areAttendeesFinalized,
    hasInvitee,
    isMeetingComplete,
    isTimeConstraintComplete,
    isRequiredSelectionMissing,
    isMinimumAttendanceValid,
    isResponseDeadlineValid,
    onFinalizeAttendees: finalizeAttendees,
    onAvailabilityWindowsChange,
    onResponseDeadlineChange,
    onSendRequest,
  })

  function renderCreateStepBody() {
    if (step === 'meeting') {
      return (
        <MeetingBriefStep
          title={meeting.title}
          purpose={meeting.purpose}
          referenceMaterial={meeting.referenceMaterial ?? ''}
          onTitleChange={onTitleChange}
          onPurposeChange={onPurposeChange}
          onReferenceMaterialChange={onReferenceMaterialChange}
        />
      )
    }

    if (step === 'attendees') {
      return (
        <div className="create-step-body create-step-body--attendees">
          <div className="attendee-disclosure">
            <AttendeePeopleStep
              sectionRef={peopleStepRef}
              participants={invitedParticipants}
              query={attendeeQuery}
              visiblePeople={visiblePeople}
              isFinalized={areAttendeesFinalized}
              isPickerOpen={isPeoplePickerOpen}
              announcement={attendeeAnnouncement}
              onQueryChange={setAttendeeQuery}
              onRemove={removeAttendee}
              onToggle={toggleAttendee}
              onEdit={editAttendees}
              onOpenPicker={() => setIsPeoplePickerOpen(true)}
              onClosePicker={() => setIsPeoplePickerOpen(false)}
              onFinalize={finalizeAttendees}
            />

            {areAttendeesFinalized ? (
              <AttendanceCriteriaStep
                sectionRef={decisionStepRef}
                participants={invitedParticipants}
                decisionMode={attendeeDecisionMode}
                thresholdMode={attendanceThresholdMode}
                minAttendeeCount={meeting.minAttendeeCount}
                minimumAllowedAttendees={minimumAllowedAttendees}
                maximumAttendees={maximumAttendees}
                onDecisionModeChange={selectAttendanceMode}
                onThresholdModeChange={onAttendanceThresholdModeChange}
                onParticipantRoleChange={onParticipantRoleChange}
                onMinAttendeeCountChange={onMinAttendeeCountChange}
              />
            ) : null}
          </div>
        </div>
      )
    }

    if (step === 'times') {
      if (timeStep === 'constraints') {
        return (
          <MeetingTimeConstraintsStep
            sectionRef={timeStepRef}
            schedulingWindow={meeting.schedulingWindow}
            durationMinutes={meeting.durationMinutes}
            todayInput={todayInput}
            isSchedulingWindowValid={isSchedulingWindowValid}
            onSchedulingWindowChange={onSchedulingWindowChange}
            onDurationChange={onDurationChange}
          />
        )
      }

      if (timeStep === 'candidates') {
        return meetingWithDuration == null ? null : (
          <MeetingAvailabilityStep
            sectionRef={timeStepRef}
            meeting={meetingWithDuration}
            availabilityWindows={hostAvailabilityWindows}
            onAvailabilityWindowsChange={onAvailabilityWindowsChange}
            onEditConstraints={() => setTimeStep('constraints')}
          />
        )
      }

      return meeting.durationMinutes == null ? null : (
        <ResponseDeadlineStep
          sectionRef={timeStepRef}
          availabilityWindows={hostAvailabilityWindows}
          durationMinutes={meeting.durationMinutes}
          responseDeadline={meeting.responseDeadline}
          now={createNow}
          earliestAvailabilityStart={earliestAvailabilityStart}
          isResponseDeadlineValid={isResponseDeadlineValid}
          onResponseDeadlineChange={onResponseDeadlineChange}
          onEditAvailability={() => setTimeStep('candidates')}
        />
      )
    }

    return <CreateReviewStep meeting={meeting} attendanceMode={attendeeDecisionMode} />
  }

  return (
    <CreateFlowFrame
      workflowRef={workflowRef}
      stepClassName={`create-workflow--${step}${
        step === 'times' ? ` create-workflow--time-${timeStep}` : ''
      }`}
      currentStepIndex={currentStepIndex}
      stepCount={stepCount}
      activeStep={activeCreateStep}
      isMeetingStep={step === 'meeting'}
      canContinue={canContinue}
      desktopPrimaryLabel={primaryActionLabel}
      mobilePrimaryLabel={primaryActionLabel}
      onBack={goToPreviousStep}
      onPrimary={handlePrimaryAction}
    >
      {renderCreateStepBody()}
    </CreateFlowFrame>
  )
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getEarliestAvailabilityStart(windows: AvailabilityWindow[]) {
  if (windows.length === 0) return null
  return new Date(Math.min(...windows.map((window) => new Date(window.startAt).getTime())))
}
