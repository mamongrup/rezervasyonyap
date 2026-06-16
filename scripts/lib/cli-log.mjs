/** SSH/plesk terminalinde anında görünen log (stdout buffer sorununu azaltır). */
export function cliLog(message) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`[${ts}] ${message}`)
}

export async function cliLogAsync(message) {
  cliLog(message)
}
