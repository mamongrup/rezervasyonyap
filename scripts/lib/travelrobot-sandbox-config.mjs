import { loadBackendEnvFile } from './load-backend-env.mjs'
import { loadTravelrobotConfigFromDb } from './listing-api-providers-db.mjs'

/** KPlus sertifikasyon sandbox — canlı bookingagora.com ile karıştırılmamalı. */
export const KPLUS_SANDBOX_BASE_URL = 'http://sandbox.kplus.com.tr/kplus/v0'

export function isSandboxBaseUrl(url) {
  return /sandbox\.kplus\.com\.tr/i.test(String(url ?? ''))
}

function isSandboxChannelCode(code) {
  return /^Test_/i.test(String(code ?? '').trim())
}

/**
 * Sandbox Test_* kanalı — CLI → backend.env → panel DB (Test_* kanalı).
 * getArg: (flag) => value | undefined
 */
export function resolveSandboxChannelCreds(getArg = () => undefined) {
  loadBackendEnvFile()

  let channelCode =
    getArg('--channel-code') ??
    process.env.TRAVELROBOT_SANDBOX_CHANNEL_CODE ??
    ''
  let channelPassword =
    getArg('--channel-password') ??
    process.env.TRAVELROBOT_SANDBOX_CHANNEL_PASSWORD ??
    ''

  if (!channelCode || !channelPassword) {
    const liveCode = String(process.env.TRAVELROBOT_CHANNEL_CODE ?? '').trim()
    const livePass = String(process.env.TRAVELROBOT_CHANNEL_PASSWORD ?? '').trim()
    if (isSandboxChannelCode(liveCode) && livePass) {
      channelCode = liveCode
      channelPassword = livePass
    }
  }

  return { channelCode: String(channelCode).trim(), channelPassword: String(channelPassword) }
}

export async function resolveSandboxChannelCredsAsync(getArg = () => undefined) {
  let creds = resolveSandboxChannelCreds(getArg)
  if (creds.channelCode && creds.channelPassword) return creds

  try {
    const dbCfg = await loadTravelrobotConfigFromDb()
    if (isSandboxChannelCode(dbCfg.channelCode) && dbCfg.channelPassword) {
      return {
        channelCode: String(dbCfg.channelCode).trim(),
        channelPassword: String(dbCfg.channelPassword),
      }
    }
  } catch {
    /* DB yok veya panel kaydı eksik */
  }
  return creds
}

export function buildSandboxConfig(getArg = () => undefined, baseCfg = {}) {
  const { channelCode, channelPassword } = resolveSandboxChannelCreds(getArg)
  if (!channelCode || !channelPassword) {
    throw new Error(sandboxCredsMissingMessage())
  }
  return {
    ...baseCfg,
    enabled: true,
    baseUrl: KPLUS_SANDBOX_BASE_URL,
    channelCode,
    channelPassword,
  }
}

export async function buildSandboxConfigAsync(getArg = () => undefined, baseCfg = {}) {
  const { channelCode, channelPassword } = await resolveSandboxChannelCredsAsync(getArg)
  if (!channelCode || !channelPassword) {
    throw new Error(sandboxCredsMissingMessage())
  }
  return {
    ...baseCfg,
    enabled: true,
    baseUrl: KPLUS_SANDBOX_BASE_URL,
    channelCode,
    channelPassword,
  }
}

function sandboxCredsMissingMessage() {
  return (
    'Sandbox test kanalı gerekli.\n' +
    '  1) /etc/rezervasyonyap/backend.env içine ekleyin:\n' +
    '       TRAVELROBOT_SANDBOX_CHANNEL_CODE=Test_...\n' +
    '       TRAVELROBOT_SANDBOX_CHANNEL_PASSWORD=...\n' +
    '  2) veya panelde Travelrobot kanalı Test_* ise DB otomatik kullanılır.\n' +
    '  3) veya: --channel-code Test_... --channel-password ...\n' +
    '  4) veya: set -a && source /etc/rezervasyonyap/backend.env && set +a'
  )
}
