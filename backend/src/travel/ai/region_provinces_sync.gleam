//// Geriye dönük: iller üretimi `region_hierarchy_sync` içinde.

import backend/context.{type Context}
import gleam/option.{type Option}
import travel/ai/region_hierarchy_sync

pub type GenOutcome {
  GenOutcome(job_id: String, created: Int, skipped: Int)
}

pub fn generate_and_insert_provinces(
  ctx: Context,
  country_name: String,
  country_id_opt: Option(String),
) -> Result(GenOutcome, String) {
  case
    region_hierarchy_sync.generate_and_insert_provinces(ctx, country_name, country_id_opt)
  {
    Ok(out) ->
      Ok(GenOutcome(
        job_id: out.job_id,
        created: out.created,
        skipped: out.skipped,
      ))
    Error(e) -> Error(e)
  }
}
