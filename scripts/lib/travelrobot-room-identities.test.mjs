import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildTravelrobotHotelRoomRows } from './travelrobot-hotel-extras.mjs'
import { upsertTravelrobotHotelRoomsWithExtras } from './travelrobot-hotel-extras-db.mjs'

test('price refresh preserves an existing room used by reservations', async () => {
  const hotel = { CheckInDate: '2026-11-01', CheckOutDate: '2026-11-02', Rooms: [{ RoomAlternatives: [{ RoomName: 'Economy Twin', TotalAmount: 1000, CurrencyCode: 'TRY', BoardType: 'BB' }] }] }
  const room = buildTravelrobotHotelRoomRows(hotel)[0]
  const queries = []
  const pg = { query: async (sql, params) => {
    queries.push(sql)
    if (sql.startsWith('SELECT')) return { rows: [{ id: 'stable-room', name: room.name, capacity: room.capacity, board_type: room.boardType }] }
    assert.ok(sql.startsWith('UPDATE hotel_rooms'))
    assert.equal(params[0], 'stable-room')
    return { rows: [{ id: 'stable-room' }] }
  } }
  const result = await upsertTravelrobotHotelRoomsWithExtras(pg, 'hotel', hotel)
  assert.equal([...result.roomIdsByKey.values()][0].id, 'stable-room')
  assert.ok(queries.every((sql) => !sql.includes('DELETE')))
})
