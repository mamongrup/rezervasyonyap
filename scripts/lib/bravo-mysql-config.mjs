/**
 * Bravo / Excalibur MySQL bağlantısı — ortam değişkenleri veya CLI.
 *
 *   MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 *   --mysql-database rezervasyonyapco_excalibur
 */

export function mysqlConfigFromArgv(argv = process.argv) {
  const args = argv.slice(2)
  const dbIdx = args.indexOf('--mysql-database')
  const database =
    dbIdx >= 0
      ? String(args[dbIdx + 1] || '').trim()
      : (process.env.MYSQL_DATABASE || 'rezervasyonyap').trim()

  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD ?? '',
    database: database || 'rezervasyonyap',
  }
}
