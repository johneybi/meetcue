import { useState } from 'react'
import {
  deriveAvailabilitySlots,
  fillAvailabilitySlots,
  getAvailabilityStateForSlot,
  replaceAvailabilitySlot,
  type AvailabilitySlot,
} from '../domain/availability'
import type { AvailabilityWindow, Meeting, Participant, ResponseValue } from '../domain/meeting'

export type ParticipantInputSource = 'calendar' | 'manual' | 'existing'

type UseParticipantAvailabilityResponseOptions = {
  meeting: Meeting
  participant: Participant
  isCalendarBusy: (slot: AvailabilitySlot) => boolean
}

export function useParticipantAvailabilityResponse({
  meeting,
  participant,
  isCalendarBusy,
}: UseParticipantAvailabilityResponseOptions) {
  const [isSaveConfirmationOpen, setIsSaveConfirmationOpen] = useState(false)
  const [editorStatus, setEditorStatus] = useState<Participant['responseStatus']>(
    participant.responseStatus,
  )
  const [draftWindows, setDraftWindows] = useState<AvailabilityWindow[]>(() =>
    meeting.availabilityWindows
      .filter((window) => window.ownerId === participant.id)
      .map((window) => ({ ...window })),
  )
  const [hasBaseline, setHasBaseline] = useState(
    () => participant.responseStatus !== 'not_started' || draftWindows.length > 0,
  )
  const [inputSource, setInputSource] = useState<ParticipantInputSource | null>(() =>
    participant.responseStatus !== 'not_started' || draftWindows.length > 0 ? 'existing' : null,
  )
  const [manuallyEditedSlotStarts, setManuallyEditedSlotStarts] = useState<Set<string>>(
    () => new Set(),
  )
  const slots = deriveAvailabilitySlots(meeting.availabilityWindows, meeting.hostId)
  const answeredCount = slots.filter(
    (slot) => getAvailabilityStateForSlot(draftWindows, participant.id, slot) != null,
  ).length
  const remainingCount = slots.length - answeredCount

  function startManualEntry() {
    setDraftWindows([])
    setHasBaseline(true)
    setInputSource('manual')
    setManuallyEditedSlotStarts(new Set())
    setEditorStatus('draft')
    setIsSaveConfirmationOpen(false)
  }

  function applyCalendar() {
    setDraftWindows((currentWindows) => {
      let nextWindows = fillAvailabilitySlots(
        currentWindows,
        participant.id,
        slots,
        'available',
        meeting.id,
      )
      slots.filter(isCalendarBusy).forEach((slot) => {
        nextWindows = replaceAvailabilitySlot(
          nextWindows,
          participant.id,
          slot,
          'unavailable',
          false,
          meeting.id,
        )
      })
      return nextWindows
    })
    setHasBaseline(true)
    setInputSource('calendar')
    setManuallyEditedSlotStarts(new Set())
    setEditorStatus('draft')
    setIsSaveConfirmationOpen(false)
  }

  function paintSlot(slot: AvailabilitySlot, state: ResponseValue) {
    setDraftWindows((currentWindows) =>
      replaceAvailabilitySlot(currentWindows, participant.id, slot, state, false, meeting.id),
    )
    if (inputSource === 'calendar') {
      setManuallyEditedSlotStarts((current) => new Set(current).add(slot.startAt))
    }
    setEditorStatus('draft')
    setIsSaveConfirmationOpen(false)
  }

  function resetBaseline() {
    setDraftWindows([])
    setHasBaseline(false)
    setInputSource(null)
    setManuallyEditedSlotStarts(new Set())
    setEditorStatus('not_started')
    setIsSaveConfirmationOpen(false)
  }

  return {
    slots,
    draftWindows,
    hasBaseline,
    inputSource,
    manuallyEditedSlotStarts,
    editorStatus,
    remainingCount,
    isSaveConfirmationOpen,
    startManualEntry,
    applyCalendar,
    paintSlot,
    resetBaseline,
    openSaveConfirmation: () => setIsSaveConfirmationOpen(true),
    closeSaveConfirmation: () => setIsSaveConfirmationOpen(false),
  }
}
