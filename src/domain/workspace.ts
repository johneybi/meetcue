import { createAccountScenarioMeeting } from './accountScenarios.ts'
import { createDraftMeeting } from './mockMeeting.ts'
import type { Meeting } from './meeting.ts'

export interface WorkspaceEntry {
  meeting: Meeting
  kind: 'host' | 'request'
  participantId?: string
}
export interface WorkspaceSnapshot {
  version: 1
  entries: WorkspaceEntry[]
  selectedCandidateId?: string
  activeMeetingId: string
  readNotificationIds: string[]
}
export const WORKSPACE_STORAGE_KEY = 'meetcue-workspace-v1'

export function createWorkspace(): WorkspaceSnapshot {
  const entries: WorkspaceEntry[] = [
    { meeting: createAccountScenarioMeeting('product-review'), kind: 'host' },
    {
      meeting: createAccountScenarioMeeting('onboarding'),
      kind: 'request',
      participantId: 'p-sujin',
    },
    { meeting: createAccountScenarioMeeting('quarterly-goals'), kind: 'host' },
    {
      meeting: createAccountScenarioMeeting('design-qa'),
      kind: 'request',
      participantId: 'p-minsu',
    },
  ]
  return { version: 1, entries, activeMeetingId: entries[0].meeting.id, readNotificationIds: [] }
}

export function upsertEntry(entries: WorkspaceEntry[], meeting: Meeting): WorkspaceEntry[] {
  const existing = entries.find((entry) => entry.meeting.id === meeting.id)
  if (existing) return entries.map((entry) => (entry === existing ? { ...entry, meeting } : entry))
  return [...entries, { meeting, kind: 'host' }]
}

export function createWorkspaceDraft(id: string): Meeting {
  const draft = createDraftMeeting()
  return { ...draft, id, participants: draft.participants.map((p) => ({ ...p, meetingId: id })) }
}

export function decodeWorkspace(raw: string | null): WorkspaceSnapshot | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as WorkspaceSnapshot
    if (
      value.version !== 1 ||
      !Array.isArray(value.entries) ||
      !value.entries.length ||
      !Array.isArray(value.readNotificationIds) ||
      !value.readNotificationIds.every((id) => typeof id === 'string') ||
      !value.entries.every((entry) => {
        const m = entry.meeting
        return (
          (entry.kind === 'host' || entry.kind === 'request') &&
          m &&
          typeof m.id === 'string' &&
          typeof m.title === 'string' &&
          ['draft', 'collecting', 'confirmed'].includes(m.status) &&
          m.schedulingWindow &&
          typeof m.schedulingWindow.startDate === 'string' &&
          typeof m.responseDeadline === 'string' &&
          Array.isArray(m.participants) &&
          m.participants.every(
            (p) => typeof p.id === 'string' && typeof p.responseToken === 'string',
          ) &&
          Array.isArray(m.candidates) &&
          Array.isArray(m.availabilityWindows) &&
          Array.isArray(m.responses) &&
          Array.isArray(m.changeLogs)
        )
      }) ||
      !value.entries.some((entry) => entry.meeting.id === value.activeMeetingId)
    )
      return null
    return value
  } catch {
    return null
  }
}

export function getEntryStatus(entry: WorkspaceEntry) {
  const { meeting, kind, participantId } = entry
  if (meeting.status === 'draft') return '작성 중'
  if (meeting.status === 'confirmed') return '확정'
  if (kind === 'request')
    return meeting.participants.find((p) => p.id === participantId)?.responseStatus === 'submitted'
      ? '응답 완료'
      : '응답 필요'
  return '조율 중'
}

export function getNotificationId(entry: WorkspaceEntry) {
  const m = entry.meeting
  return `${m.id}:${getEntryStatus(entry)}:${m.responses.length}:${m.confirmedCandidateId ?? ''}`
}
