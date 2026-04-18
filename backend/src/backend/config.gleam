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

  let pool_name = process.new_name(prefix: "travel_db")

  let database = case envoy.get("DATABASE_URL") {
    Ok(url) ->
      case pog.url_config(pool_name, url) {
        Ok(cfg) -> pog.pool_size(cfg, 10)
        Error(_) -> default_database(pool_name)
      }
    Error(_) -> default_database(pool_name)
  }

  let invoice_notify = load_invoice_notify()

  AppConfig(port:, secret_key_base:, database:, invoice_notify:)
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

fn default_database(pool_name: process.Name(pog.Message)) -> pog.Config {
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
  |> pog.pool_size(10)
}
