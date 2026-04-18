//// Fatura oluşturma / iptal bildirimleri — webhook veya Resend (HTTPS).

import backend/config.{type InvoiceNotifyConfig}
import gleam/int
import gleam/io
import gleam/json
import gleam/option.{None, Some}
import gleam/string
import travel/net/http_client

fn log_err(prefix: String, e: String) -> Nil {
  io.println(string.concat([prefix, e]))
  Nil
}

fn post_webhook(url: String, payload: json.Json) -> Nil {
  let body = json.to_string(payload)
  case http_client.post_json(url, body, "") {
    Ok(_) -> Nil
    Error(e) -> log_err("INVOICE_NOTIFY_WEBHOOK_URL failed: ", e)
  }
}

fn post_resend(
  key: String,
  from: String,
  to: String,
  subject: String,
  text_body: String,
) -> Nil {
  let auth = string.concat(["Bearer ", key])
  let payload =
    json.object([
      #("from", json.string(from)),
      #("to", json.array([to], of: json.string)),
      #("subject", json.string(subject)),
      #("text", json.string(text_body)),
    ])
  case http_client.post_json("https://api.resend.com/emails", json.to_string(payload), auth) {
    Ok(_) -> Nil
    Error(e) -> log_err("Resend API failed: ", e)
  }
}

fn maybe_resend(
  cfg: InvoiceNotifyConfig,
  subject: String,
  text_body: String,
) -> Nil {
  case cfg.resend_api_key, cfg.mail_from, cfg.mail_to {
    Some(key), Some(from), Some(to) ->
      post_resend(key, from, to, subject, text_body)
    _, _, _ -> Nil
  }
}

pub fn agency_invoice_created(
  cfg: InvoiceNotifyConfig,
  organization_id: String,
  invoice_id: String,
  invoice_number: String,
  period_from: String,
  period_to: String,
  currency_code: String,
  line_count: Int,
  gross_total: String,
  commission_total: String,
) -> Nil {
  case cfg.webhook_url {
    Some(url) ->
      post_webhook(
        url,
        json.object([
          #("event", json.string("agency_invoice_created")),
          #("organization_id", json.string(organization_id)),
          #("invoice_id", json.string(invoice_id)),
          #("invoice_number", json.string(invoice_number)),
          #("period_from", json.string(period_from)),
          #("period_to", json.string(period_to)),
          #("currency_code", json.string(currency_code)),
          #("line_count", json.int(line_count)),
          #("gross_total", json.string(gross_total)),
          #("commission_total", json.string(commission_total)),
        ]),
      )
    None -> Nil
  }
  let subj =
    string.concat(["Acente faturası: ", invoice_number, " (", currency_code, ")"])
  let txt =
    string.concat([
      "Acente komisyon faturası oluşturuldu.\n",
      "Fatura no: ",
      invoice_number,
      "\nDönem: ",
      period_from,
      " — ",
      period_to,
      "\nPara birimi: ",
      currency_code,
      "\nSatır: ",
      int.to_string(line_count),
      "\nBrüt: ",
      gross_total,
      " | Komisyon: ",
      commission_total,
      "\nKurum: ",
      organization_id,
      "\nFatura id: ",
      invoice_id,
      "\n",
    ])
  maybe_resend(cfg, subj, txt)
}

pub fn supplier_invoice_created(
  cfg: InvoiceNotifyConfig,
  organization_id: String,
  invoice_id: String,
  invoice_number: String,
  period_from: String,
  period_to: String,
  currency_code: String,
  line_count: Int,
  gross_total: String,
  commission_total: String,
) -> Nil {
  case cfg.webhook_url {
    Some(url) ->
      post_webhook(
        url,
        json.object([
          #("event", json.string("supplier_invoice_created")),
          #("organization_id", json.string(organization_id)),
          #("invoice_id", json.string(invoice_id)),
          #("invoice_number", json.string(invoice_number)),
          #("period_from", json.string(period_from)),
          #("period_to", json.string(period_to)),
          #("currency_code", json.string(currency_code)),
          #("line_count", json.int(line_count)),
          #("gross_total", json.string(gross_total)),
          #("commission_total", json.string(commission_total)),
        ]),
      )
    None -> Nil
  }
  let subj =
    string.concat(["Tedarikçi faturası: ", invoice_number, " (", currency_code, ")"])
  let txt =
    string.concat([
      "Tedarikçi komisyon faturası oluşturuldu.\n",
      "Fatura no: ",
      invoice_number,
      "\nDönem: ",
      period_from,
      " — ",
      period_to,
      "\nPara birimi: ",
      currency_code,
      "\nSatır: ",
      int.to_string(line_count),
      "\nBrüt: ",
      gross_total,
      " | Komisyon: ",
      commission_total,
      "\nKurum: ",
      organization_id,
      "\nFatura id: ",
      invoice_id,
      "\n",
    ])
  maybe_resend(cfg, subj, txt)
}

pub fn agency_invoice_cancelled(
  cfg: InvoiceNotifyConfig,
  organization_id: String,
  invoice_id: String,
  invoice_number: String,
) -> Nil {
  case cfg.webhook_url {
    Some(url) ->
      post_webhook(
        url,
        json.object([
          #("event", json.string("agency_invoice_cancelled")),
          #("organization_id", json.string(organization_id)),
          #("invoice_id", json.string(invoice_id)),
          #("invoice_number", json.string(invoice_number)),
        ]),
      )
    None -> Nil
  }
  let subj = string.concat(["Acente faturası iptal: ", invoice_number])
  let txt =
    string.concat([
      "Acente faturası iptal edildi.\n",
      "Fatura no: ",
      invoice_number,
      "\nKurum: ",
      organization_id,
      "\nFatura id: ",
      invoice_id,
      "\n",
    ])
  maybe_resend(cfg, subj, txt)
}

pub fn supplier_invoice_cancelled(
  cfg: InvoiceNotifyConfig,
  organization_id: String,
  invoice_id: String,
  invoice_number: String,
) -> Nil {
  case cfg.webhook_url {
    Some(url) ->
      post_webhook(
        url,
        json.object([
          #("event", json.string("supplier_invoice_cancelled")),
          #("organization_id", json.string(organization_id)),
          #("invoice_id", json.string(invoice_id)),
          #("invoice_number", json.string(invoice_number)),
        ]),
      )
    None -> Nil
  }
  let subj = string.concat(["Tedarikçi faturası iptal: ", invoice_number])
  let txt =
    string.concat([
      "Tedarikçi faturası iptal edildi.\n",
      "Fatura no: ",
      invoice_number,
      "\nKurum: ",
      organization_id,
      "\nFatura id: ",
      invoice_id,
      "\n",
    ])
  maybe_resend(cfg, subj, txt)
}
