/** KPlus sertifikasyon sandbox — canlı bookingagora.com ile karıştırılmamalı. */
export const KPLUS_SANDBOX_BASE_URL = 'http://sandbox.kplus.com.tr/kplus/v0'

export function isSandboxBaseUrl(url) {
  return /sandbox\.kplus\.com\.tr/i.test(String(url ?? ''))
}

/**
 * Sandbox Test_* kanalı — env veya CLI.
 * getArg: (flag) => value | undefined
 */
export function resolveSandboxChannelCreds(getArg = () => undefined) {
  const channelCode =
    getArg('--channel-code') ?? process.env.TRAVELROBOT_SANDBOX_CHANNEL_CODE ?? ''
  const channelPassword =
    getArg('--channel-password') ?? process.env.TRAVELROBOT_SANDBOX_CHANNEL_PASSWORD ?? ''
  return { channelCode: String(channelCode).trim(), channelPassword: String(channelPassword) }
}

export function buildSandboxConfig(getArg = () => undefined, baseCfg = {}) {
  const { channelCode, channelPassword } = resolveSandboxChannelCreds(getArg)
  if (!channelCode || !channelPassword) {
    throw new Error(
      'Sandbox test kanalı gerekli: backend.env içine TRAVELROBOT_SANDBOX_CHANNEL_CODE ve ' +
        'TRAVELROBOT_SANDBOX_CHANNEL_PASSWORD ekleyin (KPlus Test_* kanalı) veya ' +
        '--channel-code / --channel-password verin.',
    )
  }
  return {
    ...baseCfg,
    enabled: true,
    baseUrl: KPLUS_SANDBOX_BASE_URL,
    channelCode,
    channelPassword,
  }
}
