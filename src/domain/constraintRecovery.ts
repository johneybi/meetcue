export type Person = { id: string; name: string; required: boolean }
export type Answer = {
  kind: 'available' | 'unknown' | 'adjustable' | 'unavailable'
  conflicts: string[]
}
export type RecoverySlot = {
  id: string
  start: string
  end: string
  answers: Record<string, Answer>
}
export type CheckReply = 'pending' | 'yes' | 'no'
export type RecoveryRequest = {
  id: number
  slotId: string
  replies: Record<string, CheckReply>
  status: 'active' | 'rejected' | 'canceled' | 'confirmed'
}
export type ConstraintState = {
  people: Person[]
  slots: RecoverySlot[]
  requests: RecoveryRequest[]
  nextId: number
  confirmed: string | null
  ended: boolean
}
export type ConstraintAction =
  | { type: 'request'; slotId: string }
  | { type: 'reply'; requestId: number; personId: string; value: 'yes' | 'no' }
  | { type: 'cancel'; requestId: number }
  | { type: 'confirm'; requestId: number }
  | { type: 'add'; start: string }
  | { type: 'end' }

export function describePath(state: ConstraintState, slot: RecoverySlot) {
  const request = [...state.requests]
    .reverse()
    .find((r) => r.slotId === slot.id && r.status !== 'canceled')
  const blocked = state.people.filter(
    (p) =>
      p.required && (slot.answers[p.id]?.kind === 'unavailable' || request?.replies[p.id] === 'no'),
  )
  const changes = state.people.filter(
    (p) => p.required && slot.answers[p.id]?.kind === 'adjustable',
  )
  const unknown = state.people.filter(
    (p) => p.required && (!slot.answers[p.id] || slot.answers[p.id].kind === 'unknown'),
  )
  const needed = [...changes, ...unknown]
  const remaining = needed.filter((p) => request?.replies[p.id] !== 'yes')
  const available = state.people.filter(
    (p) => slot.answers[p.id]?.kind === 'available' || request?.replies[p.id] === 'yes',
  )
  return {
    blocked,
    changes,
    unknown,
    needed,
    remaining,
    available,
    request,
    changeCount: changes.reduce((n, p) => n + slot.answers[p.id].conflicts.length, 0),
    ready: !blocked.length && !remaining.length,
  }
}

export function constraintReducer(
  state: ConstraintState,
  action: ConstraintAction,
): ConstraintState {
  if (state.confirmed || state.ended) return state
  const active = state.requests.find((r) => r.status === 'active')
  if (action.type === 'end')
    return {
      ...state,
      ended: true,
      requests: state.requests.map((r) =>
        r.status === 'active' ? { ...r, status: 'canceled' } : r,
      ),
    }
  if (action.type === 'add') {
    const timestamp = Date.parse(action.start)
    if (
      active ||
      !Number.isFinite(timestamp) ||
      timestamp <= Date.now() ||
      state.slots.some((s) => Date.parse(s.start) === timestamp)
    )
      return state
    const slot: RecoverySlot = {
      id: `extra-${state.slots.length}`,
      start: new Date(timestamp).toISOString(),
      end: new Date(timestamp + 3600000).toISOString(),
      answers: Object.fromEntries(
        state.people.map((p) => [
          p.id,
          { kind: p.id === 'host' ? 'available' : 'unknown', conflicts: [] },
        ]),
      ),
    }
    return { ...state, slots: [...state.slots, slot] }
  }
  if (action.type === 'request') {
    const slot = state.slots.find((s) => s.id === action.slotId)
    if (active || !slot) return state
    const path = describePath(state, slot)
    if (path.blocked.length || path.request?.status === 'rejected') return state
    return {
      ...state,
      nextId: state.nextId + 1,
      requests: [
        ...state.requests,
        {
          id: state.nextId,
          slotId: slot.id,
          status: 'active',
          replies: Object.fromEntries(path.needed.map((p) => [p.id, 'pending' as const])),
        },
      ],
    }
  }
  if (!active || active.id !== action.requestId) return state
  if (action.type === 'cancel')
    return {
      ...state,
      requests: state.requests.map((r) => (r.id === active.id ? { ...r, status: 'canceled' } : r)),
    }
  if (action.type === 'confirm') {
    const slot = state.slots.find((s) => s.id === active.slotId)!
    if (!describePath(state, slot).ready) return state
    return {
      ...state,
      confirmed: slot.id,
      requests: state.requests.map((r) => (r.id === active.id ? { ...r, status: 'confirmed' } : r)),
    }
  }
  if (active.replies[action.personId] !== 'pending') return state
  return {
    ...state,
    requests: state.requests.map((r) =>
      r.id === active.id
        ? {
            ...r,
            replies: { ...r.replies, [action.personId]: action.value },
            status: action.value === 'no' ? 'rejected' : 'active',
          }
        : r,
    ),
  }
}

export function createConstraintExample(monday: string): ConstraintState {
  const people: Person[] = [
    { id: 'host', name: '지훈', required: true },
    { id: 'sujin', name: '수진', required: true },
    { id: 'minsu', name: '민수', required: true },
    { id: 'seoyeon', name: '서연', required: true },
    { id: 'doyun', name: '도윤', required: false },
    { id: 'yuna', name: '유나', required: false },
  ]
  const make = (
    id: string,
    offset: number,
    hour: number,
    overrides: Record<string, Answer>,
  ): RecoverySlot => {
    const start = new Date(`${monday}T00:00:00+09:00`)
    start.setTime(start.getTime() + (offset * 24 + hour) * 3600000)
    return {
      id,
      start: start.toISOString(),
      end: new Date(start.getTime() + 3600000).toISOString(),
      answers: {
        ...Object.fromEntries(
          people.map((p) => [p.id, { kind: 'available' as const, conflicts: [] }]),
        ),
        ...overrides,
      },
    }
  }
  return {
    people,
    slots: [
      make('tuesday', 1, 14, { minsu: { kind: 'adjustable', conflicts: ['기존 팀 미팅'] } }),
      make('thursday', 3, 16, {
        sujin: { kind: 'adjustable', conflicts: ['프로젝트 체크인'] },
        seoyeon: { kind: 'adjustable', conflicts: ['운영 미팅'] },
      }),
      make('friday', 4, 10, { sujin: { kind: 'unavailable', conflicts: ['외근 · 변경 불가'] } }),
    ],
    requests: [],
    nextId: 1,
    confirmed: null,
    ended: false,
  }
}
