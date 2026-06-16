/** SSH/nohup terminalinde anında görünen log (stdout buffer sorununu azaltır). */
export function cliLog(message) {
  const ts = new Date().toISOString().slice(11, 19)
  process.stdout.write(`[${ts}] ${message}\n`)
}

export async function cliLogAsync(message) {
  cliLog(message)
}
