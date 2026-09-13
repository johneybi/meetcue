import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createConstraintExample,
  constraintReducer as step,
  describePath,
} from '../src/domain/constraintRecovery.ts'
const fixture = () => createConstraintExample('2030-09-16')
test('paths derive required changes, hard constraints and unknowns from answers', () => {
  const s = fixture()
  assert.equal(describePath(s, s.slots[0]).changeCount, 1)
  assert.equal(describePath(s, s.slots[1]).needed.length, 2)
  assert.equal(describePath(s, s.slots[2]).blocked[0].id, 'sujin')
  s.slots[0].answers.minsu.conflicts.push('다른 일정')
  assert.equal(describePath(s, s.slots[0]).changeCount, 2)
  s.slots[0].answers.minsu = { kind: 'unknown', conflicts: [] }
  assert.equal(describePath(s, s.slots[0]).changes.length, 0)
  assert.equal(describePath(s, s.slots[0]).unknown.length, 1)
  s.slots[0].answers.minsu = { kind: 'available', conflicts: [] }
  s.slots[0].answers.yuna = { kind: 'unavailable', conflicts: [] }
  assert.equal(describePath(s, s.slots[0]).ready, true)
})
test('refusal preserves other candidates; every required consent must precede confirmation', () => {
  let s = step(fixture(), { type: 'request', slotId: 'tuesday' })
  s = step(s, { type: 'reply', requestId: 1, personId: 'minsu', value: 'no' })
  assert.equal(step(s, { type: 'request', slotId: 'tuesday' }), s)
  s = step(s, { type: 'request', slotId: 'thursday' })
  s = step(s, { type: 'reply', requestId: 2, personId: 'sujin', value: 'yes' })
  assert.equal(step(s, { type: 'confirm', requestId: 2 }), s)
  assert.equal(describePath(s, s.slots[1]).remaining[0].id, 'seoyeon')
  s = step(s, { type: 'reply', requestId: 2, personId: 'seoyeon', value: 'yes' })
  s = step(s, { type: 'confirm', requestId: 2 })
  assert.equal(s.confirmed, 'thursday')
  assert.equal(s.requests[0].replies.minsu, 'no')
  assert.equal(step(s, { type: 'end' }), s)
})
test('rejected or canceled requests ignore late responses and keep earlier consent as history', () => {
  let s = step(fixture(), { type: 'request', slotId: 'thursday' })
  s = step(s, { type: 'reply', requestId: 1, personId: 'sujin', value: 'yes' })
  s = step(s, { type: 'reply', requestId: 1, personId: 'seoyeon', value: 'no' })
  assert.equal(s.requests[0].replies.sujin, 'yes')
  assert.equal(step(s, { type: 'confirm', requestId: 1 }), s)
  assert.equal(step(s, { type: 'reply', requestId: 1, personId: 'seoyeon', value: 'yes' }), s)
  s = step(s, { type: 'request', slotId: 'tuesday' })
  s = step(s, { type: 'cancel', requestId: 2 })
  s = step(s, { type: 'request', slotId: 'tuesday' })
  assert.equal(step(s, { type: 'reply', requestId: 2, personId: 'minsu', value: 'yes' }), s)
  assert.equal(s.requests[2].replies.minsu, 'pending')
})
test('new time never inherits others answers and ending prevents further action', () => {
  let s = fixture()
  assert.equal(step(s, { type: 'request', slotId: 'friday' }), s)
  assert.equal(step(s, { type: 'add', start: 'invalid' }), s)
  s = step(s, { type: 'add', start: '2031-09-23T14:00:00+09:00' })
  const slot = s.slots.at(-1)!
  assert.equal(describePath(s, slot).unknown.length, 3)
  assert.equal(describePath(s, slot).ready, false)
  assert.equal(slot.answers.yuna.kind, 'unknown')
  assert.equal(step(s, { type: 'add', start: slot.start }), s)
  s = step(s, { type: 'request', slotId: slot.id })
  s = step(s, { type: 'end' })
  assert.equal(s.requests[0].status, 'canceled')
  assert.equal(step(s, { type: 'reply', requestId: 1, personId: 'sujin', value: 'yes' }), s)
})
