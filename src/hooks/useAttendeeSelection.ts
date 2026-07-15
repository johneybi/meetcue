import { useEffect, useRef, useState } from 'react'
import type { Meeting, Participant } from '../domain/meeting'
import type { AttendeeDecisionMode } from '../components/AttendanceCriteriaStep'

const ATTENDEE_DIRECTORY = ['유진', '현우', '다은', '도윤', '서연', '민수']
const RECENT_INVITEES_STORAGE_KEY = 'confirmation-board-recent-invitees'

type UseAttendeeSelectionOptions = {
  meeting: Meeting
  onParticipantAdd: (name?: string) => void
  onParticipantRemove: (participantId: string) => void
  onAttendanceModeChange: (mode: AttendeeDecisionMode) => void
}

export function useAttendeeSelection({
  meeting,
  onParticipantAdd,
  onParticipantRemove,
  onAttendanceModeChange,
}: UseAttendeeSelectionOptions) {
  const [query, setQuery] = useState('')
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isFinalized, setIsFinalized] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [decisionMode, setDecisionMode] = useState<AttendeeDecisionMode | null>(null)
  const [recentInvitees, setRecentInvitees] = useState<string[]>(readRecentInvitees)
  const peopleStepRef = useRef<HTMLElement>(null)
  const decisionStepRef = useRef<HTMLElement>(null)
  const shouldFocusPeopleRef = useRef(false)
  const shouldFocusDecisionRef = useRef(false)
  const participants = meeting.participants.filter(
    (participant) => participant.id !== meeting.hostId,
  )
  const requiredParticipants = participants.filter((participant) => participant.role === 'required')
  const hasInvitee = participants.length > 0
  const inviteeNames = participants.map((participant) => participant.name)
  const selectedNames = new Set(
    participants.map((participant) => participant.name.trim().toLocaleLowerCase()),
  )
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const peopleSource = normalizedQuery
    ? ATTENDEE_DIRECTORY
    : [...recentInvitees, ...ATTENDEE_DIRECTORY]
  const visiblePeople = peopleSource.filter(
    (name, index, names) =>
      names.indexOf(name) === index && name.toLocaleLowerCase().includes(normalizedQuery),
  )

  useEffect(() => {
    if (isFinalized && shouldFocusDecisionRef.current) {
      shouldFocusDecisionRef.current = false
      const frame = window.requestAnimationFrame(() =>
        focusAttendeeSubstep(decisionStepRef.current),
      )
      return () => window.cancelAnimationFrame(frame)
    }

    if (!isFinalized && shouldFocusPeopleRef.current) {
      shouldFocusPeopleRef.current = false
      const frame = window.requestAnimationFrame(() => focusAttendeeSubstep(peopleStepRef.current))
      return () => window.cancelAnimationFrame(frame)
    }
  }, [isFinalized])

  useEffect(() => {
    if (!isPickerOpen) return

    const previousOverflow = document.body.style.overflow

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsPickerOpen(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPickerOpen])

  function addAttendee(name: string, clearQuery = true) {
    const normalizedName = name.trim()
    if (!normalizedName || selectedNames.has(normalizedName.toLocaleLowerCase())) return

    onParticipantAdd(normalizedName)
    setAnnouncement(`${normalizedName}님을 추가했어요. 선택한 사람 ${participants.length + 1}명`)
    if (clearQuery) setQuery('')
  }

  function removeAttendee(participant: Participant) {
    onParticipantRemove(participant.id)
    setAnnouncement(
      `${participant.name}님을 제외했어요. 선택한 사람 ${Math.max(participants.length - 1, 0)}명`,
    )
  }

  function toggleAttendee(name: string) {
    const participant = participants.find(
      (item) => item.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
    )

    if (participant) {
      removeAttendee(participant)
      return
    }

    addAttendee(name, false)
  }

  function finalizeAttendees() {
    if (!hasInvitee) return

    setIsPickerOpen(false)
    setRecentInvitees((currentNames) => {
      const nextNames = [...inviteeNames, ...currentNames]
        .filter((name, index, names) => names.indexOf(name) === index)
        .slice(0, 8)

      try {
        window.localStorage.setItem(RECENT_INVITEES_STORAGE_KEY, JSON.stringify(nextNames))
      } catch {
        // Selection remains available when storage is blocked.
      }

      return nextNames
    })
    shouldFocusDecisionRef.current = true
    setIsFinalized(true)
  }

  function editAttendees() {
    shouldFocusPeopleRef.current = true
    setIsFinalized(false)
  }

  function selectDecisionMode(mode: AttendeeDecisionMode) {
    setDecisionMode(mode)
    onAttendanceModeChange(mode)
  }

  return {
    participants,
    requiredParticipants,
    hasInvitee,
    query,
    setQuery,
    visiblePeople,
    isPickerOpen,
    setIsPickerOpen,
    isFinalized,
    announcement,
    decisionMode,
    peopleStepRef,
    decisionStepRef,
    removeAttendee,
    toggleAttendee,
    finalizeAttendees,
    editAttendees,
    selectDecisionMode,
  }
}

function readRecentInvitees() {
  if (typeof window === 'undefined') return ATTENDEE_DIRECTORY

  try {
    const storedNames = JSON.parse(window.localStorage.getItem(RECENT_INVITEES_STORAGE_KEY) ?? '[]')
    if (!Array.isArray(storedNames) || storedNames.length === 0) return ATTENDEE_DIRECTORY

    return [...storedNames.filter((name): name is string => typeof name === 'string'), ...ATTENDEE_DIRECTORY]
      .filter((name, index, names) => names.indexOf(name) === index)
      .slice(0, 8)
  } catch {
    return ATTENDEE_DIRECTORY
  }
}

function focusAttendeeSubstep(target: HTMLElement | null) {
  if (!target) return

  const heading = target.querySelector<HTMLElement>('[data-attendee-step-heading]')
  const workflow = target.closest<HTMLElement>('.create-workflow')
  const isMobile = window.matchMedia('(max-width: 760px)').matches
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  ;(isMobile ? target : workflow)?.scrollIntoView({
    behavior: reduceMotion ? 'auto' : 'smooth',
    block: 'start',
  })
  heading?.focus({ preventScroll: true })
}
