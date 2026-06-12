/**
 * Travelrobot uçuş import rotaları — scripts/config/travelrobot-flight-routes.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pickFlightRows } from './travelrobot-api.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROUTES_PATH = path.join(__dirname, '..', 'config', 'travelrobot-flight-routes.json')

export function loadTravelrobotFlightRoutes() {
  if (!fs.existsSync(ROUTES_PATH)) {
    throw new Error(`Rota dosyası yok: ${ROUTES_PATH}`)
  }
  const parsed = JSON.parse(fs.readFileSync(ROUTES_PATH, 'utf8').trim() || '[]')
  if (!Array.isArray(parsed) || !parsed.length) {
    throw new Error(`${ROUTES_PATH} boş veya geçersiz`)
  }
  return parsed.filter((r) => r?.origin && r?.destination)
}

export function flightRowFromRouteSearch(route, payload) {
  const rows = pickFlightRows(payload)
  const best = rows[0] ?? {}
  return {
    ...best,
    OriginCode: route.origin,
    DestinationCode: route.destination,
    origin: route.origin,
    destination: route.destination,
    label: route.label ?? `${route.origin} → ${route.destination}`,
    searchSnapshot: payload,
    offerCount: rows.length,
  }
}
