import assert from 'node:assert/strict'
import test from 'node:test'
import { createAccountScenarioMeeting } from '../src/domain/accountScenarios.ts'

test('creates account scenarios without changing the shared prototype contract', () => {
  const onboarding = createAccountScenarioMeeting('onboarding')
  const confirmed = createAccountScenarioMeeting('quarterly-goals')

  assert.equal(onboarding.title, '온보딩 개선안 논의')
  assert.equal(onboarding.status, 'collecting')
  assert.equal(confirmed.title, '3분기 목표 점검')
  assert.equal(confirmed.status, 'confirmed')
  assert.ok(confirmed.confirmedCandidateId)
  assert.equal(onboarding.participants.length, confirmed.participants.length)
})
