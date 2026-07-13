import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildRouteHash,
  getAudience,
  getInviteTokenFromHash,
  parseRouteHash,
} from '../src/lib/appRoutes.ts'

test('parses host and participant hash aliases', () => {
  assert.equal(parseRouteHash('#/results/detail', false), 'host')
  assert.equal(parseRouteHash('#/invite/token-p-sujin/edit', false), 'invite-edit')
  assert.equal(parseRouteHash('#/invite/token-p-sujin/done', false), 'invite-done')
  assert.equal(getInviteTokenFromHash('#/invite/token-p-sujin/edit'), 'token-p-sujin')
})

test('keeps account routes behind the development route flag', () => {
  assert.equal(parseRouteHash('#/home', true), 'home')
  assert.equal(parseRouteHash('#/home', false), 'create')
  assert.equal(getAudience('home'), 'account')
  assert.equal(getAudience('invite'), 'participant')
  assert.equal(getAudience('host'), 'host')
})

test('builds participant hashes with identity and response state', () => {
  assert.equal(buildRouteHash('invite', 'token-p-sujin'), '#/invite/token-p-sujin')
  assert.equal(buildRouteHash('invite-edit', 'token-p-sujin'), '#/invite/token-p-sujin/edit')
  assert.equal(buildRouteHash('invite-done', 'token-p-sujin'), '#/invite/token-p-sujin/done')
  assert.equal(buildRouteHash('create'), '#/create')
})
