import backend/context.{type Context}
import gleam/http
import pog
import travel/db/decode_helpers as row_dec
import travel/db/resilient_pog as db_exec
import travel/identity/admin_gate
import wisp.{type Request, type Response}

pub fn overview(req: Request, ctx: Context) -> Response {
  use <- wisp.require_method(req, http.Get)
  case admin_gate.require_admin_users_read(req, ctx) {
    Error(r) -> r
    Ok(_) -> case pog.query(sql) |> pog.returning(row_dec.col0_string()) |> db_exec.execute(ctx.db) {
      Error(_) -> wisp.json_response("{\"error\":\"ai_control_center_failed\"}",500)
      Ok(ret) -> case ret.rows { [body] -> wisp.json_response(body,200) _ -> wisp.json_response("{\"error\":\"unexpected_rows\"}",500) }
    }
  }
}

const sql = "select jsonb_build_object(
 'counts',jsonb_build_object(
   'queued',(select count(*) from ai_work_items where status='queued'),
   'running',(select count(*) from ai_work_items where status='running'),
   'awaiting_approval',(select count(*) from ai_work_items where status='awaiting_approval'),
   'failed',(select count(*) from ai_work_items where status='failed'),
   'knowledge_sources',(select count(*) from ai_knowledge_sources where status='verified')
 ),
 'quality',jsonb_build_object(
   'average_7d',coalesce((select round(avg(score),2) from ai_quality_evaluations where created_at>now()-interval '7 days'),0),
   'failed_7d',(select count(*) from ai_quality_evaluations where passed=false and created_at>now()-interval '7 days')
 ),
 'cost',jsonb_build_object(
   'usd_30d',coalesce((select round(sum(estimated_cost_usd),4) from ai_jobs where created_at>now()-interval '30 days'),0),
   'tokens_30d',coalesce((select sum(estimated_input_tokens+estimated_output_tokens) from ai_jobs where created_at>now()-interval '30 days'),0)
 ),
 'agents',(select coalesce(jsonb_agg(to_jsonb(h) order by h.org_role,h.display_name),'[]'::jsonb) from ai_agent_health h),
 'recent_failures',(select coalesce(jsonb_agg(to_jsonb(f)),'[]'::jsonb) from (select w.id::text,w.entity_type,w.entity_id,w.current_stage,coalesce(w.error,'') error,w.updated_at::text from ai_work_items w where w.status='failed' order by w.updated_at desc limit 10) f),
 'generated_at',now()::text
)::text"
