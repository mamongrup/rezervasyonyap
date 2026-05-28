//// Partner API — kurum başına dakikalık istek limiti (Postgres sayacı).

import backend/context.{type Context}
import gleam/dynamic/decode
import pog

const max_requests_per_minute: Int = 300

/// İsteği sayar; limit aşıldıysa kalan saniyeyi döner.
pub fn check_and_record(ctx: Context, organization_id: String) -> Result(Nil, Int) {
  case
    pog.query(
      "with bucket as ( "
      <> "  select date_trunc('minute', now()) as b "
      <> "), upsert as ( "
      <> "  insert into agent_api_usage (organization_id, minute_bucket, request_count) "
      <> "  select $1::uuid, b.b, 1 from bucket b "
      <> "  on conflict (organization_id, minute_bucket) do update "
      <> "  set request_count = agent_api_usage.request_count + 1 "
      <> "  returning request_count "
      <> ") "
      <> "select request_count::int from upsert",
    )
    |> pog.parameter(pog.text(organization_id))
    |> pog.returning({
      use n <- decode.field(0, decode.int)
      decode.success(n)
    })
    |> pog.execute(ctx.db)
  {
    Error(_) -> Ok(Nil)
    Ok(ret) ->
      case ret.rows {
        [cnt] ->
          case cnt > max_requests_per_minute {
                True -> {
                  let _ =
                    pog.query("select agent_api_usage_purge_old()")
                    |> pog.execute(ctx.db)
                  Error(60)
                }
                False -> {
                  let _ =
                    pog.query("select agent_api_usage_purge_old()")
                    |> pog.execute(ctx.db)
                  Ok(Nil)
                }
              }
        _ -> Ok(Nil)
      }
  }
}
