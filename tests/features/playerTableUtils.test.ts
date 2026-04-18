import assert from 'node:assert/strict'
import test from 'node:test'
import {
  sortPlayers,
  summarizePlayers,
} from '@/features/players/lib/playerTableUtils'
import type { PlayerApi } from '@/types/api'

function makePlayer(overrides: Partial<PlayerApi>): PlayerApi {
  return {
    id: 1,
    name: 'Player',
    alias: null,
    currentRank: null,
    suggestedRank: null,
    rankReason: null,
    isActive: true,
    joinedAt: null,
    leftAt: null,
    generalLevel: null,
    professionKey: null,
    professionLevel: null,
    ...overrides,
  }
}

test('sortPlayers keeps ranked players first and sorts names within a rank', () => {
  const players = [
    makePlayer({ id: 1, name: 'Zed', currentRank: null }),
    makePlayer({ id: 2, name: 'Bruno', currentRank: 'R4' }),
    makePlayer({ id: 3, name: 'Alice', currentRank: 'R4' }),
    makePlayer({ id: 4, name: 'Charlie', currentRank: 'R2' }),
  ]

  const sorted = sortPlayers(players)

  assert.deepEqual(
    sorted.map((player) => player.name),
    ['Alice', 'Bruno', 'Charlie', 'Zed'],
  )
})

test('summarizePlayers computes counts, buckets, and filters in one pass', () => {
  const players = [
    makePlayer({ id: 1, name: 'Alpha', currentRank: 'R5', generalLevel: 30 }),
    makePlayer({ id: 2, name: 'Bravo', currentRank: null, generalLevel: null }),
    makePlayer({ id: 3, name: 'Charlie', currentRank: 'R3', generalLevel: 28 }),
    makePlayer({ id: 4, name: 'Delta', currentRank: 'R3', generalLevel: 28, isActive: false }),
  ]

  const summary = summarizePlayers(players, 'active', 'all', null)

  assert.equal(summary.filtered.length, 3)
  assert.equal(summary.activeCount, 3)
  assert.equal(summary.inactiveCount, 1)
  assert.equal(summary.unclassifiedCount, 1)
  assert.equal(summary.rankCounts.R5, 1)
  assert.equal(summary.rankCounts.R3, 1)
  assert.equal(summary.unfilledLevels, 1)
  assert.deepEqual(summary.sortedLevels, [
    { level: 30, count: 1 },
    { level: 28, count: 1 },
  ])
})

test('summarizePlayers honors rank and level filters together', () => {
  const players = [
    makePlayer({ id: 1, name: 'Alpha', currentRank: 'R4', generalLevel: 25 }),
    makePlayer({ id: 2, name: 'Bravo', currentRank: 'R4', generalLevel: 30 }),
    makePlayer({ id: 3, name: 'Charlie', currentRank: 'R2', generalLevel: 30 }),
  ]

  const summary = summarizePlayers(players, 'all', 'R4', 30)

  assert.deepEqual(summary.filtered.map((player) => player.name), ['Bravo'])
})
