import backend/config.{type AppConfig}
import backend/context.{type Context, Context}
import travel/booking/booking_http
import travel/booking/cart_coupon_http
import travel/currency/currency_http
import travel/banners/banner_http
import travel/i18n/i18n_http
import travel/i18n/localized_routes_http
import travel/agent/agent_http
import travel/agency/agency_http
import travel/staff/staff_http
import travel/supplier/supplier_http
import travel/supplier/supplier_application_http
import travel/booking/provizyon_http
import travel/identity/identity_http
import travel/integrations/netgsm_http
import travel/integrations/paratika_http
import travel/integrations/paytr_http
import travel/module_tree
import travel/payments/payment_settings_http
import travel/site/site_settings_http
import travel/marketing/marketing_http
import travel/messaging/messaging_catalog_http
import travel/navigation/navigation_http
import travel/engagement/engagement_http
import travel/engagement/social_proof_http
import travel/engagement/listing_reports_http
import travel/catalog/listing_perks_http
import travel/catalog/super_host_http
import travel/reviews/reviews_http
import travel/ical/ical_export_http
import travel/locations/locations_http
import travel/media/listing_images_http
import travel/media/media_http
import travel/blog/blog_http
import travel/catalog/collections_http
import travel/cms/cms_http
import travel/seo/seo_http
import travel/social/social_http
import travel/support/ticket_http
import travel/support/chat_http
import travel/support/helpdesk_catalog_http
import travel/integrations/integrations_http
import travel/ai/ai_http
import travel/verticals/verticals_http
import travel/catalog/catalog_http
import travel/workspace/workspace_http
import gleam/dynamic/decode
import gleam/http
import gleam/http/request
import gleam/http/response
import gleam/json
import gleam/list
import gleam/otp/actor
import pog
import gleam/result
import wisp.{type Request, type Response}

pub fn create_context(cfg: AppConfig) -> Result(Context, String) {
  case pog.start(cfg.database) {
    Ok(actor.Started(data: db, ..)) ->
      Ok(Context(db:, invoice_notify: cfg.invoice_notify))
    Error(_) -> Error("PostgreSQL connection pool failed to start")
  }
}

pub fn handle_request(req: Request, ctx: Context) -> Response {
  use <- wisp.log_request(req)
  let resp = dispatch(req, ctx)
  with_cors(resp, req)
}

