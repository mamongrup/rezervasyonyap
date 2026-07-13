//// `ai_jobs` kuyruğunu DeepSeek ile senkron işler (worker süreci yok; API isteği içinde tamamlanır).

import backend/context.{type Context}
import gleam/dynamic/decode
import gleam/float
import gleam/json
import gleam/string
import pog
import travel/db/resilient_pog as db_exec
import travel/ai/ai_config
import travel/ai/deepseek_chat

fn start_row() -> decode.Decoder(#(String, String)) {
  use ij <- decode.field(0, decode.string)
  use pc <- decode.field(1, decode.string)
  decode.success(#(ij, pc))
}

fn prof_row() -> decode.Decoder(#(String, String, Bool)) {
  use sp <- decode.field(0, decode.string)
  use tp <- decode.field(1, decode.string)
  use ia <- decode.field(2, decode.bool)
  decode.success(#(sp, tp, ia))
}

fn parse_temperature(s: String) -> Float {
  case float.parse(string.trim(s)) {
    Ok(f) ->
      case f >. 2.0 || f <. 0.0 {
        True -> 0.7
        False -> f
      }
    Error(_) -> 0.7
  }
}

fn fail_job(
  conn: pog.Connection,
  job_id: String,
  err_msg: String,
) -> Result(Nil, String) {
  let e = string.slice(err_msg, 0, 2000)
  case
    pog.query(
      "update ai_jobs set status = 'failed', error = $2, finished_at = now() where id = $1::uuid",
    )
    |> pog.parameter(pog.text(string.trim(job_id)))
    |> pog.parameter(pog.text(e))
    |> pog.execute(conn)
  {
    Error(_) -> Error("ai_job_fail_update_failed")
    Ok(_) -> Ok(Nil)
  }
}

/// İşi `queued` ise `running` yapar, DeepSeek çağrısı yapar, sonucu yazar.
pub fn run_ai_job(ctx: Context, job_id: String) -> Result(Nil, String) {
  let jid = string.trim(job_id)
  case jid == "" {
    True -> Error("job_id_required")
    False ->
      case
        pog.query(
          "update ai_jobs j set status = 'running' where j.id = $1::uuid and j.status = 'queued' and not exists (select 1 from ai_agents a join ai_agent_runtime_state r on r.agent_code=a.code where a.feature_profile_code=j.profile_code and r.circuit_open_until>now()) and (select coalesce(sum(estimated_cost_usd),0) from ai_jobs where created_at>=current_date)<(select daily_cost_limit_usd from ai_operations_policy where singleton) and (select count(*) from ai_jobs where created_at>now()-interval '1 hour')<(select max_jobs_per_hour from ai_operations_policy where singleton) returning j.input_json::text, j.profile_code",
        )
        |> pog.parameter(pog.text(jid))
        |> pog.returning(start_row())
        |> db_exec.execute(ctx.db)
      {
        Error(_) -> Error("ai_job_lock_failed")
        Ok(ret) ->
          case ret.rows {
            [] -> Error("job_not_queued")
            [#(input_json_text, profile_code)] -> {
              case
                pog.query(
                  "select coalesce(p.system_prompt,''), p.temperature::text, pr.is_active from ai_feature_profiles p inner join ai_providers pr on pr.id = p.provider_id where p.code = $1 limit 1",
                )
                |> pog.parameter(pog.text(string.trim(profile_code)))
                |> pog.returning(prof_row())
                |> db_exec.execute(ctx.db)
              {
                Error(_) -> {
                  let _ = fail_job(ctx.db, jid, "profile_load_failed")
                  Error("profile_load_failed")
                }
                Ok(pret) ->
                  case pret.rows {
                    [] -> {
                      let _ = fail_job(ctx.db, jid, "unknown_profile")
                      Error("unknown_profile")
                    }
                    [#(sys_prompt, temp_str, is_active)] -> {
                      case is_active {
                        False -> {
                          let _ =
                            fail_job(
                              ctx.db,
                              jid,
                              "ai_provider_inactive_enable_in_ai_providers",
                            )
                          Error("provider_inactive")
                        }
                        True -> {
                          let temp = parse_temperature(temp_str)
                          let user_msg =
                            "The following JSON is the queued job input. Follow the profile system prompt; prefer structured output when possible. If the JSON includes a top-level string field `locale` (tr, en, de, ru, zh, fr), write the entire response in that language; otherwise use Turkish.\n\n"
                            <> input_json_text
                          let cfg = ai_config.load(ctx.db)
                          let timeout_ms =
                            ai_config.profile_upstream_timeout_ms(
                              ctx.db,
                              profile_code,
                            )
                          case
                            deepseek_chat.chat_completion_single_with_config(
                              cfg,
                              sys_prompt,
                              user_msg,
                              temp,
                              timeout_ms,
                            )
                          {
                            Ok(reply) -> {
                              let out_obj =
                                json.object([
                                  #("text", json.string(reply)),
                                  #(
                                    "profile_code",
                                    json.string(string.trim(profile_code)),
                                  ),
                                ])
                              let out_s = json.to_string(out_obj)
                              case
                                pog.query(
                                  "update ai_jobs set status = 'succeeded', output_json = $2::jsonb, error = null, finished_at = now() where id = $1::uuid",
                                )
                                |> pog.parameter(pog.text(jid))
                                |> pog.parameter(pog.text(out_s))
                                |> db_exec.execute(ctx.db)
                              {
                                Error(_) -> Error("ai_job_success_update_failed")
                                Ok(_) -> Ok(Nil)
                              }
                            }
                            Error(e) -> {
                              let _ = fail_job(ctx.db, jid, e)
                              Ok(Nil)
                            }
                          }
                        }
                      }
                    }
                    _ -> Error("unexpected_profile_rows")
                  }
              }
            }
            _ -> Error("unexpected_job_rows")
          }
      }
  }
}
