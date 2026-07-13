import type { MeetingDuration } from '../domain/meeting'

export const MEETING_DURATION_MIN = 30
export const MEETING_DURATION_MAX = 240
export const MEETING_DURATION_STEP = 30
export const MEETING_DURATION_PRESETS: MeetingDuration[] = [30, 60, 90, 120]

export function isValidMeetingDuration(
  duration: MeetingDuration | null,
): duration is MeetingDuration {
  return (
    duration != null &&
    duration >= MEETING_DURATION_MIN &&
    duration <= MEETING_DURATION_MAX &&
    duration % MEETING_DURATION_STEP === 0
  )
}
