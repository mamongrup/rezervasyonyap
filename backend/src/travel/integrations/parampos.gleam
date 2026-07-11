//// ParamPOS TP_WMD_UCD / TP_WMD_Pay SOAP istemcisi.

import gleam/bit_array
import gleam/crypto
import gleam/int
import gleam/result
import gleam/string
import travel/net/http_client

pub type Config {
  Config(
    client_code: String,
    username: String,
    password: String,
    guid: String,
    service_url: String,
  )
}

pub type StartInput {
  StartInput(
    order_id: String,
    owner: String,
    pan: String,
    month: String,
    year: String,
    cvc: String,
    gsm: String,
    amount: String,
    success_url: String,
    error_url: String,
    ip: String,
  )
}

pub type StartResult {
  StartResult(
    result: Int,
    message: String,
    html: String,
    md: String,
    transaction_guid: String,
  )
}

pub type PayResult {
  PayResult(result: Int, message: String, receipt_id: String, bank_code: Int)
}

fn esc(v: String) -> String {
  v
  |> string.replace("&", "&amp;")
  |> string.replace("<", "&lt;")
  |> string.replace(">", "&gt;")
  |> string.replace("\"", "&quot;")
  |> string.replace("'", "&apos;")
}

fn tag(name: String, value: String) -> String {
  "<" <> name <> ">" <> esc(value) <> "</" <> name <> ">"
}

fn security(c: Config) -> String {
  "<G>"
  <> tag("CLIENT_CODE", c.client_code)
  <> tag("CLIENT_USERNAME", c.username)
  <> tag("CLIENT_PASSWORD", c.password)
  <> "</G>"
}

fn envelope(body: String) -> String {
  "<?xml version=\"1.0\" encoding=\"utf-8\"?><soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"><soap:Body>"
  <> body
  <> "</soap:Body></soap:Envelope>"
}

fn xml_value(xml: String, name: String) -> String {
  case string.split(xml, "<" <> name <> ">") {
    [_, rest, ..] ->
      case string.split(rest, "</" <> name <> ">") {
        [v, ..] -> v
        _ -> ""
      }
    _ -> ""
  }
}

fn xml_unescape(v: String) -> String {
  v
  |> string.replace("&lt;", "<")
  |> string.replace("&gt;", ">")
  |> string.replace("&quot;", "\"")
  |> string.replace("&apos;", "'")
  |> string.replace("&amp;", "&")
}

fn int_value(xml: String, name: String) -> Int {
  xml_value(xml, name) |> string.trim |> int_parse
}

fn int_parse(v: String) -> Int {
  case int.parse(v) {
    Ok(n) -> n
    Error(_) -> 0
  }
}

pub fn sha2b64(value: String) -> String {
  // Param'ın SHA2B64 adıyla yayımladığı servis, resmî TP_WMD_UCD test
  // vektöründe SHA-1 + Base64 üretir (RVn2aKnW...). Uyumluluk için aynısı.
  crypto.hash(crypto.Sha1, <<value:utf8>>) |> bit_array.base64_encode(False)
}

pub fn callback_hash(
  guid: String,
  transaction_guid: String,
  md: String,
  md_status: String,
  order_id: String,
) -> String {
  let data =
    transaction_guid <> md <> md_status <> order_id <> string.lowercase(guid)
  crypto.hash(crypto.Sha1, <<data:utf8>>) |> bit_array.base64_encode(False)
}

pub fn start(c: Config, i: StartInput) -> Result(StartResult, String) {
  let hash =
    sha2b64(
      c.client_code <> c.guid <> "1" <> i.amount <> i.amount <> i.order_id,
    )
  let body =
    "<TP_WMD_UCD xmlns=\"https://turkpos.com.tr/\">"
    <> security(c)
    <> tag("GUID", c.guid)
    <> tag("KK_Sahibi", i.owner)
    <> tag("KK_No", i.pan)
    <> tag("KK_SK_Ay", i.month)
    <> tag("KK_SK_Yil", i.year)
    <> tag("KK_CVC", i.cvc)
    <> tag("KK_Sahibi_GSM", i.gsm)
    <> tag("Hata_URL", i.error_url)
    <> tag("Basarili_URL", i.success_url)
    <> tag("Siparis_ID", i.order_id)
    <> tag("Siparis_Aciklama", "Rezervasyon")
    <> tag("Taksit", "1")
    <> tag("Islem_Tutar", i.amount)
    <> tag("Toplam_Tutar", i.amount)
    <> tag("Islem_Hash", hash)
    <> tag("Islem_Guvenlik_Tip", "3D")
    <> tag("Islem_ID", "0")
    <> tag("IPAdr", i.ip)
    <> tag("Ref_URL", i.success_url)
    <> tag("Data1", "")
    <> tag("Data2", "")
    <> tag("Data3", "")
    <> tag("Data4", "")
    <> tag("Data5", "")
    <> "</TP_WMD_UCD>"
  use raw <- result.try(http_client.post_xml(
    c.service_url,
    envelope(body),
    "https://turkpos.com.tr/TP_WMD_UCD",
  ))
  Ok(StartResult(
    int_value(raw, "Sonuc"),
    xml_unescape(xml_value(raw, "Sonuc_Str")),
    xml_unescape(xml_value(raw, "UCD_HTML")),
    xml_value(raw, "UCD_MD"),
    xml_value(raw, "Islem_GUID"),
  ))
}

pub fn pay(
  c: Config,
  md: String,
  transaction_guid: String,
  order_id: String,
) -> Result(PayResult, String) {
  let body =
    "<TP_WMD_Pay xmlns=\"https://turkpos.com.tr/\">"
    <> security(c)
    <> tag("GUID", c.guid)
    <> tag("UCD_MD", md)
    <> tag("Islem_GUID", transaction_guid)
    <> tag("Siparis_ID", order_id)
    <> "</TP_WMD_Pay>"
  use raw <- result.try(http_client.post_xml(
    c.service_url,
    envelope(body),
    "https://turkpos.com.tr/TP_WMD_Pay",
  ))
  Ok(PayResult(
    int_value(raw, "Sonuc"),
    xml_value(raw, "Sonuc_Ack"),
    xml_value(raw, "Dekont_ID"),
    int_value(raw, "Banka_Sonuc_Kod"),
  ))
}
