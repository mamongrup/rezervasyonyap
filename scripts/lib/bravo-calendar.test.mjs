import assert from 'node:assert/strict'
import test from 'node:test'
import { applyBravoTurnoverBoundaries } from './bravo-calendar.mjs'

function row(day, active) {
  return { day, active, price: '10000' }
}

test('opens half-day boundaries around a multi-day reservation', () => {
  const days = applyBravoTurnoverBoundaries([
    row('2026-08-09', 1),
    row('2026-08-10', 0),
    row('2026-08-11', 0),
    row('2026-08-12', 0),
    row('2026-08-13', 0),
    row('2026-08-14', 0),
    row('2026-08-15', 0),
    row('2026-08-16', 1),
  ])

  assert.deepEqual(
    days.map((d) => [d.day, d.amAvailable, d.pmAvailable]),
    [
      ['2026-08-09', true, true],
      ['2026-08-10', true, false],
      ['2026-08-11', false, false],
      ['2026-08-12', false, false],
      ['2026-08-13', false, false],
      ['2026-08-14', false, false],
      ['2026-08-15', false, true],
      ['2026-08-16', true, true],
    ],
  )
})

test('keeps a single blocked maintenance day fully closed', () => {
  const days = applyBravoTurnoverBoundaries([
    row('2026-08-09', 1),
    row('2026-08-10', 0),
    row('2026-08-11', 1),
  ])
  assert.deepEqual([days[1].amAvailable, days[1].pmAvailable], [false, false])
})

test('does not infer a boundary across missing calendar days', () => {
  const days = applyBravoTurnoverBoundaries([
    row('2026-08-09', 1),
    row('2026-08-11', 0),
    row('2026-08-12', 0),
    row('2026-08-13', 1),
  ])
  assert.deepEqual([days[1].amAvailable, days[2].pmAvailable], [false, false])
})
