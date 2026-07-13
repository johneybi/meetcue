import type { AttendeeDecisionMode, AttendanceThresholdMode } from './AttendanceCriteriaStep'
import type { Meeting, ParticipantRole } from '../domain/meeting'
import { Avatar } from './ui/avatar'
import { Button } from './ui/button'
import { SelectableCard } from './ui/selectable-card'
import { MinimumAttendanceControl } from './MinimumAttendanceControl'
import './MeetingCriteriaReviewScreen.css'

export function MeetingCriteriaReviewScreen({
  meeting,
  onAttendanceModeChange,
  onAttendanceThresholdModeChange,
  onMinAttendeeCountChange,
  onParticipantRoleChange,
  onDone,
}: {
  meeting: Meeting
  onAttendanceModeChange: (mode: AttendeeDecisionMode) => void
  onAttendanceThresholdModeChange: (mode: AttendanceThresholdMode) => void
  onMinAttendeeCountChange: (count: number) => void
  onParticipantRoleChange: (participantId: string, role: ParticipantRole) => void
  onDone: () => void
}) {
  const invitees = meeting.participants.filter((participant) => participant.id !== meeting.hostId)
  const requiredInvitees = invitees.filter((participant) => participant.role === 'required')
  const isEveryoneRequired = meeting.preset === 'all_hands'
  const thresholdMode: AttendanceThresholdMode =
    meeting.preset === 'quorum' ? 'minimum_count' : 'required_only'
  const minimumAllowed = requiredInvitees.length + 1

  return (
    <div className="criteria-review-workspace">
      <section className="criteria-review-panel" aria-labelledby="criteria-review-title">
        <header>
          <span>참석 기준</span>
          <h1 id="criteria-review-title">어떤 조건이면 회의를 열 수 있나요?</h1>
          <p>참석자의 응답과 후보 시간은 그대로 두고, 회의를 열기 위한 조건만 다시 계산해요.</p>
        </header>

        <fieldset className="criteria-choice-group">
          <legend>이 회의는 모두 참석해야 하나요?</legend>
          <SelectableCard
            isSelected={isEveryoneRequired}
            aria-pressed={isEveryoneRequired}
            onClick={() => onAttendanceModeChange('everyone')}
          >
            모두 참석해야 해요
          </SelectableCard>
          <SelectableCard
            isSelected={!isEveryoneRequired}
            aria-pressed={!isEveryoneRequired}
            onClick={() => onAttendanceModeChange('required')}
          >
            몇 명은 빠져도 진행할 수 있어요
          </SelectableCard>
        </fieldset>

        {!isEveryoneRequired ? (
          <>
            <fieldset className="criteria-required-group">
              <legend>꼭 참석해야 하는 사람</legend>
              <p>주최자는 항상 포함돼요.</p>
              <div>
                {invitees.map((participant) => {
                  const isRequired = participant.role === 'required'
                  return (
                    <SelectableCard
                      key={participant.id}
                      isSelected={isRequired}
                      aria-pressed={isRequired}
                      onClick={() =>
                        onParticipantRoleChange(
                          participant.id,
                          isRequired ? 'optional' : 'required',
                        )
                      }
                    >
                      <Avatar name={participant.name} size="small" />
                      <strong>{participant.name}</strong>
                      <small>{isRequired ? '꼭 필요' : '선택 안 함'}</small>
                    </SelectableCard>
                  )
                })}
              </div>
            </fieldset>

            <fieldset className="criteria-choice-group">
              <legend>필수 참석자만 오면 진행할 수 있나요?</legend>
              <SelectableCard
                isSelected={thresholdMode === 'required_only'}
                aria-pressed={thresholdMode === 'required_only'}
                onClick={() => onAttendanceThresholdModeChange('required_only')}
              >
                네, 필수 참석자만 오면 돼요
              </SelectableCard>
              <SelectableCard
                isSelected={thresholdMode === 'minimum_count'}
                aria-pressed={thresholdMode === 'minimum_count'}
                onClick={() => onAttendanceThresholdModeChange('minimum_count')}
              >
                아니요, 전체 참석 인원도 중요해요
              </SelectableCard>
            </fieldset>

            {thresholdMode === 'minimum_count' ? (
              <MinimumAttendanceControl
                value={meeting.minAttendeeCount}
                minimum={minimumAllowed}
                maximum={meeting.participants.length}
                onChange={onMinAttendeeCountChange}
              />
            ) : null}
          </>
        ) : null}

        <footer>
          <div>
            <span>현재 기준</span>
            <strong>
              {isEveryoneRequired
                ? `주최자 포함 ${meeting.participants.length}명 모두`
                : `필수 ${requiredInvitees.length + 1}명 · 최소 ${meeting.minAttendeeCount}명`}
            </strong>
          </div>
          <Button size="action" onClick={onDone}>
            이 기준으로 결과 다시 보기
          </Button>
        </footer>
      </section>
    </div>
  )
}
