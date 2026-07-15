import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { AttendeeDecisionMode, AttendanceThresholdMode } from './AttendanceCriteriaStep'
import type { Meeting, MeetingPreset, ParticipantRole } from '../domain/meeting'
import { Avatar } from './ui/avatar'
import { Button } from './ui/button'
import { SelectableCard } from './ui/selectable-card'
import { MinimumAttendanceControl } from './MinimumAttendanceControl'
import './MeetingCriteriaReviewScreen.css'

export function MeetingCriteriaReviewScreen({
  meeting,
  onApply,
  onCancel,
}: {
  meeting: Meeting
  onApply: (criteria: AttendanceCriteriaUpdate) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<AttendanceCriteriaUpdate>(() => {
    const participantRoles = Object.fromEntries(
      meeting.participants.map((participant) => [participant.id, participant.role]),
    )
    const requiredCount = Object.values(participantRoles).filter(
      (role) => role === 'required',
    ).length

    return {
      preset: meeting.preset,
      minAttendeeCount:
        meeting.preset === 'all_hands'
          ? meeting.participants.length
          : meeting.preset === 'core_attendees'
            ? requiredCount
            : Math.max(requiredCount, meeting.minAttendeeCount),
      participantRoles,
    }
  })
  const participants = meeting.participants.map((participant) => ({
    ...participant,
    role: draft.participantRoles[participant.id] ?? participant.role,
  }))
  const invitees = participants.filter((participant) => participant.id !== meeting.hostId)
  const requiredInvitees = invitees.filter((participant) => participant.role === 'required')
  const isEveryoneRequired = draft.preset === 'all_hands'
  const thresholdMode: AttendanceThresholdMode =
    draft.preset === 'quorum' ? 'minimum_count' : 'required_only'
  const minimumAllowed = requiredInvitees.length + 1

  function changeAttendanceMode(mode: AttendeeDecisionMode) {
    setDraft(() => {
      const participantRoles = Object.fromEntries(
        participants.map((participant) => [
          participant.id,
          mode === 'everyone' || participant.id === meeting.hostId ? 'required' : 'optional',
        ]),
      ) as Record<string, ParticipantRole>
      return {
        preset: mode === 'everyone' ? 'all_hands' : 'core_attendees',
        minAttendeeCount: mode === 'everyone' ? participants.length : 1,
        participantRoles,
      }
    })
  }

  function changeParticipantRole(participantId: string, role: ParticipantRole) {
    setDraft((current) => {
      const participantRoles = { ...current.participantRoles, [participantId]: role }
      const requiredCount = Object.values(participantRoles).filter(
        (participantRole) => participantRole === 'required',
      ).length
      return {
        ...current,
        participantRoles,
        minAttendeeCount:
          current.preset === 'core_attendees'
            ? requiredCount
            : Math.max(current.minAttendeeCount, requiredCount),
      }
    })
  }

  function changeThresholdMode(mode: AttendanceThresholdMode) {
    setDraft((current) => {
      const requiredCount = Object.values(current.participantRoles).filter(
        (role) => role === 'required',
      ).length
      return {
        ...current,
        preset: mode === 'required_only' ? 'core_attendees' : 'quorum',
        minAttendeeCount:
          mode === 'required_only'
            ? requiredCount
            : Math.max(requiredCount, current.minAttendeeCount),
      }
    })
  }

  function changeMinimumCount(count: number) {
    setDraft((current) => ({
      ...current,
      minAttendeeCount: Math.min(participants.length, Math.max(minimumAllowed, count)),
    }))
  }

  return (
    <div className="criteria-review-workspace">
      <Button className="criteria-review-back" variant="quiet" size="text" onClick={onCancel}>
        <ArrowLeft aria-hidden="true" size={18} />
        결과로 돌아가기
      </Button>
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
            onClick={() => changeAttendanceMode('everyone')}
          >
            모두 참석해야 해요
          </SelectableCard>
          <SelectableCard
            isSelected={!isEveryoneRequired}
            aria-pressed={!isEveryoneRequired}
            onClick={() => changeAttendanceMode('required')}
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
                        changeParticipantRole(
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
                onClick={() => changeThresholdMode('required_only')}
              >
                네, 필수 참석자만 오면 돼요
              </SelectableCard>
              <SelectableCard
                isSelected={thresholdMode === 'minimum_count'}
                aria-pressed={thresholdMode === 'minimum_count'}
                onClick={() => changeThresholdMode('minimum_count')}
              >
                아니요, 전체 참석 인원도 중요해요
              </SelectableCard>
            </fieldset>

            {thresholdMode === 'minimum_count' ? (
              <MinimumAttendanceControl
                value={draft.minAttendeeCount}
                minimum={minimumAllowed}
                maximum={meeting.participants.length}
                onChange={changeMinimumCount}
              />
            ) : null}
          </>
        ) : null}

        <footer>
          <div>
            <span>현재 기준</span>
            <strong>
              {isEveryoneRequired
                ? `주최자 포함 ${participants.length}명 모두`
                : thresholdMode === 'required_only'
                  ? `필수 ${requiredInvitees.length + 1}명이 가능하면 진행`
                  : `필수 ${requiredInvitees.length + 1}명 · 최소 ${draft.minAttendeeCount}명`}
            </strong>
          </div>
          <Button size="action" onClick={() => onApply(draft)}>
            변경한 기준으로 다시 계산하기
          </Button>
        </footer>
      </section>
    </div>
  )
}

export interface AttendanceCriteriaUpdate {
  preset: MeetingPreset
  minAttendeeCount: number
  participantRoles: Record<string, ParticipantRole>
}