fn dispatch(req: Request, ctx: Context) -> Response {
  case req.method, wisp.path_segments(req) {
    http.Options, _ -> cors_preflight_response()

    http.Get, [] -> home_json()

    http.Get, ["health"] -> health_check(ctx)

    // Public iCal export — 3. taraf takvimler (Airbnb/Booking/Apple/Google)
    // bu URL'i okur. Auth yok; gizlilik 64-karakterlik token ile sağlanır.
    http.Get, ["ical", "listing", slug] ->
      ical_export_http.serve_public_ics(req, ctx, slug)

    http.Get, ["api", "v1", "meta"] -> api_meta(req)

    http.Get, ["api", "v1", "modules"] -> modules_json()

    http.Get, ["api", "v1", "i18n", "locales"] -> i18n_http.list_locales(req, ctx)

    http.Post, ["api", "v1", "i18n", "locales"] -> i18n_http.create_locale(req, ctx)

    http.Get, ["api", "v1", "i18n", "bundle"] -> i18n_http.get_bundle(req, ctx)

    http.Post, ["api", "v1", "i18n", "translations"] ->
      i18n_http.upsert_translation(req, ctx)

    http.Get, ["api", "v1", "i18n", "namespaces"] ->
      i18n_http.list_namespaces(req, ctx)

    http.Post, ["api", "v1", "i18n", "namespaces"] ->
      i18n_http.create_namespace(req, ctx)

    http.Get, ["api", "v1", "i18n", "localized-routes"] ->
      localized_routes_http.list_routes(req, ctx)

    http.Post, ["api", "v1", "i18n", "localized-routes"] ->
      localized_routes_http.upsert_route(req, ctx)

    http.Patch, ["api", "v1", "i18n", "localized-routes", rid] ->
      localized_routes_http.patch_route(req, ctx, rid)

    http.Delete, ["api", "v1", "i18n", "localized-routes", rid] ->
      localized_routes_http.delete_route(req, ctx, rid)

    http.Get, ["api", "v1", "catalog", "product-categories"] ->
      catalog_http.list_product_categories(req, ctx)

    http.Get, ["api", "v1", "catalog", "manage-listings"] ->
      catalog_http.list_manage_listings(req, ctx)

    http.Post, ["api", "v1", "catalog", "manage-listings"] ->
      catalog_http.create_manage_listing(req, ctx)

    http.Get, ["api", "v1", "catalog", "listings", lid, "translations"] ->
      catalog_http.get_listing_translations(req, ctx, lid)

    http.Put, ["api", "v1", "catalog", "listings", lid, "translations"] ->
      catalog_http.put_listing_translations(req, ctx, lid)

    http.Get, ["api", "v1", "catalog", "public", "listings", lid, "contract"] ->
      catalog_http.get_public_listing_contract(req, ctx, lid)

    http.Get, ["api", "v1", "catalog", "public", "checkout-contracts"] ->
      catalog_http.get_public_checkout_contract_bundle(req, ctx)

    http.Get, ["api", "v1", "catalog", "manage", "category-contracts"] ->
      catalog_http.list_manage_category_contracts(req, ctx)

    http.Post, ["api", "v1", "catalog", "manage", "category-contracts"] ->
      catalog_http.create_manage_category_contract(req, ctx)

    http.Patch, ["api", "v1", "catalog", "manage-listings", lid, "contract"] ->
      catalog_http.patch_manage_listing_contract(req, ctx, lid)

    http.Get, ["api", "v1", "catalog", "listings", lid, "hotel-rooms"] ->
      catalog_http.list_manage_hotel_rooms(req, ctx, lid)

    http.Post, ["api", "v1", "catalog", "listings", lid, "hotel-rooms"] ->
      catalog_http.add_manage_hotel_room(req, ctx, lid)

    http.Delete, ["api", "v1", "catalog", "listings", lid, "hotel-rooms", rid] ->
      catalog_http.delete_manage_hotel_room(req, ctx, lid, rid)

    // ── Yemek Planları ────────────────────────────────────────────────
    http.Get, ["api", "v1", "catalog", "listings", lid, "meal-plans"] ->
      catalog_http.list_manage_meal_plans(req, ctx, lid)

    http.Post, ["api", "v1", "catalog", "listings", lid, "meal-plans"] ->
      catalog_http.create_manage_meal_plan(req, ctx, lid)

    http.Put, ["api", "v1", "catalog", "listings", lid, "meal-plans", pid] ->
      catalog_http.update_manage_meal_plan(req, ctx, lid, pid)

    http.Delete, ["api", "v1", "catalog", "listings", lid, "meal-plans", pid] ->
      catalog_http.delete_manage_meal_plan(req, ctx, lid, pid)

    http.Get, ["api", "v1", "catalog", "public", "listings", lid, "meal-plans"] ->
      catalog_http.list_public_meal_plans(req, ctx, lid)

    http.Get, ["api", "v1", "catalog", "public", "listings", lid, "price-rules"] ->
      catalog_http.list_public_listing_price_rules(req, ctx, lid)

    http.Get, ["api", "v1", "catalog", "public", "listings", lid, "accommodation-rules"] ->
      catalog_http.get_public_listing_accommodation_rules(req, ctx, lid)

    http.Get, ["api", "v1", "catalog", "public", "listings", lid, "availability-calendar"] ->
      catalog_http.list_public_listing_availability_calendar(req, ctx, lid)

    http.Get, ["api", "v1", "catalog", "public", "listings", lid, "vitrine"] ->
      catalog_http.get_public_listing_vitrine(req, ctx, lid)

    http.Get, ["api", "v1", "catalog", "public", "listings", lid, "images"] ->
      listing_images_http.list_public_images(req, ctx, lid)

    http.Get, ["api", "v1", "catalog", "listings", lid, "hotel-details"] ->
      catalog_http.get_manage_hotel_details(req, ctx, lid)

    http.Patch, ["api", "v1", "catalog", "listings", lid, "hotel-details"] ->
      catalog_http.patch_manage_hotel_details(req, ctx, lid)

    http.Get, ["api", "v1", "catalog", "listings", lid, "availability-calendar"] ->
      catalog_http.get_listing_availability_calendar(req, ctx, lid)

    http.Put, ["api", "v1", "catalog", "listings", lid, "availability-calendar"] ->
      catalog_http.put_listing_availability_calendar(req, ctx, lid)

    http.Get, ["api", "v1", "catalog", "listings", lid, "price-rules"] ->
      catalog_http.list_listing_price_rules(req, ctx, lid)

    http.Post, ["api", "v1", "catalog", "listings", lid, "price-rules"] ->
      catalog_http.create_listing_price_rule(req, ctx, lid)

    http.Delete, ["api", "v1", "catalog", "listings", lid, "price-rules", rid] ->
      catalog_http.delete_listing_price_rule(req, ctx, lid, rid)

    http.Patch, ["api", "v1", "catalog", "listings", lid, "basics"] ->
      catalog_http.patch_listing_basics(req, ctx, lid)

    http.Get, ["api", "v1", "catalog", "listings", lid, "owner-contact"] ->
      catalog_http.get_listing_owner_contact(req, ctx, lid)

    http.Put, ["api", "v1", "catalog", "listings", lid, "owner-contact"] ->
      catalog_http.put_listing_owner_contact(req, ctx, lid)

    http.Get, ["api", "v1", "catalog", "listings", lid, "meta"] ->
      catalog_http.get_listing_meta(req, ctx, lid)

    http.Put, ["api", "v1", "catalog", "listings", lid, "meta"] ->
      catalog_http.put_listing_meta(req, ctx, lid)

    http.Get, ["api", "v1", "catalog", "attribute-groups"] ->
      catalog_http.list_attribute_groups(req, ctx)

    http.Post, ["api", "v1", "catalog", "attribute-groups"] ->
      catalog_http.create_attribute_group(req, ctx)

    http.Delete, ["api", "v1", "catalog", "attribute-groups", gid] ->
      catalog_http.delete_attribute_group(req, ctx, gid)

    http.Get, ["api", "v1", "catalog", "attribute-groups", gid, "defs"] ->
      catalog_http.list_attribute_defs(req, ctx, gid)

    http.Post, ["api", "v1", "catalog", "attribute-groups", gid, "defs"] ->
      catalog_http.create_attribute_def(req, ctx, gid)

    http.Delete, ["api", "v1", "catalog", "attribute-defs", did] ->
      catalog_http.delete_attribute_def(req, ctx, did)

    http.Get, ["api", "v1", "catalog", "listings", lid, "attribute-values"] ->
      catalog_http.get_listing_attribute_values(req, ctx, lid)

    http.Put, ["api", "v1", "catalog", "listings", lid, "attribute-values"] ->
      catalog_http.put_listing_attribute_values(req, ctx, lid)

    http.Get, ["api", "v1", "public", "listings", lid, "attributes"] ->
      catalog_http.get_public_listing_attributes(req, ctx, lid)

    http.Get, ["api", "v1", "catalog", "price-line-items"] ->
      catalog_http.list_price_line_items(req, ctx)

    http.Post, ["api", "v1", "catalog", "price-line-items"] ->
      catalog_http.create_price_line_item(req, ctx)

    http.Delete, ["api", "v1", "catalog", "price-line-items", plid] ->
      catalog_http.delete_price_line_item(req, ctx, plid)

    http.Put, ["api", "v1", "catalog", "price-line-items", plid, "translations"] ->
      catalog_http.put_price_line_item_translations(req, ctx, plid)

    http.Get, ["api", "v1", "catalog", "listings", lid, "price-line-selections"] ->
      catalog_http.get_listing_price_line_selections(req, ctx, lid)

    http.Put, ["api", "v1", "catalog", "listings", lid, "price-line-selections"] ->
      catalog_http.put_listing_price_line_selections(req, ctx, lid)

    http.Get, ["api", "v1", "catalog", "accommodation-rules"] ->
      catalog_http.get_manage_category_accommodation_rules(req, ctx)

    http.Put, ["api", "v1", "catalog", "accommodation-rules"] ->
      catalog_http.put_manage_category_accommodation_rules(req, ctx)

    http.Put, ["api", "v1", "catalog", "attribute-defs", did, "translations"] ->
      catalog_http.put_attribute_def_translations(req, ctx, did)

    http.Put, ["api", "v1", "catalog", "attribute-groups", gid, "translations"] ->
      catalog_http.put_attribute_group_translations(req, ctx, gid)

    http.Get, ["api", "v1", "currency", "currencies"] ->
      currency_http.list_currencies(req, ctx)

    http.Post, ["api", "v1", "currency", "currencies"] ->
      currency_http.create_currency(req, ctx)

    http.Put, ["api", "v1", "currency", "currencies", "order"] ->
      currency_http.put_currencies_order(req, ctx)

    http.Post, ["api", "v1", "currency", "currencies", "order"] ->
      currency_http.post_currencies_order(req, ctx)

    http.Patch, ["api", "v1", "currency", "currencies", ccode] ->
      currency_http.patch_currency_active(req, ctx, ccode)

    http.Get, ["api", "v1", "currency", "rates"] ->
      currency_http.list_latest_rates(req, ctx)

    http.Post, ["api", "v1", "currency", "rates", "refresh"] ->
      currency_http.refresh_tcmb_rates(req, ctx)

    http.Get, ["api", "v1", "roles"] -> identity_http.list_roles(req, ctx)

    http.Post, ["api", "v1", "auth", "register"] -> identity_http.register(req, ctx)

    http.Post, ["api", "v1", "auth", "login"] -> identity_http.login(req, ctx)

    http.Delete, ["api", "v1", "auth", "session"] -> identity_http.logout(req, ctx)

    http.Post, ["api", "v1", "auth", "change-password"] -> identity_http.change_password(req, ctx)

    http.Post, ["api", "v1", "auth", "forgot-password"] -> identity_http.forgot_password(req, ctx)

    http.Post, ["api", "v1", "auth", "reset-password"] -> identity_http.reset_password(req, ctx)

    http.Get, ["api", "v1", "auth", "me"] -> identity_http.me(req, ctx)

    http.Patch, ["api", "v1", "auth", "me"] -> identity_http.patch_me(req, ctx)

    http.Get, ["api", "v1", "admin", "users"] ->
      identity_http.admin_list_users(req, ctx)

    http.Get, ["api", "v1", "admin", "workspace", "tasks"] ->
      workspace_http.admin_list_tasks(req, ctx)

    http.Post, ["api", "v1", "admin", "workspace", "tasks"] ->
      workspace_http.admin_create_task(req, ctx)

    http.Patch, ["api", "v1", "admin", "workspace", "tasks", wtid] ->
      workspace_http.admin_patch_task(req, ctx, wtid)

    http.Delete, ["api", "v1", "admin", "workspace", "tasks", wtid] ->
      workspace_http.admin_delete_task(req, ctx, wtid)

    http.Get, ["api", "v1", "admin", "workspace", "announcements"] ->
      workspace_http.admin_list_announcements(req, ctx)

    http.Post, ["api", "v1", "admin", "workspace", "announcements"] ->
      workspace_http.admin_create_announcement(req, ctx)

    http.Get, ["api", "v1", "admin", "workspace", "recipient-orgs"] ->
      workspace_http.admin_list_recipient_orgs(req, ctx)

    http.Get, ["api", "v1", "admin", "workspace", "staff-assignees"] ->
      workspace_http.admin_list_staff_assignees(req, ctx)

    http.Get, ["api", "v1", "admin", "user-roles"] ->
      identity_http.admin_user_roles(req, ctx)

    http.Post, ["api", "v1", "admin", "user-roles"] ->
      identity_http.admin_update_user_role(req, ctx)

    http.Get, ["api", "v1", "admin", "audit-log"] ->
      identity_http.admin_audit_log(req, ctx)

    http.Get, ["api", "v1", "admin", "permissions"] ->
      identity_http.admin_list_permissions(req, ctx)

    http.Get, ["api", "v1", "admin", "role-permissions"] ->
      identity_http.admin_list_role_permissions(req, ctx)

    http.Post, ["api", "v1", "admin", "role-permissions"] ->
      identity_http.admin_update_role_permission(req, ctx)

    http.Get, ["api", "v1", "admin", "agency-category-grants"] ->
      identity_http.admin_list_agency_category_grants(req, ctx)

    http.Post, ["api", "v1", "admin", "agency-category-grants"] ->
      identity_http.admin_upsert_agency_category_grant(req, ctx)

    http.Get, ["api", "v1", "admin", "agency-profiles"] ->
      identity_http.admin_list_agency_profiles(req, ctx)

    http.Patch, ["api", "v1", "admin", "agency-profiles"] ->
      identity_http.admin_patch_agency_profiles(req, ctx)

    http.Get, ["api", "v1", "agent", "me"] -> agent_http.me(req, ctx)

    http.Get, ["api", "v1", "agent", "reservations"] ->
      agent_http.list_reservations(req, ctx)

    http.Get, ["api", "v1", "agent", "sales-summary"] ->
      agent_http.sales_summary(req, ctx)

    http.Get, ["api", "v1", "staff", "me"] -> staff_http.me(req, ctx)

    http.Get, ["api", "v1", "staff", "workspace", "tasks"] ->
      workspace_http.staff_list_tasks(req, ctx)

    http.Patch, ["api", "v1", "staff", "workspace", "tasks", wtid] ->
      workspace_http.staff_patch_task(req, ctx, wtid)

    http.Get, ["api", "v1", "staff", "invoices"] ->
      staff_http.list_invoices(req, ctx)

    http.Get, ["api", "v1", "staff", "reservations"] ->
      staff_http.list_reservations(req, ctx)

    http.Get, ["api", "v1", "staff", "listings"] -> staff_http.list_listings(req, ctx)

    http.Post, ["api", "v1", "staff", "pos", "carts", cid, "checkout"] ->
      staff_http.pos_checkout(req, ctx, cid)

    http.Post, ["api", "v1", "staff", "pos", "carts", cid, "lines"] ->
      staff_http.pos_add_cart_line(req, ctx, cid)

    http.Post, ["api", "v1", "staff", "pos", "carts"] ->
      staff_http.pos_create_cart(req, ctx)

    http.Get, ["api", "v1", "agency", "me"] -> agency_http.me(req, ctx)

    http.Get, ["api", "v1", "agency", "announcements"] ->
      workspace_http.agency_list_announcements(req, ctx)

    http.Get, ["api", "v1", "agency", "browse-listings"] ->
      agency_http.browse_listings(req, ctx)

    http.Get, ["api", "v1", "agency", "reservations"] ->
      agency_http.list_reservations(req, ctx)

    http.Get, ["api", "v1", "agency", "sales-summary"] ->
      agency_http.sales_summary(req, ctx)

    http.Get, ["api", "v1", "agency", "api-keys"] -> agency_http.list_api_keys(req, ctx)

    http.Post, ["api", "v1", "agency", "api-keys"] -> agency_http.create_api_key(req, ctx)

    http.Delete, ["api", "v1", "agency", "api-keys", kid] ->
      agency_http.delete_api_key(req, ctx, kid)

    http.Get, ["api", "v1", "agency", "commission-rates"] ->
      agency_http.commission_rates(req, ctx)

    http.Get, ["api", "v1", "agency", "commission-accruals"] ->
      agency_http.commission_accruals(req, ctx)

    http.Get, ["api", "v1", "agency", "persisted-commission-accruals"] ->
      agency_http.persisted_commission_accruals(req, ctx)

    http.Get, ["api", "v1", "agency", "invoices", iid] ->
      agency_http.get_invoice(req, ctx, iid)

    http.Post, ["api", "v1", "agency", "invoices", iid, "cancel"] ->
      agency_http.cancel_invoice(req, ctx, iid)

    http.Patch, ["api", "v1", "agency", "invoices", iid] ->
      agency_http.patch_invoice_notes(req, ctx, iid)

    http.Get, ["api", "v1", "agency", "invoices"] -> agency_http.list_invoices(req, ctx)

    http.Post, ["api", "v1", "agency", "invoices", "preview"] ->
      agency_http.preview_invoice(req, ctx)

    http.Post, ["api", "v1", "agency", "invoices"] -> agency_http.create_invoice(req, ctx)

    // ── Tedarikçi Başvuruları ─────────────────────────────────────────────────
    http.Get, ["api", "v1", "supplier", "applications"] ->
      supplier_application_http.list_my_applications(req, ctx)

    http.Post, ["api", "v1", "supplier", "applications"] ->
      supplier_application_http.upsert_application(req, ctx)

    http.Post, ["api", "v1", "supplier", "applications", aid, "documents"] ->
      supplier_application_http.upsert_document(req, ctx, aid)

    http.Post, ["api", "v1", "supplier", "applications", aid, "submit"] ->
      supplier_application_http.submit_application(req, ctx, aid)

    http.Get, ["api", "v1", "admin", "supplier-applications"] ->
      supplier_application_http.admin_list_applications(req, ctx)

    http.Post, ["api", "v1", "admin", "supplier-applications", aid, "approve"] ->
      supplier_application_http.admin_approve(req, ctx, aid)

    http.Post, ["api", "v1", "admin", "supplier-applications", aid, "reject"] ->
      supplier_application_http.admin_reject(req, ctx, aid)

    http.Get, ["api", "v1", "supplier", "me"] -> supplier_http.me(req, ctx)

    http.Get, ["api", "v1", "supplier", "announcements"] ->
      workspace_http.supplier_list_announcements(req, ctx)

    http.Get, ["api", "v1", "supplier", "listings"] ->
      supplier_http.list_listings(req, ctx)

    http.Patch, ["api", "v1", "supplier", "listings", lid] ->
      supplier_http.patch_listing(req, ctx, lid)

    http.Get, ["api", "v1", "supplier", "agency-commissions"] ->
      supplier_http.agency_commissions(req, ctx)

    http.Post, ["api", "v1", "supplier", "agency-commissions"] ->
      supplier_http.upsert_agency_commission(req, ctx)

    http.Delete, ["api", "v1", "supplier", "agency-commissions", sacid] ->
      supplier_http.delete_agency_commission(req, ctx, sacid)

    http.Get, ["api", "v1", "supplier", "promotion-fee-rules"] ->
      supplier_http.promotion_fee_rules(req, ctx)

    http.Post, ["api", "v1", "supplier", "promotion-fee-rules"] ->
      supplier_http.upsert_promotion_fee_rule(req, ctx)

    http.Delete, ["api", "v1", "supplier", "promotion-fee-rules", prid] ->
      supplier_http.delete_promotion_fee_rule(req, ctx, prid)

    http.Get, ["api", "v1", "supplier", "commission-accruals"] ->
      supplier_http.commission_accruals(req, ctx)

    http.Get, ["api", "v1", "supplier", "persisted-commission-accruals"] ->
      supplier_http.persisted_commission_accruals(req, ctx)

    http.Get, ["api", "v1", "supplier", "invoices", sid] ->
      supplier_http.get_invoice(req, ctx, sid)

    http.Post, ["api", "v1", "supplier", "invoices", sid, "cancel"] ->
      supplier_http.cancel_invoice(req, ctx, sid)

    http.Patch, ["api", "v1", "supplier", "invoices", sid] ->
      supplier_http.patch_invoice_notes(req, ctx, sid)

    http.Get, ["api", "v1", "supplier", "invoices"] ->
      supplier_http.list_invoices(req, ctx)

    http.Post, ["api", "v1", "supplier", "invoices", "preview"] ->
      supplier_http.preview_invoice(req, ctx)

    http.Post, ["api", "v1", "supplier", "invoices"] ->
      supplier_http.create_invoice(req, ctx)

    http.Post, ["api", "v1", "support", "tickets", tid, "messages"] ->
      ticket_http.add_message(req, ctx, tid)

    http.Get, ["api", "v1", "support", "tickets", tid] ->
      ticket_http.get_ticket(req, ctx, tid)

    http.Get, ["api", "v1", "support", "tickets"] ->
      ticket_http.list_tickets(req, ctx)

    http.Post, ["api", "v1", "support", "tickets"] ->
      ticket_http.create_ticket(req, ctx)

    http.Get, ["api", "v1", "support", "chat", "channels"] ->
      chat_http.list_channels(req, ctx)

    http.Get, ["api", "v1", "support", "chat", "sessions", sid, "messages"] ->
      chat_http.list_messages(req, ctx, sid)

    http.Post, ["api", "v1", "support", "chat", "sessions", sid, "messages"] ->
      chat_http.post_message(req, ctx, sid)

    http.Get, ["api", "v1", "support", "chat", "sessions", sid, "followups"] ->
      chat_http.list_followups(req, ctx, sid)

    http.Post, ["api", "v1", "support", "chat", "sessions", sid, "followups"] ->
      chat_http.create_followup(req, ctx, sid)

    http.Patch, ["api", "v1", "support", "chat", "sessions", sid] ->
      chat_http.close_session(req, ctx, sid)

    http.Get, ["api", "v1", "support", "chat", "sessions", sid] ->
      chat_http.get_session(req, ctx, sid)

    http.Get, ["api", "v1", "support", "chat", "sessions"] ->
      chat_http.list_my_sessions(req, ctx)

    http.Post, ["api", "v1", "support", "chat", "sessions"] ->
      chat_http.create_session(req, ctx)

    http.Get, ["api", "v1", "support", "kb", "articles", kslug] ->
      helpdesk_catalog_http.get_kb_article(req, ctx, kslug)

    http.Get, ["api", "v1", "support", "kb", "articles"] ->
      helpdesk_catalog_http.list_kb_articles(req, ctx)

    http.Get, ["api", "v1", "support", "sla-policies"] ->
      helpdesk_catalog_http.list_sla_policies(req, ctx)

    http.Get, ["api", "v1", "support", "macros"] ->
      helpdesk_catalog_http.list_macros(req, ctx)

    http.Get, ["api", "v1", "support", "departments"] ->
      helpdesk_catalog_http.list_departments(req, ctx)

    http.Get, ["api", "v1", "reservations", "mine"] ->
      booking_http.list_my_reservations(req, ctx)

    http.Get, ["api", "v1", "reservations", "by-code", code] ->
      booking_http.get_by_public_code(req, ctx, code)

    // ── Provizyon — Tedarikçi (token tabanlı) ─────────────────────────
    http.Get, ["api", "v1", "provizyon", token] ->
      provizyon_http.get_by_token(req, ctx, token)

    http.Post, ["api", "v1", "provizyon", token, "confirm"] ->
      provizyon_http.supplier_confirm(req, ctx, token)

    http.Post, ["api", "v1", "provizyon", token, "cancel"] ->
      provizyon_http.supplier_cancel(req, ctx, token)

    http.Get, ["api", "v1", "supplier", "reservations"] ->
      provizyon_http.list_supplier_reservations(req, ctx)

    // ── Rezervasyonlar — Admin ─────────────────────────────────────────
    http.Get, ["api", "v1", "admin", "reservations"] ->
      booking_http.list_admin_reservations(req, ctx)

    // ── Provizyon — Admin ──────────────────────────────────────────────
    http.Get, ["api", "v1", "admin", "provizyon"] ->
      provizyon_http.admin_list(req, ctx)

    http.Post, ["api", "v1", "admin", "provizyon", "check-deadlines"] ->
      provizyon_http.admin_check_deadlines(req, ctx)

    http.Get, ["api", "v1", "admin", "escalations"] ->
      provizyon_http.admin_list_escalations(req, ctx)

    http.Patch, ["api", "v1", "admin", "escalations", esc_id, "resolve"] ->
      provizyon_http.admin_resolve_escalation(req, ctx, esc_id)

    http.Post, ["api", "v1", "admin", "provizyon", res_id, "transfer"] ->
      provizyon_http.admin_add_transfer(req, ctx, res_id)

    http.Patch, ["api", "v1", "admin", "provizyon", "transfers", tid, "complete"] ->
      provizyon_http.admin_complete_transfer(req, ctx, tid)

    http.Post, ["api", "v1", "carts", cart_id, "checkout"] ->
      booking_http.checkout(req, ctx, cart_id)

    http.Get, ["api", "v1", "public", "coupons", "validate"] ->
      cart_coupon_http.validate_public(req, ctx)

    http.Post, ["api", "v1", "public", "listings", lid, "view-ping"] ->
      social_proof_http.view_ping(req, ctx, lid)
    http.Get, ["api", "v1", "public", "listings", lid, "social-proof"] ->
      social_proof_http.social_proof(req, ctx, lid)

    http.Post, ["api", "v1", "public", "listings", lid, "report"] ->
      listing_reports_http.submit(req, ctx, lid)
    http.Get, ["api", "v1", "admin", "listing-reports"] ->
      listing_reports_http.list_reports(req, ctx)
    http.Patch, ["api", "v1", "admin", "listing-reports", rid] ->
      listing_reports_http.patch_status(req, ctx, rid)
    http.Get, ["api", "v1", "public", "listings", lid, "perks"] ->
      listing_perks_http.get_perks(req, ctx, lid)
    http.Patch, ["api", "v1", "listings", lid, "perks"] ->
      listing_perks_http.patch_perks(req, ctx, lid)

    http.Post, ["api", "v1", "admin", "super-host", "recompute"] ->
      super_host_http.recompute_all(req, ctx)
    http.Get, ["api", "v1", "admin", "super-host", "organizations"] ->
      super_host_http.list_organizations(req, ctx)
    http.Patch, ["api", "v1", "admin", "organizations", oid, "super-host"] ->
      super_host_http.manual_toggle(req, ctx, oid)

    http.Post, ["api", "v1", "carts", cart_id, "apply-coupon"] ->
      cart_coupon_http.apply_coupon(req, ctx, cart_id)
    http.Delete, ["api", "v1", "carts", cart_id, "coupon"] ->
      cart_coupon_http.remove_coupon(req, ctx, cart_id)
    http.Get, ["api", "v1", "carts", cart_id, "totals"] ->
      cart_coupon_http.get_totals(req, ctx, cart_id)

    http.Get, ["api", "v1", "carts", cart_id] ->
      booking_http.get_cart(req, ctx, cart_id)

    http.Post, ["api", "v1", "carts", cart_id, "lines"] ->
      booking_http.add_cart_line(req, ctx, cart_id)

    http.Post, ["api", "v1", "carts"] ->
      booking_http.create_cart(req, ctx)

    http.Post, ["api", "v1", "integrations", "paytr", "notification"] ->
      paytr_http.notification(req, ctx)

    http.Post, ["api", "v1", "integrations", "paytr", "iframe-token"] ->
      paytr_http.iframe_token(req, ctx)

    http.Post, ["api", "v1", "integrations", "paratika", "session-token"] ->
      paratika_http.session_token(req, ctx)

    http.Post, ["api", "v1", "integrations", "paratika", "return"] ->
      paratika_http.payment_return(req, ctx)

    http.Get, ["api", "v1", "payments", "active-provider"] ->
      payment_settings_http.get_active_provider(req, ctx)

    http.Post, ["api", "v1", "payments", "active-provider"] ->
      payment_settings_http.set_active_provider(req, ctx)

    http.Get, ["api", "v1", "site", "public-config"] ->
      site_settings_http.get_public_config(req, ctx)

    http.Get, ["api", "v1", "site", "settings"] ->
      site_settings_http.list_settings(req, ctx)

    http.Put, ["api", "v1", "site", "settings"] ->
      site_settings_http.upsert_setting(req, ctx)

    http.Delete, ["api", "v1", "site", "settings"] ->
      site_settings_http.delete_setting(req, ctx)

    http.Post, ["api", "v1", "integrations", "netgsm", "sms"] ->
      netgsm_http.send_sms(req, ctx)

    http.Get, ["api", "v1", "social", "templates"] ->
      social_http.list_templates(req, ctx)

    http.Post, ["api", "v1", "social", "templates"] ->
      social_http.create_template(req, ctx)

    http.Get, ["api", "v1", "social", "jobs"] -> social_http.list_jobs(req, ctx)

    http.Post, ["api", "v1", "social", "jobs"] -> social_http.create_job(req, ctx)

    http.Patch, ["api", "v1", "listings", lid, "social"] ->
      social_http.patch_listing_social(req, ctx, lid)

    http.Get, ["api", "v1", "social", "instagram-shop-links"] ->
      social_http.list_instagram_shop_links(req, ctx)

    http.Post, ["api", "v1", "social", "instagram-shop-links"] ->
      social_http.create_instagram_shop_link(req, ctx)

    http.Patch, ["api", "v1", "social", "instagram-shop-links", islid] ->
      social_http.patch_instagram_shop_link(req, ctx, islid)

    http.Delete, ["api", "v1", "social", "instagram-shop-links", islid] ->
      social_http.delete_instagram_shop_link(req, ctx, islid)

    http.Get, ["api", "v1", "media", "cdn"] -> media_http.get_cdn(req, ctx)

    http.Get, ["api", "v1", "media", "cdn", "all"] ->
      media_http.get_cdn_all(req, ctx)

    http.Post, ["api", "v1", "media", "cdn", "active"] ->
      media_http.set_cdn_active(req, ctx)

    http.Post, ["api", "v1", "media", "cdn", "deactivate"] ->
      media_http.deactivate_cdn(req, ctx)

    http.Patch, ["api", "v1", "media", "cdn", "url"] ->
      media_http.update_cdn_url(req, ctx)

    http.Patch, ["api", "v1", "media", "cdn", "config"] ->
      media_http.update_cdn_config(req, ctx)

    http.Post, ["api", "v1", "media", "files"] -> media_http.register_file(req, ctx)

    http.Patch, ["api", "v1", "media", "files", fid] ->
      media_http.patch_file(req, ctx, fid)

    http.Patch, ["api", "v1", "listings", lid, "images", "order"] ->
      listing_images_http.reorder_images(req, ctx, lid)

    http.Delete, ["api", "v1", "listings", lid, "images", iid] ->
      listing_images_http.delete_image(req, ctx, lid, iid)

    http.Get, ["api", "v1", "listings", lid, "images"] ->
      listing_images_http.list_images(req, ctx, lid)

    http.Post, ["api", "v1", "listings", lid, "images"] ->
      listing_images_http.add_image(req, ctx, lid)

    http.Patch, ["api", "v1", "listings", lid, "images", iid] ->
      listing_images_http.patch_image_scene(req, ctx, lid, iid)

    http.Get, ["api", "v1", "seo", "metadata"] -> seo_http.get_metadata(req, ctx)

    http.Post, ["api", "v1", "seo", "metadata"] -> seo_http.upsert_metadata(req, ctx)

    http.Get, ["api", "v1", "seo", "schema"] -> seo_http.list_schema(req, ctx)

    http.Post, ["api", "v1", "seo", "schema"] -> seo_http.upsert_schema(req, ctx)

    http.Get, ["api", "v1", "seo", "redirects"] -> seo_http.list_redirects(req, ctx)

    http.Post, ["api", "v1", "seo", "redirects"] -> seo_http.create_redirect(req, ctx)

    http.Delete, ["api", "v1", "seo", "redirects", rid] ->
      seo_http.delete_redirect(req, ctx, rid)

    http.Get, ["api", "v1", "seo", "sitemap"] -> seo_http.sitemap_entries(req, ctx)

    http.Get, ["api", "v1", "seo", "sitemap.xml"] -> seo_http.sitemap_xml(req, ctx)

    http.Post, ["api", "v1", "seo", "not-found"] -> seo_http.log_not_found(req, ctx)

    http.Get, ["api", "v1", "seo", "not-found", "logs"] ->
      seo_http.list_not_found_logs(req, ctx)

    http.Get, ["api", "v1", "cms", "pages", "by-slug"] ->
      cms_http.get_by_slug(req, ctx)

    http.Get, ["api", "v1", "cms", "pages"] -> cms_http.list_pages(req, ctx)

    http.Post, ["api", "v1", "cms", "pages"] -> cms_http.create_page(req, ctx)

    http.Patch, ["api", "v1", "cms", "pages", pid, "blocks", "reorder"] ->
      cms_http.reorder_blocks(req, ctx, pid)

    http.Get, ["api", "v1", "cms", "pages", pid, "blocks"] ->
      cms_http.list_blocks(req, ctx, pid)

    http.Post, ["api", "v1", "cms", "pages", pid, "blocks"] ->
      cms_http.add_block(req, ctx, pid)

    http.Patch, ["api", "v1", "cms", "pages", pid, "blocks", bid] ->
      cms_http.patch_block(req, ctx, pid, bid)

    http.Delete, ["api", "v1", "cms", "pages", pid, "blocks", bid] ->
      cms_http.delete_block(req, ctx, pid, bid)

    http.Get, ["api", "v1", "cms", "pages", pid, "curated-filter"] ->
      cms_http.get_curated_filter(req, ctx, pid)

    http.Put, ["api", "v1", "cms", "pages", pid, "curated-filter"] ->
      cms_http.put_curated_filter(req, ctx, pid)

    http.Get, ["api", "v1", "cms", "pages", pid] -> cms_http.get_page(req, ctx, pid)

    http.Patch, ["api", "v1", "cms", "pages", pid] -> cms_http.patch_page(req, ctx, pid)

    http.Get, ["api", "v1", "banners", "placements", "public"] ->
      banner_http.list_placements_public(req, ctx)

    http.Get, ["api", "v1", "banners", "placements"] ->
      banner_http.list_placements(req, ctx)

    http.Post, ["api", "v1", "banners", "placements"] ->
      banner_http.create_placement(req, ctx)

    http.Patch, ["api", "v1", "banners", "placements", bid] ->
      banner_http.patch_placement(req, ctx, bid)

    http.Delete, ["api", "v1", "banners", "placements", bid] ->
      banner_http.delete_placement(req, ctx, bid)

    http.Get, ["api", "v1", "catalog", "public", "listings"] ->
      collections_http.search_public_listings(req, ctx)

    http.Get, ["api", "v1", "catalog", "public", "theme-items"] ->
      collections_http.list_public_theme_items(req, ctx)

    http.Get, ["api", "v1", "catalog", "public", "category-stats"] ->
      collections_http.public_category_stats(req, ctx)

    http.Get, ["api", "v1", "collections"] ->
      collections_http.list_collections(req, ctx)

    http.Post, ["api", "v1", "collections"] ->
      collections_http.create_collection(req, ctx)

    http.Get, ["api", "v1", "collections", slug] ->
      collections_http.get_collection_by_slug(req, ctx, slug)

    http.Patch, ["api", "v1", "collections", cid] ->
      collections_http.patch_collection(req, ctx, cid)

    http.Delete, ["api", "v1", "collections", cid] ->
      collections_http.delete_collection(req, ctx, cid)

    http.Get, ["api", "v1", "blog", "categories"] ->
      blog_http.list_categories(req, ctx)

    http.Post, ["api", "v1", "blog", "categories"] ->
      blog_http.create_category(req, ctx)

    http.Get, ["api", "v1", "blog", "posts", "by-slug"] ->
      blog_http.get_post_by_slug(req, ctx)

    http.Get, ["api", "v1", "blog", "posts"] -> blog_http.list_posts(req, ctx)

    http.Post, ["api", "v1", "blog", "posts"] -> blog_http.create_post(req, ctx)

    http.Get, ["api", "v1", "blog", "posts", pid, "translations"] ->
      blog_http.list_translations(req, ctx, pid)

    http.Put, ["api", "v1", "blog", "posts", pid, "translations"] ->
      blog_http.upsert_translation(req, ctx, pid)

    http.Get, ["api", "v1", "blog", "posts", pid] -> blog_http.get_post(req, ctx, pid)

    http.Patch, ["api", "v1", "blog", "posts", pid] -> blog_http.patch_post(req, ctx, pid)

    http.Put, ["api", "v1", "blog", "posts", pid, "meta"] ->
      blog_http.put_post_meta(req, ctx, pid)

    http.Delete, ["api", "v1", "blog", "posts", pid] -> blog_http.delete_post(req, ctx, pid)

    http.Patch, ["api", "v1", "blog", "categories", cid] ->
      blog_http.patch_category(req, ctx, cid)

    http.Get, ["api", "v1", "marketing", "coupons"] ->
      marketing_http.list_coupons(req, ctx)

    http.Post, ["api", "v1", "marketing", "coupons"] ->
      marketing_http.create_coupon(req, ctx)

    http.Patch, ["api", "v1", "marketing", "coupons", cid] ->
      marketing_http.patch_coupon(req, ctx, cid)

    http.Delete, ["api", "v1", "marketing", "coupons", cid] ->
      marketing_http.delete_coupon(req, ctx, cid)

    http.Get, ["api", "v1", "marketing", "coupons", cid, "limits"] ->
      marketing_http.get_coupon_limits(req, ctx, cid)

    http.Patch, ["api", "v1", "marketing", "coupons", cid, "limits"] ->
      marketing_http.patch_coupon_limits(req, ctx, cid)

    http.Get, ["api", "v1", "marketing", "campaigns"] ->
      marketing_http.list_campaigns(req, ctx)

    http.Post, ["api", "v1", "marketing", "campaigns"] ->
      marketing_http.create_campaign(req, ctx)

    http.Patch, ["api", "v1", "marketing", "campaigns", cid] ->
      marketing_http.patch_campaign(req, ctx, cid)

    http.Delete, ["api", "v1", "marketing", "campaigns", cid] ->
      marketing_http.delete_campaign(req, ctx, cid)

    http.Get, ["api", "v1", "marketing", "holiday-packages"] ->
      marketing_http.list_holiday_packages(req, ctx)

    http.Post, ["api", "v1", "marketing", "holiday-packages"] ->
      marketing_http.create_holiday_package(req, ctx)

    http.Patch, ["api", "v1", "marketing", "holiday-packages", hid] ->
      marketing_http.patch_holiday_package(req, ctx, hid)

    http.Delete, ["api", "v1", "marketing", "holiday-packages", hid] ->
      marketing_http.delete_holiday_package(req, ctx, hid)

    http.Get, ["api", "v1", "marketing", "public", "cross-sell-suggestions"] ->
      marketing_http.list_public_cross_sell_suggestions(req, ctx)

    http.Get, ["api", "v1", "public", "marketing", "active-campaigns"] ->
      marketing_http.list_public_active_campaigns(req, ctx)

    http.Get, ["api", "v1", "public", "marketing", "active-coupons"] ->
      marketing_http.list_public_active_coupons(req, ctx)

    http.Get, ["api", "v1", "public", "marketing", "holiday-packages"] ->
      marketing_http.list_public_holiday_packages(req, ctx)

    http.Get, ["api", "v1", "marketing", "cross-sell-rules"] ->
      marketing_http.list_cross_sell_rules(req, ctx)

    http.Post, ["api", "v1", "marketing", "cross-sell-rules"] ->
      marketing_http.create_cross_sell_rule(req, ctx)

    http.Get, ["api", "v1", "messaging", "email-templates"] ->
      messaging_catalog_http.list_email_templates(req, ctx)

    http.Get, ["api", "v1", "messaging", "triggers"] ->
      messaging_catalog_http.list_triggers(req, ctx)

    http.Get, ["api", "v1", "messaging", "jobs"] ->
      messaging_catalog_http.list_jobs(req, ctx)

    http.Post, ["api", "v1", "messaging", "jobs"] ->
      messaging_catalog_http.queue_job(req, ctx)

    http.Get, ["api", "v1", "navigation", "menus"] ->
      navigation_http.list_menus(req, ctx)

    http.Post, ["api", "v1", "navigation", "menus"] ->
      navigation_http.create_menu(req, ctx)

    http.Get, ["api", "v1", "navigation", "public", "menus", mcode, "items"] ->
      navigation_http.list_public_menu_items(req, ctx, mcode)

    http.Get, ["api", "v1", "navigation", "menus", mid, "items"] ->
      navigation_http.list_menu_items(req, ctx, mid)

    http.Post, ["api", "v1", "navigation", "menus", mid, "items"] ->
      navigation_http.add_menu_item(req, ctx, mid)

    http.Patch, ["api", "v1", "navigation", "menus", mid, "items", iid] ->
      navigation_http.patch_menu_item(req, ctx, mid, iid)

    http.Delete, ["api", "v1", "navigation", "menus", mid, "items", iid] ->
      navigation_http.delete_menu_item(req, ctx, mid, iid)

    http.Get, ["api", "v1", "navigation", "home-sections"] ->
      navigation_http.list_home_sections(req, ctx)

    http.Post, ["api", "v1", "navigation", "home-sections"] ->
      navigation_http.create_home_section(req, ctx)

    http.Patch, ["api", "v1", "navigation", "home-sections", sid] ->
      navigation_http.patch_home_section(req, ctx, sid)

    http.Delete, ["api", "v1", "navigation", "home-sections", sid] ->
      navigation_http.delete_home_section(req, ctx, sid)

    http.Get, ["api", "v1", "navigation", "popups"] ->
      navigation_http.list_popups(req, ctx)

    http.Post, ["api", "v1", "navigation", "popups"] ->
      navigation_http.create_popup(req, ctx)

    http.Patch, ["api", "v1", "navigation", "popups", pid] ->
      navigation_http.patch_popup(req, ctx, pid)

    http.Delete, ["api", "v1", "navigation", "popups", pid] ->
      navigation_http.delete_popup(req, ctx, pid)

    http.Get, ["api", "v1", "engagement", "favorites"] ->
      engagement_http.list_favorites(req, ctx)

    http.Post, ["api", "v1", "engagement", "favorites"] ->
      engagement_http.add_favorite(req, ctx)

    http.Delete, ["api", "v1", "engagement", "favorites", lid] ->
      engagement_http.remove_favorite(req, ctx, lid)

    http.Get, ["api", "v1", "engagement", "recently-viewed"] ->
      engagement_http.list_recently_viewed(req, ctx)

    http.Post, ["api", "v1", "engagement", "recently-viewed"] ->
      engagement_http.add_recently_viewed(req, ctx)

    http.Delete, ["api", "v1", "engagement", "comparison-sets", sid, "items", item_lid] ->
      engagement_http.remove_comparison_item(req, ctx, sid, item_lid)

    http.Get, ["api", "v1", "engagement", "comparison-sets", sid, "items"] ->
      engagement_http.list_comparison_items(req, ctx, sid)

    http.Post, ["api", "v1", "engagement", "comparison-sets", sid, "items"] ->
      engagement_http.add_comparison_item(req, ctx, sid)

    http.Delete, ["api", "v1", "engagement", "comparison-sets", sid] ->
      engagement_http.delete_comparison_set(req, ctx, sid)

    http.Get, ["api", "v1", "engagement", "comparison-sets"] ->
      engagement_http.list_comparison_sets(req, ctx)

    http.Post, ["api", "v1", "engagement", "comparison-sets"] ->
      engagement_http.create_comparison_set(req, ctx)

    http.Post, ["api", "v1", "engagement", "voice-search-log"] ->
      engagement_http.log_voice_search(req, ctx)

    http.Get, ["api", "v1", "reviews", "public", "by-category"] ->
      reviews_http.public_by_category(req, ctx)

    http.Get, ["api", "v1", "reviews", "mine"] ->
      reviews_http.list_my_reviews(req, ctx)

    http.Get, ["api", "v1", "reviews", "external-snapshots"] ->
      reviews_http.list_external_snapshots(req, ctx)

    http.Post, ["api", "v1", "reviews", "external-snapshots"] ->
      reviews_http.create_external_snapshot(req, ctx)

    http.Get, ["api", "v1", "reviews", "admin"] ->
      reviews_http.list_reviews_admin(req, ctx)

    http.Patch, ["api", "v1", "reviews", rid, "moderation"] ->
      reviews_http.patch_review_moderation(req, ctx, rid)

    http.Patch, ["api", "v1", "reviews", rid] ->
      reviews_http.patch_review(req, ctx, rid)

    http.Get, ["api", "v1", "reviews"] -> reviews_http.list_reviews(req, ctx)

    http.Post, ["api", "v1", "reviews"] -> reviews_http.create_review(req, ctx)

    http.Get, ["api", "v1", "locations", "countries"] ->
      locations_http.list_countries(req, ctx)

    http.Post, ["api", "v1", "locations", "countries"] ->
      locations_http.create_country(req, ctx)

    http.Get, ["api", "v1", "locations", "regions"] ->
      locations_http.list_regions(req, ctx)

    http.Post, ["api", "v1", "locations", "regions"] ->
      locations_http.create_region(req, ctx)

    http.Get, ["api", "v1", "locations", "districts"] ->
      locations_http.list_districts(req, ctx)

    http.Post, ["api", "v1", "locations", "districts"] ->
      locations_http.create_district(req, ctx)

    http.Get, ["api", "v1", "locations", "pages", "by-slug"] ->
      locations_http.get_location_page_by_slug(req, ctx)

    http.Get, ["api", "v1", "locations", "pages", "by-name"] ->
      locations_http.get_location_page_by_name(req, ctx)

    http.Get, ["api", "v1", "locations", "pages", pid, "poi-settings"] ->
      locations_http.get_poi_settings(req, ctx, pid)

    http.Put, ["api", "v1", "locations", "pages", pid, "poi-settings"] ->
      locations_http.put_poi_settings(req, ctx, pid)

    http.Get, ["api", "v1", "locations", "pages", pid, "poi-cache"] ->
      locations_http.list_poi_cache(req, ctx, pid)

    http.Post, ["api", "v1", "locations", "pages", pid, "poi-cache"] ->
      locations_http.add_poi_cache_row(req, ctx, pid)

    http.Delete, ["api", "v1", "locations", "pages", pid, "poi-cache"] ->
      locations_http.clear_poi_cache(req, ctx, pid)

    http.Get, ["api", "v1", "locations", "pages", pid] ->
      locations_http.get_location_page(req, ctx, pid)

    http.Patch, ["api", "v1", "locations", "pages", pid] ->
      locations_http.patch_location_page(req, ctx, pid)

    http.Delete, ["api", "v1", "locations", "pages", pid] ->
      locations_http.delete_location_page(req, ctx, pid)

    http.Get, ["api", "v1", "locations", "pages"] ->
      locations_http.list_location_pages(req, ctx)

    http.Post, ["api", "v1", "locations", "pages"] ->
      locations_http.create_location_page(req, ctx)

    http.Get, ["api", "v1", "locations", "ical-feeds"] ->
      locations_http.list_ical_feeds(req, ctx)

    http.Post, ["api", "v1", "locations", "ical-feeds"] ->
      locations_http.create_ical_feed(req, ctx)

    http.Patch, ["api", "v1", "locations", "ical-feeds", fid] ->
      locations_http.patch_ical_feed(req, ctx, fid)

    http.Delete, ["api", "v1", "locations", "ical-feeds", fid] ->
      locations_http.delete_ical_feed(req, ctx, fid)

    // Manuel iCal sync (Airbnb/Booking'den feed çek → availability güncelle)
    http.Post, ["api", "v1", "locations", "ical-feeds", fid, "sync"] ->
      locations_http.sync_ical_feed(req, ctx, fid)

    // iCal'den içe aktarılmış ham bloklar (debug + admin denetim)
    http.Get, ["api", "v1", "locations", "ical-imported-blocks"] ->
      locations_http.list_imported_blocks(req, ctx)

    // iCal export token (her listing için unique URL üretir/yeniler)
    http.Get, ["api", "v1", "catalog", "listings", lid, "ical-export-token"] ->
      ical_export_http.get_or_create_token(req, ctx, lid)

    http.Post, ["api", "v1", "catalog", "listings", lid, "ical-export-token"] ->
      ical_export_http.rotate_token(req, ctx, lid)

    http.Get, ["api", "v1", "integrations", "accounts"] ->
      integrations_http.list_integration_accounts(req, ctx)

    http.Post, ["api", "v1", "integrations", "accounts"] ->
      integrations_http.create_integration_account(req, ctx)

    http.Patch, ["api", "v1", "integrations", "accounts", aid] ->
      integrations_http.patch_integration_account(req, ctx, aid)

    http.Get, ["api", "v1", "integrations", "sync-logs"] ->
      integrations_http.list_sync_logs(req, ctx)

    http.Post, ["api", "v1", "integrations", "sync-logs"] ->
      integrations_http.create_sync_log(req, ctx)

    http.Get, ["api", "v1", "integrations", "google-merchant-products"] ->
      integrations_http.list_google_merchant_products(req, ctx)

    http.Post, ["api", "v1", "integrations", "google-merchant-products"] ->
      integrations_http.upsert_google_merchant_product(req, ctx)

    http.Patch, ["api", "v1", "integrations", "google-merchant-products", gmpid] ->
      integrations_http.patch_google_merchant_product(req, ctx, gmpid)

    http.Get, ["api", "v1", "integrations", "whatsapp-order-intents"] ->
      integrations_http.list_whatsapp_order_intents(req, ctx)

    http.Post, ["api", "v1", "integrations", "whatsapp-order-intents"] ->
      integrations_http.create_whatsapp_order_intent(req, ctx)

    http.Get, ["api", "v1", "ai", "providers"] ->
      ai_http.list_ai_providers(req, ctx)

    http.Get, ["api", "v1", "ai", "feature-profiles"] ->
      ai_http.list_feature_profiles(req, ctx)

    http.Patch, ["api", "v1", "ai", "feature-profiles", fpc] ->
      ai_http.patch_feature_profile(req, ctx, fpc)

    http.Get, ["api", "v1", "ai", "jobs", jid] ->
      ai_http.get_ai_job(req, ctx, jid)

    http.Get, ["api", "v1", "ai", "jobs"] -> ai_http.list_ai_jobs(req, ctx)

    http.Post, ["api", "v1", "ai", "jobs"] -> ai_http.create_ai_job(req, ctx)

    http.Post, ["api", "v1", "ai", "jobs", jid, "run"] ->
      ai_http.post_run_ai_job(req, ctx, jid)

    http.Get, ["api", "v1", "ai", "region-tasks"] ->
      ai_http.list_region_tasks(req, ctx)

    http.Post, ["api", "v1", "ai", "region-tasks"] ->
      ai_http.create_region_task(req, ctx)

    http.Get, ["api", "v1", "ai", "geo-blog-batches"] ->
      ai_http.list_geo_blog_batches(req, ctx)

    http.Post, ["api", "v1", "ai", "geo-blog-batches"] ->
      ai_http.create_geo_blog_batch(req, ctx)

    http.Get, ["api", "v1", "ai", "post-booking-plans"] ->
      ai_http.list_post_booking_plans(req, ctx)

    http.Post, ["api", "v1", "ai", "ops-agent", "run"] ->
      ai_http.ops_agent_run(req, ctx)

    http.Delete, ["api", "v1", "verticals", "listings", lid, "hotel-rooms", rid] ->
      verticals_http.delete_hotel_room(req, ctx, lid, rid)

    http.Delete, ["api", "v1", "verticals", "listings", lid, "related-rules", rrid] ->
      verticals_http.delete_related_rule(req, ctx, lid, rrid)

    http.Delete, ["api", "v1", "verticals", "listings", lid, "transfer-zones", zid] ->
      verticals_http.delete_transfer_zone(req, ctx, lid, zid)

    http.Get, ["api", "v1", "verticals", "listings", lid, "hotel-rooms"] ->
      verticals_http.list_hotel_rooms(req, ctx, lid)

    http.Post, ["api", "v1", "verticals", "listings", lid, "hotel-rooms"] ->
      verticals_http.add_hotel_room(req, ctx, lid)

    http.Get, ["api", "v1", "verticals", "listings", lid, "related-rules"] ->
      verticals_http.list_related_rules(req, ctx, lid)

    http.Post, ["api", "v1", "verticals", "listings", lid, "related-rules"] ->
      verticals_http.add_related_rule(req, ctx, lid)

    http.Get, ["api", "v1", "verticals", "listings", lid, "transfer-zones"] ->
      verticals_http.list_transfer_zones(req, ctx, lid)

    http.Post, ["api", "v1", "verticals", "listings", lid, "transfer-zones"] ->
      verticals_http.add_transfer_zone(req, ctx, lid)

    http.Get, ["api", "v1", "verticals", "listings", lid, "holiday-home"] ->
      verticals_http.get_holiday_home(req, ctx, lid)

    http.Patch, ["api", "v1", "verticals", "listings", lid, "holiday-home"] ->
      verticals_http.patch_holiday_home(req, ctx, lid)

    http.Get, ["api", "v1", "verticals", "listings", lid, "yacht"] ->
      verticals_http.get_yacht(req, ctx, lid)

    http.Patch, ["api", "v1", "verticals", "listings", lid, "yacht"] ->
      verticals_http.patch_yacht(req, ctx, lid)

    http.Get, ["api", "v1", "verticals", "listings", lid, "vertical-meta"] ->
      verticals_http.get_vertical_meta(req, ctx, lid)

    http.Put, ["api", "v1", "verticals", "listings", lid, "vertical-meta"] ->
      verticals_http.put_vertical_meta(req, ctx, lid)

    _, _ -> wisp.not_found()
  }
}

