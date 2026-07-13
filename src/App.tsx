import { Toaster } from 'sonner'
import { CreateScreen } from './components/CreateScreen'
import { ParticipantShell } from './components/ParticipantShell'
import { HostDecisionScreen } from './components/HostDecisionScreen'
import {
  AccountHomeScreen,
  AccountShell,
  MeetingsScreen,
  NotificationsScreen,
  RequestsScreen,
} from './components/AccountScreens'
import { HostShell } from './components/HostShell'
import { RequestSentScreen } from './components/RequestSentScreen'
import { MeetingCriteriaReviewScreen } from './components/MeetingCriteriaReviewScreen'
import { HostWaitingScreen } from './components/HostWaitingScreen'
import { MessageScreen } from './components/MessageScreen'
import { InvalidParticipantInviteScreen } from './components/InvalidParticipantInviteScreen'
import { DevScreenSwitcher } from './components/DevScreenSwitcher'
import { DemoGuide } from './components/DemoGuide'
import { useMeetCueController } from './hooks/useMeetCueController'
import './styles/global.css'
import './styles/CreateScreen.css'

const isTossDemoPath = /(?:^|\/)toss\/?$/.test(window.location.pathname)

function App() {
  const {
    route,
    inviteToken,
    meeting,
    evaluationNow,
    evaluations,
    hostState,
    audience,
    selectedEvaluation,
    selectedParticipant,
    participantState,
    createMeeting,
    accountMeeting,
    requestedParticipantId,
    navigateTo,
    updateTitle,
    updatePurpose,
    updateReferenceMaterial,
    updateSchedulingWindow,
    updateDuration,
    updateResponseDeadline,
    updateAvailabilityWindows,
    updateParticipantRole,
    updateAttendanceMode,
    updateMinAttendeeCount,
    updateAttendanceThresholdMode,
    addParticipant,
    removeParticipant,
    submitParticipantAvailability,
    setSelectedCandidateId,
    remindParticipant,
    sendResponseReminder,
    confirmCandidate,
    startNewMeeting,
    openAccountMeeting,
    openAccountRequest,
    sendResponseRequest,
    advancePrototypeToPending,
    openDevScreen,
    notifyConfirmation,
  } = useMeetCueController()

  return (
    <div>
      <div>
        {audience === 'account' ? (
          <AccountShell
            route={route === 'entry' ? 'home' : route}
            onNavigate={navigateTo}
            onCreate={startNewMeeting}
          >
            {route === 'entry' || route === 'home' ? (
              <AccountHomeScreen
                meeting={accountMeeting}
                onOpenRequest={() => openAccountRequest('onboarding')}
                onOpenMeeting={() => openAccountMeeting('product-review')}
                onOpenConfirmed={() => openAccountMeeting('quarterly-goals')}
                onCreate={startNewMeeting}
                onNavigate={navigateTo}
              />
            ) : null}
            {route === 'meetings' ? (
              <MeetingsScreen meeting={accountMeeting} onOpenMeeting={openAccountMeeting} />
            ) : null}
            {route === 'requests' ? (
              <RequestsScreen meeting={accountMeeting} onOpenRequest={openAccountRequest} />
            ) : null}
            {route === 'notifications' ? (
              <NotificationsScreen
                meeting={accountMeeting}
                onOpenRequest={openAccountRequest}
                onOpenMeeting={openAccountMeeting}
              />
            ) : null}
          </AccountShell>
        ) : null}

        {audience === 'participant' && selectedParticipant == null ? (
          <InvalidParticipantInviteScreen meeting={meeting} onExit={startNewMeeting} />
        ) : null}

        {audience === 'participant' && selectedParticipant != null ? (
          <ParticipantShell
            key={`${selectedParticipant.id}-${participantState}`}
            meeting={meeting}
            participant={selectedParticipant}
            state={participantState}
            now={evaluationNow}
            onSubmit={(participantDraftWindows) => {
              submitParticipantAvailability(selectedParticipant.id, participantDraftWindows)
              navigateTo('invite-done', false, selectedParticipant.responseToken)
            }}
            onEdit={() => navigateTo('invite-edit', false, selectedParticipant.responseToken)}
            onExit={() => navigateTo('host')}
            showPrototypeReturn={requestedParticipantId === selectedParticipant.id}
          />
        ) : null}

        {audience === 'host' ? (
          <HostShell
            meeting={meeting}
            state={hostState}
            route={route}
            onNavigate={navigateTo}
            onCreate={startNewMeeting}
          >
            {route === 'create' ? (
              <CreateScreen
                meeting={createMeeting}
                onTitleChange={updateTitle}
                onPurposeChange={updatePurpose}
                onReferenceMaterialChange={updateReferenceMaterial}
                onSchedulingWindowChange={updateSchedulingWindow}
                onDurationChange={updateDuration}
                onResponseDeadlineChange={updateResponseDeadline}
                onAttendanceModeChange={updateAttendanceMode}
                onAttendanceThresholdModeChange={updateAttendanceThresholdMode}
                onMinAttendeeCountChange={updateMinAttendeeCount}
                onParticipantRoleChange={updateParticipantRole}
                onParticipantAdd={addParticipant}
                onParticipantRemove={removeParticipant}
                onAvailabilityWindowsChange={updateAvailabilityWindows}
                onSendRequest={sendResponseRequest}
              />
            ) : null}

            {route === 'share' ? (
              <RequestSentScreen meeting={meeting} onOpenHost={() => navigateTo('host')} />
            ) : null}

            {route === 'host' && hostState === 'HOST_WAITING_EMPTY' ? (
              <HostWaitingScreen
                meeting={meeting}
                onRemindParticipant={remindParticipant}
                onAdvancePrototype={advancePrototypeToPending}
              />
            ) : null}

            {route === 'host' && hostState === 'HOST_DECISION' && selectedEvaluation != null ? (
              <HostDecisionScreen
                meeting={meeting}
                evaluations={evaluations}
                selectedEvaluation={selectedEvaluation}
                onSelectCandidate={setSelectedCandidateId}
                onConfirm={confirmCandidate}
                onReviewCriteria={() => navigateTo('criteria')}
                onSendRequest={sendResponseReminder}
                requestedParticipant={meeting.participants.find(
                  (participant) => participant.id === requestedParticipantId,
                )}
                onOpenRequestedParticipant={(participant) =>
                  navigateTo('invite', false, participant.responseToken)
                }
              />
            ) : null}

            {route === 'criteria' ? (
              <MeetingCriteriaReviewScreen
                meeting={meeting}
                onAttendanceModeChange={updateAttendanceMode}
                onAttendanceThresholdModeChange={updateAttendanceThresholdMode}
                onMinAttendeeCountChange={updateMinAttendeeCount}
                onParticipantRoleChange={updateParticipantRole}
                onDone={() => navigateTo('host')}
              />
            ) : null}

            {route === 'message' && selectedEvaluation != null ? (
              <MessageScreen
                meeting={meeting}
                evaluation={selectedEvaluation}
                onBack={() => navigateTo('host')}
                onNotify={notifyConfirmation}
              />
            ) : null}

            {route === 'host' && hostState === 'HOST_CONFIRMED' && selectedEvaluation != null ? (
              <MessageScreen
                meeting={meeting}
                evaluation={selectedEvaluation}
                onNotify={notifyConfirmation}
              />
            ) : null}
          </HostShell>
        ) : null}
      </div>
      <Toaster
        position="bottom-center"
        duration={2600}
        visibleToasts={2}
        gap={8}
        toastOptions={{ className: 'meeting-cue-toast' }}
      />
      {isTossDemoPath ? (
        <DemoGuide route={route} meeting={meeting} onOpen={openDevScreen} />
      ) : import.meta.env.DEV ? (
        <DevScreenSwitcher route={route} participantToken={inviteToken} onOpen={openDevScreen} />
      ) : null}
    </div>
  )
}

export default App
