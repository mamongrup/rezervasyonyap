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
 'autopilot',coalesce((
   select jsonb_build_object(
     'enabled',enabled,
     'discovery_batch_size',discovery_batch_size,
     'max_open_work_items',max_open_work_items,
     'auto_apply_verified_content',auto_apply_verified_content,
     'last_tick_at',last_tick_at,
     'last_result',last_result_json
   )
   from ai_autopilot_policy where singleton
 ),'{}'::jsonb),
 'agents',(select coalesce(jsonb_agg(to_jsonb(h) order by h.org_role,h.display_name),'[]'::jsonb) from ai_agent_health h),
 'supervisor',jsonb_build_object(
   'open_incidents',(select count(*) from ai_operations_incidents where status='open'),
   'critical_incidents',(select count(*) from ai_operations_incidents where status='open' and severity='critical'),
   'degraded_agents',(select count(*) from ai_agent_runtime_state where health_status in ('degraded','half_open','quarantined')),
   'quarantined_agents',(select count(*) from ai_agent_runtime_state where health_status='quarantined'),
   'digest',coalesce((select summary_json from ai_executive_digests order by digest_date desc limit 1),'{}'::jsonb),
   'requires_attention',coalesce((select requires_attention from ai_executive_digests order by digest_date desc limit 1),false)
 ),
 'incidents',(select coalesce(jsonb_agg(to_jsonb(i) order by i.last_seen_at desc),'[]'::jsonb) from (select id::text,agent_code,severity,status,title,last_error,occurrence_count,last_seen_at::text from ai_operations_incidents where status='open' order by last_seen_at desc limit 20) i),
 'recent_failures',(select coalesce(jsonb_agg(to_jsonb(f)),'[]'::jsonb) from (select w.id::text,w.entity_type,w.entity_id,w.current_stage,coalesce(w.error,'') error,w.updated_at::text from ai_work_items w where w.status='failed' order by w.updated_at desc limit 10) f),
 'generated_at',now()::text
)::text"