fn home_json() -> Response {
  let body =
    json.object([
      #("service", json.string("travel-backend")),
      #("docs", json.string("/api/v1/meta")),
    ])
    |> json.to_string

  wisp.json_response(body, 200)
}

fn api_meta(req: Request) -> Response {
  let host = request.get_header(req, "host") |> result.unwrap("unknown")
  let body =
    json.object([
      #("name", json.string("Rezervasyon / turizm bilgi havuzu API")),
      #(
        "capabilities",
        json.array(
          from: [
            "listing_owner_subdomains",
            "agent_api",
            "customer_reservations",
            "custom_domain_tenants",
            "i18n_locales_translations",
            "currency_rates_tcmb_refresh",
            "auth_register_login_session",
            "roles_catalog",
            "agency_portal_api_keys",
            "agent_api_key_auth",
            "agency_sales_summary",
            "commission_accruals_live",
            "commission_accrual_lines_persisted",
            "supplier_portal",
            "admin_portal_rbac_audit",
            "permission_matrix_role_permissions_api",
            "staff_portal",
            "agency_browse_listings",
            "agency_commission_invoices",
            "supplier_commission_invoices",
            "paratika_hpp_session",
            "payment_provider_switch",
            "social_share_templates_jobs_instagram_shop_links",
            "media_cdn_files_listing_images",
            "seo_metadata_schema_redirects_sitemap_json_xml_404log",
            "cms_pages_blocks_curated_filter",
            "blog_categories_posts_translations",
            "site_settings_public_config",
            "banner_placements",
            "i18n_localized_routes",
            "marketing_public_cross_sell_coupons_campaigns",
            "messaging_email_templates_triggers_jobs_queue",
            "navigation_public_menus_menus_items_home_sections_popups",
            "engagement_favorites_recent_comparison_voice_log",
            "reviews_list_create_mine_patch_external_snapshots_admin_moderation",
            "locations_countries_regions_districts_pages_poi_ical",
            "support_chat_channels_sessions_messages_followups_kb_macros_sla",
            "integrations_accounts_sync_gmp_whatsapp_ai_jobs_verticals_core",
          ],
          of: json.string,
        ),
      ),
      #("host", json.string(host)),
    ])
    |> json.to_string

  wisp.json_response(body, 200)
}

