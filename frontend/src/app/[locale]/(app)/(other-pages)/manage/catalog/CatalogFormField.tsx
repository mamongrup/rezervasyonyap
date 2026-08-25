import clsx from 'clsx'
import type { ComponentPropsWithoutRef } from 'react'

/**
 * Katalog formlari icin bagimsiz alan elemanlari.
 *
 * Headless UI Label, Field context'i farkli bir istemci chunk'inda
 * kayboldugunda tum duzenleme sayfasini dusurebiliyor. Katalog alanlarinin
 * ihtiyaci yalnizca semantik HTML ve ortak stiller oldugu icin burada yerel,
 * context gerektirmeyen elemanlar kullanilir.
 */
export function Field({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={clsx(className)} />
}

export function Label({ className, ...props }: ComponentPropsWithoutRef<'label'>) {
  return (
    <label
      {...props}
      className={clsx(
        className,
        'text-sm/6 font-medium text-neutral-950 select-none dark:text-white',
      )}
    />
  )
}
