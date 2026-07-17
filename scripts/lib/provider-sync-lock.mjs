/**
 * Aynı provider için birden fazla senkron sürecinin (systemd timer + panel
 * "şimdi çalıştır" + saatlik import-scheduler) eş zamanlı çalışmasını önler.
 *
 * PostgreSQL session-level advisory lock kullanır: bağlantı kapanınca
 * (normal bitiş veya crash) kilit otomatik serbest kalır — ayrı bir temizlik
 * mekanizmasına gerek yok.
 *
 * Kullanım:
 *   const client = createPgClient()
 *   await client.connect()
 *   const lock = await acquireProviderSyncLock(client, 'wtatil')
 *   if (!lock.acquired) {
 *     console.warn(lock.message)
 *     await client.end()
 *     return
 *   }
 *   try { ... } finally { await lock.release() }
 */

export async function acquireProviderSyncLock(client, providerKey) {
  const key = `sync:${providerKey}`
  const r = await client.query(
    `select pg_try_advisory_lock(hashtext($1)) as ok`,
    [key],
  )
  const acquired = r.rows[0]?.ok === true
  return {
    acquired,
    message: acquired
      ? `[lock] ${key} alındı`
      : `[lock] ${key} zaten başka bir işlemde kilitli — bu çalıştırma atlanıyor (çakışan senkron önlendi)`,
    async release() {
      try {
        await client.query(`select pg_advisory_unlock(hashtext($1))`, [key])
      } catch {
        // bağlantı zaten kapanıyorsa yoksay
      }
    },
  }
}
