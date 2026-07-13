import type { RefObject } from 'react'
import type { Participant, ParticipantRole } from '../domain/meeting'
import { Avatar } from './ui/avatar'
import { SelectableCard } from './ui/selectable-card'
import { MinimumAttendanceControl } from './MinimumAttendanceControl'
import './AttendanceCriteriaStep.css'

export type AttendeeDecisionMode = 'everyone' | 'required'
export type AttendanceThresholdMode = 'required_only' | 'minimum_count'

const attendeeDecisionOptions: Array<{
  id: AttendeeDecisionMode
  label: string
  description: string
}> = [
  {
    id: 'everyone',
    label: '모두 참석해야 해요',
    description: '모두가 참석할 수 있는 시간만 보여드려요.',
  },
  {
    id: 'required',
    label: '몇 명은 빠져도 진행할 수 있어요',
    description: '꼭 참석해야 하는 사람과 최소 참석 인원을 기준으로 시간을 찾아요.',
  },
]

type AttendanceCriteriaStepProps = {
  sectionRef: RefObject<HTMLElement | null>
  participants: Participant[]
  decisionMode: AttendeeDecisionMode | null
  thresholdMode: AttendanceThresholdMode
  minAttendeeCount: number
  minimumAllowedAttendees: number
  maximumAttendees: number
  onDecisionModeChange: (mode: AttendeeDecisionMode) => void
  onThresholdModeChange: (mode: AttendanceThresholdMode) => void
  onParticipantRoleChange: (participantId: string, role: ParticipantRole) => void
  onMinAttendeeCountChange: (count: number) => void
}

export function AttendanceCriteriaStep({
  sectionRef,
  participants,
  decisionMode,
  thresholdMode,
  minAttendeeCount,
  minimumAllowedAttendees,
  maximumAttendees,
  onDecisionModeChange,
  onThresholdModeChange,
  onParticipantRoleChange,
  onMinAttendeeCountChange,
}: AttendanceCriteriaStepProps) {
  return (
    <section
      ref={sectionRef}
      className="attendee-substep attendee-substep--decision is-open"
      aria-labelledby="attendee-decision-title"
    >
      <div className="attendee-section-head">
        <h3 id="attendee-decision-title" tabIndex={-1} data-attendee-step-heading>
          이 회의는 모두 참석해야 하나요?
        </h3>
      </div>

      <div className="attendee-substep-content">
        <fieldset className="attendee-decision-options" aria-labelledby="attendee-decision-title">
          <legend className="sr-only">회의 참석 방식</legend>
          {attendeeDecisionOptions.map((option) => (
            <SelectableCard
              key={option.id}
              className="attendee-decision-option"
              isSelected={decisionMode === option.id}
              role="radio"
              aria-checked={decisionMode === option.id}
              onClick={() => onDecisionModeChange(option.id)}
            >
              <span className="decision-radio" aria-hidden="true" />
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </SelectableCard>
          ))}
        </fieldset>

        {decisionMode === 'required' ? (
          <div className="attendance-criteria">
            <fieldset className="required-response-section">
              <legend>꼭 참석해야 하는 사람</legend>
              <div className="required-person-list" aria-label="꼭 참석해야 하는 사람">
                {participants.map((participant) => (
                  <SelectableCard
                    key={participant.id}
                    className="required-person-card"
                    isSelected={participant.role === 'required'}
                    aria-pressed={participant.role === 'required'}
                    onClick={() =>
                      onParticipantRoleChange(
                        participant.id,
                        participant.role === 'required' ? 'optional' : 'required',
                      )
                    }
                  >
                    <Avatar name={participant.name} size="small" />
                    <strong>{participant.name}</strong>
                    <small>{participant.role === 'required' ? '선택됨' : '선택'}</small>
                  </SelectableCard>
                ))}
              </div>
            </fieldset>

            <fieldset className="attendance-threshold-options">
              <legend>필수 참석자만 오면 진행할 수 있나요?</legend>
              <SelectableCard
                isSelected={thresholdMode === 'required_only'}
                aria-pressed={thresholdMode === 'required_only'}
                onClick={() => onThresholdModeChange('required_only')}
              >
                네, 필수 참석자만 오면 돼요
              </SelectableCard>
              <SelectableCard
                isSelected={thresholdMode === 'minimum_count'}
                aria-pressed={thresholdMode === 'minimum_count'}
                onClick={() => onThresholdModeChange('minimum_count')}
              >
                아니요, 전체 참석 인원도 중요해요
              </SelectableCard>
            </fieldset>

            {thresholdMode === 'minimum_count' ? (
              <MinimumAttendanceControl
                value={minAttendeeCount}
                minimum={minimumAllowedAttendees}
                maximum={maximumAttendees}
                onChange={onMinAttendeeCountChange}
              />
            ) : null}
          </div>
        ) : null}

        {decisionMode === 'everyone' ? (
          <p className="all-attendance-summary">
            주최자를 포함한 {maximumAttendees}명이 모두 가능한 시간만 남겨요.
          </p>
        ) : null}
      </div>
    </section>
  )
}
