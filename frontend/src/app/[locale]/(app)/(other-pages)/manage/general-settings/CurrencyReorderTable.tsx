'use client'

import type { CurrencyRow } from '@/lib/travel-api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Menu01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { FC, useCallback } from 'react'

function CurrencySymbolCircle({ symbol }: { symbol: string }) {
  const s = symbol.trim()
  if (!s) return <span className="text-neutral-400">—</span>
  return (
    <span
      className={clsx(
        'inline-grid size-[26px] shrink-0 place-items-center rounded-full border border-neutral-200 bg-white text-center leading-none text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
        s.length > 2 ? 'text-[9px] font-medium' : 'text-[13px] font-medium',
      )}
      aria-hidden
    >
      <span className="block max-w-[22px] truncate leading-none">{s}</span>
    </span>
  )
}

type Props = {
  currencies: CurrencyRow[]
  onReorder: (next: CurrencyRow[]) => void
  onToggleActive: (code: string, nextActive: boolean) => void
  toggleBusyCode: string | null
  onSaveOrder: () => void | Promise<void>
  orderSaving: boolean
}

const CurrencyReorderTable: FC<Props> = ({
  currencies,
  onReorder,
  onToggleActive,
  toggleBusyCode,
  onSaveOrder,
  orderSaving,
}) => {
  const onDragStart = useCallback((e: React.DragEvent, code: string) => {
    e.dataTransfer.setData('text/currency-code', code)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault()
      const fromCode = e.dataTransfer.getData('text/currency-code')
      if (!fromCode) return
      const fromIdx = currencies.findIndex((c) => c.code === fromCode)
      if (fromIdx === -1 || fromIdx === targetIndex) return
      const next = [...currencies]
      const [row] = next.splice(fromIdx, 1)
      next.splice(targetIndex, 0, row)
      onReorder(next)
    },
    [currencies, onReorder],
  )

  return (
    <div>
      <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
        Ön yüzdeki para birimi listesi (header) bu sırayla gösterilir. Satırı tutup sürükleyin, ardından{' '}
        <strong>Para birimi sırasını kaydet</strong> ile sunucuya yazın.
      </p>
      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800/50">
            <tr>
              <th className="w-10 px-2 py-2.5" aria-label="Sürükle" />
              <th className="px-4 py-2.5">Kod</th>
              <th className="px-4 py-2.5">Ad</th>
              <th className="px-4 py-2.5">Sembol</th>
              <th className="px-4 py-2.5">Ondalık</th>
              <th className="px-4 py-2.5">Aktif</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {currencies.map((c, index) => (
              <tr
                key={c.code}
                draggable
                onDragStart={(e) => onDragStart(e, c.code)}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, index)}
                className="cursor-grab border-t border-neutral-100 active:cursor-grabbing dark:border-neutral-800"
              >
                <td className="px-2 py-3 align-middle text-neutral-400">
                  <HugeiconsIcon icon={Menu01Icon} className="mx-auto size-5" aria-hidden strokeWidth={1.75} />
                </td>
                <td className="px-4 py-3 align-middle font-mono text-xs font-medium text-neutral-800 dark:text-neutral-200">
                  {c.code}
                </td>
                <td className="px-4 py-3 align-middle text-neutral-800 dark:text-neutral-200">{c.name}</td>
                <td className="px-4 py-3 align-middle">
                  <CurrencySymbolCircle symbol={c.symbol ?? ''} />
                </td>
                <td className="px-4 py-3 align-middle">{c.decimal_places}</td>
                <td className="px-4 py-3 align-middle">{c.is_active ? 'Evet' : 'Hayır'}</td>
                <td className="px-4 py-3 align-middle">
                  <button
                    type="button"
                    disabled={toggleBusyCode === c.code}
                    onClick={() => void onToggleActive(c.code, !c.is_active)}
                    className="text-xs font-medium text-primary-600 underline disabled:opacity-50 dark:text-primary-400"
                  >
                    {toggleBusyCode === c.code ? '…' : c.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <ButtonPrimary type="button" disabled={orderSaving} onClick={() => void onSaveOrder()}>
          {orderSaving ? 'Kaydediliyor…' : 'Para birimi sırasını kaydet'}
        </ButtonPrimary>
      </div>
    </div>
  )
}

export default CurrencyReorderTable
