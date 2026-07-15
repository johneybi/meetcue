import { useState, type RefObject } from 'react'
import type { Participant } from '../domain/meeting'
import { InviteeOption } from './InviteeOption'
import {
  OrganizationDirectoryIcon,
  OrganizationDirectoryPicker,
} from './OrganizationDirectoryPicker'
import { Button } from './ui/button'
import { Avatar } from './ui/avatar'
import { Input } from './ui/input'
import './AttendeePeopleStep.css'

type AttendeePeopleStepProps = {
  sectionRef: RefObject<HTMLElement | null>
  participants: Participant[]
  query: string
  visiblePeople: string[]
  isFinalized: boolean
  isPickerOpen: boolean
  announcement: string
  onQueryChange: (query: string) => void
  onRemove: (participant: Participant) => void
  onToggle: (name: string) => void
  onEdit: () => void
  onOpenPicker: () => void
  onClosePicker: () => void
  onFinalize: () => void
}

export function AttendeePeopleStep({
  sectionRef,
  participants,
  query,
  visiblePeople,
  isFinalized,
  isPickerOpen,
  announcement,
  onQueryChange,
  onRemove,
  onToggle,
  onEdit,
  onOpenPicker,
  onClosePicker,
  onFinalize,
}: AttendeePeopleStepProps) {
  const hasInvitee = participants.length > 0
  const inviteeNames = participants.map((participant) => participant.name)
  const selectedNames = new Set(
    participants.map((participant) => participant.name.trim().toLocaleLowerCase()),
  )
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const [isOrganizationOpen, setIsOrganizationOpen] = useState(false)

  function renderSelectedInvitees(compact = false) {
    if (!hasInvitee) return null

    return (
      <section
        className={`selected-invitees${compact ? ' selected-invitees--compact' : ''}`}
        aria-labelledby={compact ? 'mobile-selected-invitees-title' : 'selected-invitees-title'}
      >
        <div className="selected-invitees-head">
          <strong id={compact ? 'mobile-selected-invitees-title' : 'selected-invitees-title'}>
            선택한 사람
          </strong>
          <span>{participants.length}명</span>
        </div>
        <div className="selected-invitee-list">
          {participants.map((participant) => (
            <div className="selected-invitee-row" key={participant.id}>
              <Avatar name={participant.name} size="small" />
              <strong>{participant.name}</strong>
              <small>선택됨</small>
              <Button
                variant="quiet"
                size="iconSmall"
                aria-label={`${participant.name} 삭제`}
                onClick={() => onRemove(participant)}
              >
                <span aria-hidden="true">×</span>
              </Button>
            </div>
          ))}
        </div>
      </section>
    )
  }

  function renderPeopleOptions(listId: string) {
    if (visiblePeople.length === 0) {
      return normalizedQuery ? (
        <p className="people-options-empty">
          초대할 수 있는 사람을 찾지 못했어요. 이름을 바꿔 다시 검색해 주세요.
        </p>
      ) : null
    }

    return (
      <div className="people-options">
        <strong>{normalizedQuery ? '검색 결과' : '최근 함께한 사람'}</strong>
        <div
          id={listId}
          className="people-options-list"
          role="listbox"
          aria-label={normalizedQuery ? '검색 결과' : '최근 함께한 사람'}
          aria-multiselectable="true"
        >
          {visiblePeople.map((name) => {
            const isSelected = selectedNames.has(name.toLocaleLowerCase())
            return (
              <InviteeOption
                key={name}
                name={name}
                isSelected={isSelected}
                onToggle={onToggle}
              />
            )
          })}
        </div>
      </div>
    )
  }

  function renderSearch(label: string, controlsId: string, autoFocus = false, className = '') {
    return (
      <div className={`people-search${className ? ` ${className}` : ''}`} role="search">
        <Input
          controlSize="field"
          value={query}
          placeholder="이름으로 검색"
          aria-label={label}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={visiblePeople.length > 0}
          aria-controls={controlsId}
          autoFocus={autoFocus}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
    )
  }

  return (
    <section
      ref={sectionRef}
      className={`attendee-substep${isFinalized ? ' is-summary' : ' is-open'}`}
      aria-labelledby="attendee-people-title"
    >
      <div className="attendee-substep-heading-row">
        <div className="attendee-section-head">
          <h3 id="attendee-people-title" tabIndex={-1} data-attendee-step-heading>
            참석자
          </h3>
        </div>
        {isFinalized ? (
          <Button
            className="attendee-edit-button"
            variant="quiet"
            size="text"
            onClick={onEdit}
          >
            수정
          </Button>
        ) : null}
      </div>

      {isFinalized ? (
        <div className="attendee-compact-summary" aria-live="polite">
          <strong>{participants.length}명</strong>
          <span>{inviteeNames.join(', ')}</span>
        </div>
      ) : (
        <div className="attendee-substep-content">
          <Button
            className="mobile-people-picker-trigger"
            variant="secondary"
            width="full"
            onClick={onOpenPicker}
          >
            <span>
              {hasInvitee
                ? `${inviteeNames.join(', ')}${inviteeNames.length > 2 ? ` 외 ${inviteeNames.length - 2}명` : ''}`
                : '이름으로 검색'}
            </span>
            <strong>찾기</strong>
          </Button>

          <div className="people-find-controls people-search--desktop">
            {renderSearch('참석자 이름 또는 이메일', 'desktop-attendee-options')}
            <Button
              className="organization-directory-trigger"
              variant="secondary"
              onClick={() => setIsOrganizationOpen(true)}
            >
              <OrganizationDirectoryIcon />
              팀에서 찾기
            </Button>
          </div>
          {renderSelectedInvitees()}
          <div className="people-options--desktop">
            {renderPeopleOptions('desktop-attendee-options')}
          </div>
          <p className="sr-only" aria-live="polite">
            {announcement}
          </p>

          {isPickerOpen ? (
            <div className="people-picker-overlay" role="presentation" onClick={onClosePicker}>
              <section
                className="people-picker-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="people-picker-title"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    onClosePicker()
                  }
                }}
              >
                <div className="people-picker-head">
                  <h3 id="people-picker-title">사람 찾기</h3>
                  <Button variant="quiet" size="text" onClick={onClosePicker}>
                    닫기
                  </Button>
                </div>
                {renderSelectedInvitees(true)}
                {renderSearch('사람 찾기', 'mobile-attendee-options', true)}
                <Button
                  className="organization-directory-trigger"
                  variant="secondary"
                  width="full"
                  onClick={() => setIsOrganizationOpen(true)}
                >
                  <OrganizationDirectoryIcon />
                  팀에서 찾기
                </Button>
                {renderPeopleOptions('mobile-attendee-options')}
                <Button
                  className="people-picker-done"
                  width="full"
                  disabled={!hasInvitee}
                  onClick={onFinalize}
                >
                  {hasInvitee ? `${participants.length}명 선택 완료` : '사람을 선택해 주세요'}
                </Button>
              </section>
            </div>
          ) : null}
        </div>
      )}
      {isOrganizationOpen ? (
        <OrganizationDirectoryPicker
          selectedNames={inviteeNames}
          onClose={() => setIsOrganizationOpen(false)}
          onApply={(changes) => {
            changes.forEach(({ name }) => onToggle(name))
          }}
        />
      ) : null}
    </section>
  )
}
