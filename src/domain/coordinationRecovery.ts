export type RecoveryCandidateId = 'tuesday' | 'thursday'
export type RecoveryReply = 'accepted' | 'declined'
export type RecoveryStatus = 'unasked' | 'pending' | RecoveryReply
export type RecoveryState = {
  statuses: Record<RecoveryCandidateId, RecoveryStatus>
  confirmed: RecoveryCandidateId | null
}
export type RecoveryAction =
  | { type: 'request'; candidateId: RecoveryCandidateId }
  | { type: 'cancel'; candidateId: RecoveryCandidateId }
  | { type: 'reply'; candidateId: RecoveryCandidateId; reply: RecoveryReply }
  | { type: 'confirm'; candidateId: RecoveryCandidateId }

export function createRecoveryState(): RecoveryState {
  return { statuses: { tuesday: 'unasked', thursday: 'unasked' }, confirmed: null }
}

// This isolated prototype never changes saved meetings or sends requests.
// A pending check or an intention to move a meeting is not permission to confirm.
export function recoveryReducer(state: RecoveryState, action: RecoveryAction): RecoveryState {
  if (state.confirmed) return state
  const status = state.statuses[action.candidateId]
  if (action.type === 'confirm') {
    return status === 'accepted' ? { ...state, confirmed: action.candidateId } : state
  }
  if (action.type === 'request') {
    if (status !== 'unasked' || Object.values(state.statuses).includes('pending')) return state
    return { ...state, statuses: { ...state.statuses, [action.candidateId]: 'pending' } }
  }
  if (action.type === 'cancel') {
    return status === 'pending'
      ? { ...state, statuses: { ...state.statuses, [action.candidateId]: 'unasked' } }
      : state
  }
  if (status !== 'pending') return state
  return { ...state, statuses: { ...state.statuses, [action.candidateId]: action.reply } }
}
