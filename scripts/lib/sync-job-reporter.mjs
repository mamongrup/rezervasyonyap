/**
 * İlan API senkron işleri için ilerleme raporlama yardımcısı.
 * Script --job-id <uuid> ile başlatılırsa her adımda backend'e progress POST eder.
 *
 * Kullanım:
 *   const reporter = createJobReporter(process.env.SYNC_JOB_ID)
 *   await reporter.start(total)
 *   await reporter.step('mesaj', current, total)
 *   await reporter.done('Bitti mesajı')
 *   await reporter.fail('Hata mesajı')
 */

const INTERNAL_API = process.env.INTERNAL_API_ORIGIN || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080'

async function postProgress(payload) {
  try {
    const res = await fetch(`${INTERNAL_API}/api/v1/admin/sync/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn(`[sync-reporter] progress PUT ${res.status}: ${text.slice(0, 100)}`)
    }
  } catch (e) {
    // İlerleme raporlama hatası import'u durdurmamalı
    console.warn(`[sync-reporter] progress raporu gönderilemedi: ${e?.message || e}`)
  }
}

export function createJobReporter(jobId) {
  if (!jobId || !jobId.trim()) {
    // Sessiz noop — job-id verilmemişse hiçbir şey yapmaz
    return {
      start: async () => {},
      step: async (msg) => {
        if (msg) process.stdout.write(msg + '\n')
      },
      log: async (msg) => {
        if (msg) process.stdout.write(msg + '\n')
      },
      done: async (msg) => {
        if (msg) console.log(msg)
      },
      fail: async (msg) => {
        if (msg) console.error(msg)
      },
      jobId: null,
    }
  }

  const id = jobId.trim()
  let _total = 0

  return {
    jobId: id,

    async start(total = 0) {
      _total = total
      await postProgress({ job_id: id, status: 'running', total, progress: 0 })
    },

    async step(msg, current, total) {
      if (total != null) _total = total
      const cur = current ?? 0
      if (msg) process.stdout.write(msg + '\n')
      await postProgress({
        job_id: id,
        status: 'running',
        progress: cur,
        total: _total,
        log_line: msg ? String(msg).slice(0, 200) : '',
      })
    },

    async log(msg) {
      if (msg) process.stdout.write(msg + '\n')
      await postProgress({
        job_id: id,
        status: 'running',
        log_line: String(msg || '').slice(0, 200),
      })
    },

    async done(msg) {
      if (msg) console.log(msg)
      await postProgress({
        job_id: id,
        status: 'done',
        log_line: String(msg || 'Tamamlandı.').slice(0, 200),
      })
    },

    async fail(msg) {
      const errText = String(msg || 'Bilinmeyen hata').slice(0, 500)
      console.error(errText)
      await postProgress({
        job_id: id,
        status: 'error',
        error_text: errText,
        log_line: errText.slice(0, 200),
      })
    },
  }
}
