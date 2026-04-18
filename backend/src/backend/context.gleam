import backend/config.{type InvoiceNotifyConfig}
import pog

pub type Context {
  Context(db: pog.Connection, invoice_notify: InvoiceNotifyConfig)
}
