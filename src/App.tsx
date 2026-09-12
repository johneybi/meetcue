import { getNotificationId } from './domain/workspace'
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
import './styles/MobileSurfacePreview.css'
import './styles/ServiceFoundation.css'
import './styles/DecisionPlanner.css'
import './styles/material-tokens.css'
import './styles/soft-material.css'

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
    accountEntries,
    missingMeeting,
    readNotificationIds,
    markNotificationsRead,
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
    applyAttendanceCriteria,
    addParticipant,
    removeParticipant,
    submitParticipantAvailability,
    setSelectedCandidateId,
    remindParticipant,
    sendResponseReminder,
    confirmCandidate,
    completeConfirmation,
    startNewMeeting,
    openAccountMeeting,
    openAccountRequest,
    sendResponseRequest,
    advancePrototypeToPending,
    openDevScreen,
  } = useMeetCueController()

  return (
    <div className="mobile-surface-preview">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault()
          const main = document.querySelector('main')
          if (main) {
            main.tabIndex = -1
            main.focus()
          }
        }}
      >
        본문으로 바로가기
      </a>
      <div>
        {missingMeeting ? (
          <AccountShell route="" onNavigate={navigateTo} onCreate={startNewMeeting} unreadCount={0}>
            <div className="account-empty">
              <h1>회의를 찾을 수 없어요</h1>
              <p>받은 링크를 확인하거나 내 회의에서 다시 열어주세요.</p>
              <a className="header-return" href="#/home">
                홈으로 돌아가기
              </a>
            </div>
          </AccountShell>
        ) : null}
        {!missingMeeting && audience === 'account' ? (
          <AccountShell
            route={route === 'entry' ? 'home' : route}
            onNavigate={navigateTo}
            onCreate={startNewMeeting}
            unreadCount={
              accountEntries.filter(
                (e) =>
                  e.meeting.status !== 'draft' &&
                  !readNotificationIds.includes(getNotificationId(e)),
              ).length
            }
          >
            {route === 'entry' || route === 'home' ? (
              <AccountHomeScreen
                entries={accountEntries}
                onOpenRequest={openAccountRequest}
                onOpenMeeting={openAccountMeeting}
                onCreate={startNewMeeting}
              />
            ) : null}
            {route === 'meetings' ? (
              <MeetingsScreen
                entries={accountEntries}
                onOpenMeeting={openAccountMeeting}
                onCreate={startNewMeeting}
              />
            ) : null}
            {route === 'requests' ? (
              <RequestsScreen entries={accountEntries} onOpenRequest={openAccountRequest} />
            ) : null}
            {route === 'notifications' ? (
              <NotificationsScreen
                entries={accountEntries}
                readIds={readNotificationIds}
                onRead={markNotificationsRead}
                onOpenRequest={openAccountRequest}
                onOpenMeeting={openAccountMeeting}
              />
            ) : null}
          </AccountShell>
        ) : null}

        {!missingMeeting && audience === 'participant' && selectedParticipant == null ? (
          <InvalidParticipantInviteScreen meeting={meeting} onExit={() => navigateTo('home')} />
        ) : null}

        {!missingMeeting && audience === 'participant' && selectedParticipant != null ? (
          <ParticipantShell
            key={`${meeting.id}-${selectedParticipant.id}-${participantState}`}
            meeting={meeting}
            participant={selectedParticipant}
            state={participantState}
            now={evaluationNow}
            preferredCandidateId={
              requestedParticipantId === selectedParticipant.id
                ? selectedEvaluation?.candidate.id
                : undefined
            }
            onSubmit={(participantDraftWindows, submission) => {
              submitParticipantAvailability(
                selectedParticipant.id,
                participantDraftWindows,
                submission,
              )
              navigateTo('invite-done', false, selectedParticipant.responseToken)
            }}
            onEdit={() => navigateTo('invite-edit', false, selectedParticipant.responseToken)}
            onExit={() => navigateTo('host')}
            showPrototypeReturn={requestedParticipantId === selectedParticipant.id}
          />
        ) : null}

        {!missingMeeting && audience === 'host' ? (
          <HostShell
            meeting={meeting}
            state={hostState}
            route={route}
            onNavigate={navigateTo}
            onCreate={startNewMeeting}
            unreadCount={
              accountEntries.filter(
                (e) =>
                  e.meeting.status !== 'draft' &&
                  !readNotificationIds.includes(getNotificationId(e)),
              ).length
            }
          >
            {route === 'create' ? (
              <CreateScreen
                key={meeting.id}
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
                onApply={(criteria) => {
                  applyAttendanceCriteria(criteria)
                  navigateTo('host')
                }}
                onCancel={() => navigateTo('host')}
              />
            ) : null}

            {route === 'message' && selectedEvaluation != null ? (
              <MessageScreen
                onHome={() => navigateTo('meetings')}
                meeting={meeting}
                evaluation={selectedEvaluation}
                onBack={() => navigateTo('host')}
                onConfirm={() => completeConfirmation(selectedEvaluation.candidate.id)}
              />
            ) : null}

            {route === 'host' && hostState === 'HOST_CONFIRMED' && selectedEvaluation != null ? (
              <MessageScreen
                onHome={() => navigateTo('meetings')}
                meeting={meeting}
                evaluation={selectedEvaluation}
                onConfirm={() => completeConfirmation(selectedEvaluation.candidate.id)}
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
