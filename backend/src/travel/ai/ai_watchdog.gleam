//// Merkezi AI workflow watchdog: yarım işleri iyileştirir ve sıradaki işi çalıştırır.

import backend/context.{type Context}
import gleam/result
import gleam/string
import pog
import travel/ai/ai_job_run
import travel/db/decode_helpers as row_dec
import travel/db/resilient_pog as db_exec

/// Bir watchdog tick çalıştırır. İş bulunduysa aynı worker çağrısında AI job'u tamamlar.
pub fn worker_try_watchdog(ctx: Context) -> Result(Bool, String) {
  use _ <-
    result.try(
      pog.query("select ai_autopilot_tick()")
      |> pog.returning(row_dec.col0_string())
      |> db_exec.execute(ctx.db)
      |> result.map_error(fn(_) { "ai_autopilot_tick_failed" }),
    )

  case
    pog.query("select ai_watchdog_tick_job_id()")
    |> pog.returning(row_dec.col0_string())
    |> db_exec.execute(ctx.db)
  {
    Error(_) -> Error("ai_watchdog_tick_failed")
    Ok(ret) ->
      case ret.rows {
        [job_id] ->
          case string.trim(job_id) == "" {
            True -> Ok(False)
            False ->
              case ai_job_run.run_ai_job(ctx, job_id) {
                Ok(_) -> Ok(True)
                Error(e) -> Error(e)
              }
          }
        _ -> Error("ai_watchdog_unexpected_rows")
      }
  }
}