fn module_json(m: module_tree.ModuleInfo) -> json.Json {
  json.object([
    #("code", json.string(m.code)),
    #("title", json.string(m.title)),
    #("note", json.string(m.note)),
  ])
}

fn modules_json() -> Response {
  let mods = module_tree.all_modules()
  let body =
    json.object([
      #("count", json.int(module_tree.module_count())),
      #("modules", json.array(from: mods, of: module_json)),
      #(
        "database_schema",
        json.string("priv/sql/modules/ — install_order.txt sırasıyla uygulayın"),
      ),
    ])
    |> json.to_string

  wisp.json_response(body, 200)
}

fn health_check(ctx: Context) -> Response {
  let row_decoder = {
    use n <- decode.field(0, decode.int)
    decode.success(n)
  }
  let db_ok =
    case
      pog.query("select 1")
      |> pog.returning(row_decoder)
      |> pog.execute(ctx.db)
    {
      Ok(returned) -> returned.count > 0 && !list.is_empty(returned.rows)
      Error(_) -> False
    }

  let status = case db_ok {
    True -> 200
    False -> 503
  }

  let body =
    json.object([
      #("status", json.string(case db_ok {
        True -> "ok"
        False -> "degraded"
      })),
      #("database", json.bool(db_ok)),
    ])
    |> json.to_string

  wisp.json_response(body, status)
}

fn cors_preflight_response() -> Response {
  wisp.response(204)
}

fn with_cors(resp: Response, req: Request) -> Response {
  let allow_origin = case request.get_header(req, "origin") {
    Ok(origin) -> origin
    Error(_) -> "*"
  }

  resp
  |> response.set_header("access-control-allow-origin", allow_origin)
  |> response.set_header(
    "access-control-allow-methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  )
  |> response.set_header(
    "access-control-allow-headers",
    "content-type, authorization, x-api-key",
  )
  |> response.set_header("access-control-max-age", "86400")
}
