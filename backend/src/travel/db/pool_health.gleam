//// Birincil + yedek havuzları periyodik pingler; kopuk bağlantıları loglar.

import gleam/dynamic/decode
import gleam/erlang/process
import gleam/io
import pog
import travel/db/pog_errors
import travel/db/resilient_pog as db_exec

fn ping_label(label: String, conn: pog.Connection) -> Nil {
  let row = {
    use n <- decode.field(0, decode.int)
    decode.success(n)
  }
  case
    pog.query("select 1::int")
    |> pog.returning(row)
    |> db_exec.execute(conn)
  {
    Ok(ret) ->
      case ret.rows {
        [1] -> Nil
        _ -> {
          let _ = io.println("[db.health] " <> label <> " ping unexpected result")
          Nil
        }
      }
    Error(e) -> {
      let _ =
        io.println(
          "[db.health] "
            <> label
            <> " ping failed: "
            <> pog_errors.query_error_to_string(e),
        )
      Nil
    }
  }
}

fn health_loop(
  primary: pog.Connection,
  reserve: pog.Connection,
  interval_ms: Int,
) -> Nil {
  ping_label("primary", primary)
  ping_label("reserve", reserve)
  process.sleep(interval_ms)
  health_loop(primary, reserve, interval_ms)
}

pub fn start(
  primary: pog.Connection,
  reserve: pog.Connection,
  interval_ms: Int,
) -> Nil {
  let _ =
    process.spawn(fn() { health_loop(primary, reserve, interval_ms) })
  Nil
}
