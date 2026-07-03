/**
 * Tatilsepeti otel import — checkpoint (kopmaya dayanıklı).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.join(__dirname, '..', '..')
const DEFAULT_STATE_PATH = path.join(REPO_ROOT, 'backups', 'tatilsepeti-hotel-import-state.json')
const DEFAULT_CATALOG_PATH = path.join(REPO_ROOT, 'backups', 'tatilsepeti-hotel-catalog.json')

export function defaultPaths() {
  return {
    statePath: process.env.TATILSEPETI_IMPORT_STATE || DEFAULT_STATE_PATH,
    catalogPath: process.env.TATILSEPETI_IMPORT_CATALOG || DEFAULT_CATALOG_PATH,
  }
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

export function loadState(statePath = defaultPaths().statePath) {
  if (!fs.existsSync(statePath)) {
    return {
      version: 1,
      nextIndex: 0,
      batchSize: 10000,
      stats: { created: 0, updated: 0, failed: 0, skipped: 0, batchesCompleted: 0 },
      lastHotelId: null,
      lastBatchCompletedAt: null,
      startedAt: null,
      updatedAt: null,
    }
  }
  return JSON.parse(fs.readFileSync(statePath, 'utf8'))
}

export function saveState(state, statePath = defaultPaths().statePath) {
  ensureDir(statePath)
  state.updatedAt = new Date().toISOString()
  const tmp = `${statePath}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2))
  fs.renameSync(tmp, statePath)
}

export function loadCatalog(catalogPath = defaultPaths().catalogPath) {
  if (!fs.existsSync(catalogPath)) return null
  return JSON.parse(fs.readFileSync(catalogPath, 'utf8'))
}

export function saveCatalog(catalog, catalogPath = defaultPaths().catalogPath) {
  ensureDir(catalogPath)
  const tmp = `${catalogPath}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(catalog, null, 2))
  fs.renameSync(tmp, catalogPath)
}

export function markBatchComplete(state, nextIndex, batchNo) {
  state.nextIndex = nextIndex
  state.stats.batchesCompleted = batchNo
  state.lastBatchCompletedAt = new Date().toISOString()
  return state
}
