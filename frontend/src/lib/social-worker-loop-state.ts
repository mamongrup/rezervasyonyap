import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'

export type WorkerLoopPhase =
  | 'idle'
  | 'running'
  | 'waiting'
  | 'rate_limited'
  | 'done'
  | 'stopped'
  | 'error'

export type WorkerLoopState = {
  running: boolean
  stopRequested: boolean
  phase: WorkerLoopPhase
  batch: number
  totalProcessed: number
  totalPosted: number
  totalFailed: number
  totalEnqueued: number
  message: string | null
  lastError: string | null
  sleepUntilMs: number
  startedAt: string | null
  finishedAt: string | null
  /** Panel polling — admin JWT süresi dolsa bile durum okunabilsin */
  pollToken: string | null
}

const CACHE_DIR = path.join(process.cwd(), '.next', 'cache', 'social-worker-loop')
const STATE_FILE = path.join(CACHE_DIR, 'state.json')
const STOP_FILE = path.join(CACHE_DIR, 'stop.requested')

export function defaultWorkerLoopState(): WorkerLoopState {
  return {
    running: false,
    stopRequested: false,
    phase: 'idle',
    batch: 0,
    totalProcessed: 0,
    totalPosted: 0,
    totalFailed: 0,
    totalEnqueued: 0,
    message: null,
    lastError: null,
    sleepUntilMs: 0,
    startedAt: null,
    finishedAt: null,
    pollToken: null,
  }
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true })
}

export async function readWorkerLoopState(): Promise<WorkerLoopState> {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<WorkerLoopState>
    return { ...defaultWorkerLoopState(), ...parsed }
  } catch {
    return defaultWorkerLoopState()
  }
}

export async function writeWorkerLoopState(state: WorkerLoopState): Promise<void> {
  await ensureDir()
  const tmp = `${STATE_FILE}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(state), 'utf8')
  await fs.rename(tmp, STATE_FILE)
}

export async function requestWorkerStop(): Promise<void> {
  await ensureDir()
  await fs.writeFile(STOP_FILE, new Date().toISOString(), 'utf8')
  const state = await readWorkerLoopState()
  if (state.running) {
    state.stopRequested = true
    state.message = 'Durdurma isteği alındı, worker güvenli noktada duracak…'
    await writeWorkerLoopState(state)
  }
}

export async function clearWorkerStop(): Promise<void> {
  await fs.rm(STOP_FILE, { force: true }).catch(() => undefined)
}

export async function shouldStopWorker(): Promise<boolean> {
  try {
    await fs.access(STOP_FILE)
    return true
  } catch {
    const state = await readWorkerLoopState()
    return state.stopRequested
  }
}

export function workerLoopSnapshot(state: WorkerLoopState) {
  const now = Date.now()
  const countdown = state.sleepUntilMs > now ? Math.ceil((state.sleepUntilMs - now) / 1000) : 0
  return { ...state, countdown }
}
