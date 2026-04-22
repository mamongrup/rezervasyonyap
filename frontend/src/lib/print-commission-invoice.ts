/** Komisyon faturası — yeni pencerede HTML + `window.print()` (PDF olarak kaydet seçilebilir). */

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type CommissionInvoicePrintLine = {
  public_code: string
  gross_amount: string
  commission_amount: string
  currency_code: string
}

export type CommissionInvoicePrintInput = {
  /** Örn. "Acente komisyon faturası" */
  documentTitle: string
  organizationName: string
  invoice_number: string
  period_from: string
  period_to: string
  currency_code: string
  gross_total: string
  commission_total: string
  status_label: string
  notes: string
  created_at: string
  lines: CommissionInvoicePrintLine[]
}

export function printCommissionInvoice(input: CommissionInvoicePrintInput): void {
  const {
    documentTitle,
    organizationName,
    invoice_number,
    period_from,
    period_to,
    currency_code,
    gross_total,
    commission_total,
    status_label,
    notes,
    created_at,
    lines,
  } = input

  const rows = lines
    .map(
      (ln) =>
        `<tr>
          <td>${esc(ln.public_code)}</td>
          <td style="text-align:right">${esc(ln.gross_amount)}</td>
          <td style="text-align:right">${esc(ln.commission_amount)}</td>
          <td>${esc(ln.currency_code)}</td>
        </tr>`,
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>${esc(invoice_number)} — ${esc(documentTitle)}</title>
  <style>
    body { font-family: system-ui, Segoe UI, sans-serif; font-size: 12px; color: #111; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    .muted { color: #444; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; }
    th { background: #f5f5f5; text-align: left; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-top: 16px; }
    .label { color: #555; font-size: 11px; }
    .notes { margin-top: 16px; white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 2em; }
    @media print {
      body { margin: 12mm; }
      a { color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>
  <h1>${esc(documentTitle)}</h1>
  <p class="muted">${esc(organizationName)}</p>
  <div class="grid">
    <div><span class="label">Fatura no</span><br /><strong>${esc(invoice_number)}</strong></div>
    <div><span class="label">Durum</span><br />${esc(status_label)}</div>
    <div><span class="label">Dönem</span><br />${esc(period_from)} → ${esc(period_to)}</div>
    <div><span class="label">Para birimi</span><br />${esc(currency_code)}</div>
    <div><span class="label">Brüt toplam</span><br />${esc(gross_total)}</div>
    <div><span class="label">Komisyon toplam</span><br />${esc(commission_total)}</div>
    <div><span class="label">Oluşturulma</span><br />${esc(created_at)}</div>
  </div>
  <p class="label" style="margin-top:16px">Not</p>
  <div class="notes">${notes.trim() ? esc(notes) : '—'}</div>
  <p class="label" style="margin-top:16px">Satırlar</p>
  <table>
    <thead>
      <tr>
        <th>Rezervasyon kodu</th>
        <th style="text-align:right">Brüt</th>
        <th style="text-align:right">Komisyon</th>
        <th>PB</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="4">Satır yok.</td></tr>'}
    </tbody>
  </table>
  <p class="muted" style="margin-top:24px">Yazdırırken hedef olarak “PDF’ye kaydet” seçebilirsiniz.</p>
</body>
</html>`

  const w = window.open('', '_blank', 'noopener,noreferrer')
  if (!w) {
    window.alert('Yazdırma penceresi açılamadı. Tarayıcıda pop-up engelini kapatıp tekrar deneyin.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}
