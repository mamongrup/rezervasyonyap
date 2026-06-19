//// Ticari AI işi tamamlandığında yan etkiler: plan kaydı, onaylı öneri.

import gleam/dynamic/decode
import gleam/json
import gleam/option.{type Option}
import gleam/string
import pog
import travel/db/decode_helpers as row_dec

fn plan_json_from_llm(raw: String) -> String {
  let trimmed = string.trim(raw)
  case json.parse(trimmed, decode.dynamic) {
    Ok(_) -> trimmed
    Error(_) ->
      json.object([#("text", json.string(trimmed))])
      |> json.to_string
  }
}

fn extract_output_text(db: pog.Connection, job_id: String) -> Option(String) {
  case
    pog.query(
      "select coalesce(output_json->>'text', '') from ai_jobs where id = $1::uuid and status = 'succeeded'",
    )
    |> pog.parameter(pog.text(job_id))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(db)
  {
    Error(_) -> option.None
    Ok(ret) ->
      case ret.rows {
        [t] ->
          case string.trim(t) {
            "" -> option.None
            s -> option.Some(s)
          }
        _ -> option.None
      }
  }
}

fn insert_post_booking_plan(
  db: pog.Connection,
  reservation_id: String,
  plan_json: String,
) -> Nil {
  let rid = string.trim(reservation_id)
  case rid == "" {
    True -> Nil
    False ->
      case
        pog.query(
          "insert into ai_post_booking_plans (reservation_id, plan_json) select $1::uuid, $2::jsonb where not exists (select 1 from ai_post_booking_plans where reservation_id = $1::uuid) returning id::text",
        )
        |> pog.parameter(pog.text(rid))
        |> pog.parameter(pog.text(plan_json))
        |> pog.returning(row_dec.col0_string())
        |> pog.execute(db)
      {
        Error(_) -> Nil
        Ok(_) -> Nil
      }
  }
}

fn insert_commerce_recommendation(
  db: pog.Connection,
  agent_code: String,
  kind: String,
  target_key: String,
  title: String,
  reason: String,
  payload_json: String,
  job_id: String,
) -> Nil {
  case
    pog.query(
      "insert into ai_agent_recommendations (agent_code, ai_job_id, kind, target_key, title, reason, payload_json, status) select $1, $2::uuid, $3, $4, $5, $6, $7::jsonb, 'pending' where not exists (select 1 from ai_agent_recommendations where agent_code = $1 and kind = $3 and target_key = $4 and status in ('pending','approved','applied')) returning id::text",
    )
    |> pog.parameter(pog.text(agent_code))
    |> pog.parameter(pog.text(job_id))
    |> pog.parameter(pog.text(kind))
    |> pog.parameter(pog.text(target_key))
    |> pog.parameter(pog.text(title))
    |> pog.parameter(pog.text(reason))
    |> pog.parameter(pog.text(payload_json))
    |> pog.returning(row_dec.col0_string())
    |> pog.execute(db)
  {
    Error(_) -> Nil
    Ok(_) -> Nil
  }
}

/// Başarılı ticari iş için kalıcı kayıt / öneri oluşturur.
pub fn finalize_commerce_job(
  db: pog.Connection,
  job_id: String,
  profile_code: String,
  reservation_id: String,
) -> Nil {
  let pc = string.trim(profile_code)
  let rid = string.trim(reservation_id)
  case extract_output_text(db, job_id) {
    option.None -> Nil
    option.Some(raw) -> {
      let plan_s = plan_json_from_llm(raw)
      case pc {
        "post_booking_concierge" -> insert_post_booking_plan(db, rid, plan_s)
        "commerce_owner_agent" ->
          insert_commerce_recommendation(
            db,
            "commerce_owner_brief",
            "owner_notification_draft",
            rid,
            "İlan sahibi bildirim taslağı",
            "Ödeme onaylı rezervasyon için AI brifing taslağı",
            plan_s,
            job_id,
          )
        "commerce_accounting_agent" ->
          insert_commerce_recommendation(
            db,
            "commerce_accounting",
            "accounting_summary",
            rid,
            "Muhasebe özet taslağı",
            "Rezervasyon gelir/komisyon özeti",
            plan_s,
            job_id,
          )
        _ -> Nil
      }
    }
  }
}
