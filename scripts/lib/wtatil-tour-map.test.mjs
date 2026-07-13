import assert from 'node:assert/strict'
import test from 'node:test'

import { decodeWtatilContentText, parseWtatilItinerary } from './wtatil-tour-map.mjs'

test('decodes repeated and semicolonless HTML entities', () => {
  assert.equal(decodeWtatilContentText('Sharm &amp;nbsp; El Sheikh'), 'Sharm   El Sheikh')
  assert.equal(decodeWtatilContentText('Roma &nbsp DÃ¶nÃ¼ÅŸ'), 'Roma   DÃ¶nÃ¼ÅŸ')
})

test('does not persist nbsp remnants in itinerary titles and descriptions', () => {
  const itinerary = parseWtatilItinerary(
    '1. G\u00fcn Istanbul &amp;nbsp; Sharm<br>Ucus ve otele transfer.<br>2. G\u00fcn Sharm &nbsp;<br>Serbest zaman.',
  )
  const serialized = JSON.stringify(itinerary)

  assert.equal(itinerary.length, 2)
  assert.doesNotMatch(serialized, /&(?:amp;)?nbsp;?/i)
})
