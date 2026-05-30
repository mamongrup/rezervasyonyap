/**
 * PostgreSQL — psql CLI (npm/pg modülü gerekmez).
 */
import { spawnSync } from 'node:child_process'
import { loadBackendEnvFile } from './load-backend-env.mjs'

function ensureEnv() {
  loadBackendEnvFile()
  if (!(process.env.DATABASE_URL || '').trim() && !process.env.PGPASSWORD && !process.env.PGHOST) {
    throw new Error('DATABASE_URL veya PG* yok — source /etc/rezervasyonyap/backend.env')
  }
}

function psqlArgs(extra) {
  const url = (process.env.DATABASE_URL || '').trim()
  if (url) return [url, '-v', 'ON_ERROR_STOP=1', ...extra]
  return [
    '-h', process.env.PGHOST || '127.0.0.1',
    '-p', String(process.env.PGPORT || 5432),
    '-U', process.env.PGUSER || 'postgres',
    '-d', process.env.PGDATABASE || 'travel',
    '-v', 'ON_ERROR_STOP=1',
    ...extra,
  ]
}

function runPsql(extra) {
  ensureEnv()
  const r = spawnSync('psql', psqlArgs(extra), {
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  if (r.error) throw r.error
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || 'psql hatası').trim())
  }
  return (r.stdout || '').trim()
}

export function testPgConnection() {
  const out = runPsql(['-t', '-A', '-c', "SELECT current_database() || '|' || current_user"])
  const [db, usr] = out.split('|')
  return { db, usr }
}

export function queryRows(sql) {
  const wrapped = `
    SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)::text
    FROM (${sql.replace(/;\s*$/, '')}) t`
  const out = runPsql(['-t', '-A', '-c', wrapped])
  return JSON.parse(out || '[]')
}

export function queryScalar(sql) {
  return runPsql(['-t', '-A', '-c', sql])
}

export function execSql(sql) {
  runPsql(['-c', sql])
}

export function sqlLiteral(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`
}

export function sqlJson(value) {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`
}
