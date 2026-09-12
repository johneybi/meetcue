import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRecoveryState, recoveryReducer } from '../src/domain/coordinationRecovery.ts'

test('canceling a pending check permits another candidate without treating silence as refusal', () => {
  let state = recoveryReducer(createRecoveryState(), { type: 'request', candidateId: 'tuesday' })
  state = recoveryReducer(state, { type: 'cancel', candidateId: 'tuesday' })
  assert.equal(state.statuses.tuesday, 'unasked')
  assert.equal(
    recoveryReducer(state, { type: 'reply', candidateId: 'tuesday', reply: 'accepted' }),
    state,
  )
  state = recoveryReducer(state, { type: 'request', candidateId: 'thursday' })
  assert.equal(state.statuses.thursday, 'pending')
})

test('unknown, pending and declined answers cannot authorize confirmation', () => {
  let state = createRecoveryState()
  assert.equal(recoveryReducer(state, { type: 'confirm', candidateId: 'tuesday' }), state)
  assert.equal(
    recoveryReducer(state, { type: 'reply', candidateId: 'tuesday', reply: 'accepted' }),
    state,
  )
  state = recoveryReducer(state, { type: 'request', candidateId: 'tuesday' })
  assert.equal(recoveryReducer(state, { type: 'confirm', candidateId: 'tuesday' }), state)
  assert.equal(recoveryReducer(state, { type: 'request', candidateId: 'thursday' }), state)
  state = recoveryReducer(state, { type: 'reply', candidateId: 'tuesday', reply: 'declined' })
  assert.equal(recoveryReducer(state, { type: 'confirm', candidateId: 'tuesday' }), state)
})

test('refusal is preserved while another candidate receives explicit agreement', () => {
  let state = createRecoveryState()
  state = recoveryReducer(state, { type: 'request', candidateId: 'tuesday' })
  state = recoveryReducer(state, { type: 'reply', candidateId: 'tuesday', reply: 'declined' })
  state = recoveryReducer(state, { type: 'request', candidateId: 'thursday' })
  state = recoveryReducer(state, { type: 'reply', candidateId: 'thursday', reply: 'accepted' })
  assert.equal(state.confirmed, null)
  assert.equal(state.statuses.tuesday, 'declined')
  state = recoveryReducer(state, { type: 'confirm', candidateId: 'thursday' })
  assert.equal(state.confirmed, 'thursday')
  assert.equal(
    recoveryReducer(state, { type: 'reply', candidateId: 'thursday', reply: 'declined' }),
    state,
  )
})

test('neither two refusals nor duplicate requests reset previous answers', () => {
  let state = createRecoveryState()
  for (const candidateId of ['tuesday', 'thursday'] as const) {
    state = recoveryReducer(state, { type: 'request', candidateId })
    assert.equal(recoveryReducer(state, { type: 'request', candidateId }), state)
    state = recoveryReducer(state, { type: 'reply', candidateId, reply: 'declined' })
    assert.equal(recoveryReducer(state, { type: 'request', candidateId }), state)
  }
  assert.deepEqual(state, {
    statuses: { tuesday: 'declined', thursday: 'declined' },
    confirmed: null,
  })
})
