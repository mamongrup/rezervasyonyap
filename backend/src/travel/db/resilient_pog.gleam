//// Çift katmanlı PostgreSQL: birincil havuz + yedek havuz + otomatik retry.

import gleam/option.{type Option, None, Some}
import pog

pub fn start(config) {
  pog.start(config)
}

@external(erlang, "backend_ffi_db", "set_reserve_pool")
pub fn set_reserve_pool(conn: pog.Connection) -> Nil

@external(erlang, "backend_ffi_db", "has_reserve")
fn has_reserve() -> Bool

@external(erlang, "backend_ffi_db", "reserve_pool")
fn fetch_reserve() -> Result(pog.Connection, Nil)

fn reserve_pool() -> Option(pog.Connection) {
  case has_reserve() {
    False -> None
    True ->
      case fetch_reserve() {
        Ok(conn) -> Some(conn)
        Error(_) -> None
      }
  }
}

pub fn is_transient_error(e: pog.QueryError) -> Bool {
  case e {
    pog.ConnectionUnavailable -> True
    // QueryTimeout KASITLI olarak retry edilmez: 5+ sn süren sorgu tekrarında da
    // büyük olasılıkla zaman aşımına uğrar. Yeniden denemek (yedek havuz + ana havuz)
    // tek yavaş isteği 3 ardışık ağır sorguya çevirip bağlantı fırtınası
    // (connection_unavailable → tüm API 500) tetikliyordu. Bkz. runbook §10.
    pog.QueryTimeout -> False
    pog.PostgresqlError(code, _, _) ->
      code == "53300"
      || code == "57P01"
      || code == "57P02"
      || code == "08000"
      || code == "08001"
      || code == "08003"
      || code == "08006"
      || code == "08004"
      || code == "40001"
    _ -> False
  }
}

fn execute_on(pool: pog.Connection, query: pog.Query(t)) -> Result(
  pog.Returned(t),
  pog.QueryError,
) {
  pog.execute(query, pool)
}

fn retry_primary(
  query: pog.Query(t),
  pool: pog.Connection,
) -> Result(pog.Returned(t), pog.QueryError) {
  execute_on(pool, query)
}

pub fn execute(
  query query: pog.Query(t),
  on pool: pog.Connection,
) -> Result(pog.Returned(t), pog.QueryError) {
  case execute_on(pool, query) {
    Ok(ret) -> Ok(ret)
    Error(e) ->
      case is_transient_error(e) {
        False -> Error(e)
        True ->
          case reserve_pool() {
            None -> retry_primary(query, pool)
            Some(reserve) ->
              case execute_on(reserve, query) {
                Ok(ret) -> Ok(ret)
                Error(_) -> retry_primary(query, pool)
              }
          }
      }
  }
}

pub fn transaction(
  pool: pog.Connection,
  callback: fn(pog.Connection) -> Result(t, error),
) -> Result(t, pog.TransactionError(error)) {
  case pog.transaction(pool, callback) {
    Ok(ret) -> Ok(ret)
    Error(pog.TransactionQueryError(e)) ->
      case is_transient_error(e) {
        False -> Error(pog.TransactionQueryError(e))
        True ->
          case reserve_pool() {
            None -> Error(pog.TransactionQueryError(e))
            Some(reserve) -> pog.transaction(reserve, callback)
          }
      }
    Error(e) -> Error(e)
  }
}
