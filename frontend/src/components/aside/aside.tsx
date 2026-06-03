'use client'

import Logo from '@/shared/Logo'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/**
 * Drawer component that opens on user click.
 * @param heading - string. Shown at the top of the drawer.
 * @param open - boolean state. if true opens the drawer.
 * @param onClose - function should set the open state.
 * @param openFrom - right, left
 * @param children - react children node.
 */
export function Aside({
  heading,
  logoOnHeading = false,
  openFrom = 'right',
  children,
  type,
  contentMaxWidthClassName = 'max-w-lg',
  showHeading = true,
  stackZIndexClass = 'z-50',
}: {
  heading?: string
  logoOnHeading?: boolean
  openFrom: 'right' | 'left'
  children: React.ReactNode
  type: AsideType
  contentMaxWidthClassName?: string
  showHeading?: boolean
  stackZIndexClass?: string
}) {
  const { type: activeType, close } = useAside()
  const open = type === activeType

  const onClose = close

  const hasHeading = !!heading || logoOnHeading

  return (
    <Dialog as="div" className={clsx('relative', stackZIndexClass)} onClose={onClose} open={open}>
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-neutral-900/50 duration-300 ease-out data-closed:opacity-0"
      />

      <div className="fixed inset-0">
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={clsx(
              'fixed inset-y-0 flex max-w-full',
              openFrom === 'right' && 'right-0',
              openFrom === 'left' && 'left-0'
            )}
          >
            <DialogPanel
              transition
              className={clsx(
                contentMaxWidthClassName,
                'h-dvh w-screen max-h-dvh translate-x-0 overflow-hidden bg-white pt-[env(safe-area-inset-top,0px)] text-start align-middle shadow-xl transition duration-200 ease-in-out dark:bg-neutral-800',
                openFrom === 'left' && 'data-closed:-translate-x-20 data-closed:opacity-0',
                openFrom === 'right' && 'data-closed:translate-x-20 data-closed:opacity-0'
              )}
            >
              <div className="flex h-full flex-col px-4 md:px-8">
                {showHeading ? (
                  <header
                    className={`flex h-16 flex-shrink-0 items-center border-b border-neutral-900/10 md:h-20 ${
                      hasHeading ? 'justify-between' : 'justify-end'
                    }`}
                  >
                    {hasHeading && (
                      <>
                        {!!heading && !logoOnHeading && (
                          <DialogTitle>
                            <span className="text-2xl font-medium">{heading}</span>
                          </DialogTitle>
                        )}
                        {logoOnHeading && <Logo />}
                      </>
                    )}

                    <button
                      type="button"
                      className="group flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-neutral-100 transition hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                      onClick={onClose}
                      aria-label="Kapat"
                    >
                      <HugeiconsIcon
                        className="text-neutral-700 transition-transform duration-200 group-hover:rotate-90 dark:text-neutral-200"
                        icon={Cancel01Icon}
                        size={22}
                        strokeWidth={1.5}
                      />
                    </button>
                  </header>
                ) : null}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

/* Use for associating arialabelledby with the title*/
Aside.Title = DialogTitle

export function useDrawer(openDefault = false) {
  const [isOpen, setIsOpen] = useState(openDefault)

  function openDrawer() {
    setIsOpen(true)
  }

  function closeDrawer() {
    setIsOpen(false)
  }

  return {
    isOpen,
    openDrawer,
    closeDrawer,
  }
}

type AsideType = 'search' | 'cart' | 'closed' | 'sidebar-navigation' | 'category-filters' | 'product-quick-view'
type AsideContextValue = {
  type: AsideType
  open: (mode: AsideType) => void
  close: () => void
  productQuickViewHandle?: string
  setProductQuickViewHandle: (handle: string) => void
  /** Çekmece / tam ekran modal / site popup açıkken WhatsApp ve AI float gizlensin */
  floatingWidgetsSuppressed: boolean
  registerModalOverlay: () => () => void
}
//
const AsideContext = createContext<AsideContextValue | null>(null)

export function AsideProvider({ children }: { children: ReactNode }) {
  const [type, setType] = useState<AsideType>('closed')
  const [productQuickViewHandle, setProductQuickViewHandle] = useState<string>()
  const [modalOverlayCount, setModalOverlayCount] = useState(0)

  const registerModalOverlay = useCallback(() => {
    setModalOverlayCount((n) => n + 1)
    return () => setModalOverlayCount((n) => Math.max(0, n - 1))
  }, [])

  const floatingWidgetsSuppressed = type !== 'closed' || modalOverlayCount > 0

  const value = useMemo(
    () => ({
      type,
      open: setType,
      close: () => setType('closed'),
      productQuickViewHandle,
      setProductQuickViewHandle,
      floatingWidgetsSuppressed,
      registerModalOverlay,
    }),
    [type, productQuickViewHandle, floatingWidgetsSuppressed, registerModalOverlay],
  )

  return <AsideContext.Provider value={value}>{children}</AsideContext.Provider>
}

/** Tam ekran arama, konaklama arama diyaloğu, site popup vb. */
export function useRegisterVitrinOverlay(active: boolean) {
  const ctx = useContext(AsideContext)
  useEffect(() => {
    if (!ctx || !active) return
    return ctx.registerModalOverlay()
  }, [active, ctx])
}

export function useAside() {
  const aside = useContext(AsideContext)
  if (!aside) {
    throw new Error('useAside must be used within an AsideProvider')
  }
  return aside
}

export function useFloatingWidgetsSuppressed() {
  return useContext(AsideContext)?.floatingWidgetsSuppressed ?? false
}
