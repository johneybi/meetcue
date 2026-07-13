import type { ChangeLog, Meeting } from './meeting'

export function createChangeLog(
  meeting: Meeting,
  input: {
    type: ChangeLog['type']
    description: string
    candidateId?: string
    participantId?: string
  },
): ChangeLog {
  return {
    id: `change-${Date.now()}-${meeting.changeLogs.length}`,
    meetingId: meeting.id,
    type: input.type,
    description: input.description,
    candidateId: input.candidateId,
    participantId: input.participantId,
    createdAt: new Date().toISOString(),
  }
}
