import clsx from 'clsx'
import type { ComponentPropsWithoutRef } from 'react'

/** Context gerektirmeyen, panel formlarinda guvenle kullanilan alan kapsayicisi. */
export function Field({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={clsx(className)} />
}

/** Baslik ve form etiketi olarak calisan yerel HTML label'i. */
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
