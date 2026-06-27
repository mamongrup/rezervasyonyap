import envoy
import gleam/erlang/process
import gleam/int
import gleam/option.{type Option, None, Some}
import gleam/string
import pog
import gleam/result

pub type InvoiceNotifyConfig {
  InvoiceNotifyConfig(
    webhook_url: Option(String),
    resend_api_key: Option(String),
    mail_from: Option(String),
    mail_to: Option(String),
  )
}

pub type AppConfig {
  AppConfig(
    port: Int,
    secret_key_base: String,
    database: pog.Config,
    database_reserve: pog.Config,
    db_health_interval_ms: Int,
    invoice_notify: InvoiceNotifyConfig,
  )
}

pub fn load() -> AppConfig {
  let port =
    envoy.get("PORT")
    |> result.try(int.parse)
    |> result.unwrap(8080)

  let secret_key_base =
    envoy.get("WISP_SECRET_KEY_BASE")
    |> result.unwrap(
      "dev-secret-change-me-in-production-use-long-random-string-at-least-64-chars",
    )

  let primary_name = process.new_name(prefix: "travel_db_primary")
  let reserve_name = process.new_name(prefix: "travel_db_reserve")
  let pool_size = env_pos_int("PG_POOL_SIZE", 10)
  let reserve_size = env_pos_int("PG_RESERVE_POOL_SIZE", 4)
  let idle_ms = env_pos_int("PG_IDLE_INTERVAL_MS", 5000)
  let health_ms = env_pos_int("PG_HEALTH_INTERVAL_MS", 15_000)

  let database = case envoy.get("DATABASE_URL") {
    Ok(raw_url) -> {
      let url = string.trim(raw_url)
      case url {
        "" -> default_database(primary_name, pool_size, idle_ms, "travel_api")
        _ ->
          case pog.url_config(primary_name, url) {
            Ok(cfg) -> finish_pool_config(cfg, pool_size, idle_ms, "travel_api")
            Error(_) ->
              panic as {
                "DATABASE_URL ayarli ama gecersiz (baglanti URL'si cozulemedi). URL'i duzeltin veya kaldirarak PGHOST/PGUSER/PGPASSWORD kullanin."
              }
          }
      }
    }
    Error(_) -> default_database(primary_name, pool_size, idle_ms, "travel_api")
  }

  let database_reserve =
    case envoy.get("DATABASE_URL") {
      Ok(raw_url) -> {
        let url = string.trim(raw_url)
        case url {
          "" ->
            default_database(
              reserve_name,
              reserve_size,
              idle_ms,
              "travel_api_reserve",
            )
          _ ->
            case pog.url_config(reserve_name, url) {
              Ok(cfg) ->
                finish_pool_config(
                  cfg,
                  reserve_size,
                  idle_ms,
                  "travel_api_reserve",
                )
              Error(_) ->
                default_database(
                  reserve_name,
                  reserve_size,
                  idle_ms,
                  "travel_api_reserve",
                )
            }
        }
      }
      Error(_) ->
        default_database(
          reserve_name,
          reserve_size,
          idle_ms,
          "travel_api_reserve",
        )
    }

  let invoice_notify = load_invoice_notify()

  AppConfig(
    port:,
    secret_key_base:,
    database:,
    database_reserve:,
    db_health_interval_ms: health_ms,
    invoice_notify:,
  )
}

fn env_pos_int(name: String, fallback: Int) -> Int {
  case envoy.get(name) {
    Ok(raw) ->
      case int.parse(string.trim(raw)) {
        Ok(n) ->
          case n > 0 {
            True -> n
            False -> fallback
          }
        Error(_) -> fallback
      }
    Error(_) -> fallback
  }
}

fn finish_pool_config(
  cfg: pog.Config,
  pool_size: Int,
  idle_ms: Int,
  app_name: String,
) -> pog.Config {
  cfg
  |> pog.pool_size(pool_size)
  |> pog.idle_interval(idle_ms)
  |> pog.connection_parameter("application_name", app_name)
}

fn trim_opt(s: Result(String, Nil)) -> Option(String) {
  case s {
    Ok(t) ->
      case string.trim(t) {
        "" -> None
        x -> Some(x)
      }
    Error(_) -> None
  }
}

fn load_invoice_notify() -> InvoiceNotifyConfig {
  InvoiceNotifyConfig(
    webhook_url: trim_opt(envoy.get("INVOICE_NOTIFY_WEBHOOK_URL")),
    resend_api_key: trim_opt(envoy.get("RESEND_API_KEY")),
    mail_from: trim_opt(envoy.get("INVOICE_NOTIFY_FROM")),
    mail_to: trim_opt(envoy.get("INVOICE_NOTIFY_TO")),
  )
}

fn default_database(
  pool_name: process.Name(pog.Message),
  pool_size: Int,
  idle_ms: Int,
  app_name: String,
) -> pog.Config {
  let host = envoy.get("PGHOST") |> result.unwrap("127.0.0.1")
  let port =
    envoy.get("PGPORT")
    |> result.try(int.parse)
    |> result.unwrap(5432)
  let database = envoy.get("PGDATABASE") |> result.unwrap("travel")
  let user = envoy.get("PGUSER") |> result.unwrap("postgres")
  let password: Option(String) = case envoy.get("PGPASSWORD") {
    Ok("") -> None
    Ok(p) -> Some(p)
    Error(_) -> None
  }

  pog.default_config(pool_name)
  |> pog.host(host)
  |> pog.port(port)
  |> pog.database(database)
  |> pog.user(user)
  |> pog.password(password)
  |> pog.ssl(pog.SslDisabled)
  |> finish_pool_config(pool_size, idle_ms, app_name)
}
