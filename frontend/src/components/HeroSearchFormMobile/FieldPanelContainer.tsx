import { Transition } from '@headlessui/react'
import clsx from 'clsx'
import React from 'react'

const FieldPanelContainer = ({
  className,
  children,
  isActive,
  headingOnClick,
  headingTitle,
  headingValue,
}: {
  className?: string
  children: React.ReactNode
  isActive: boolean
  headingOnClick: () => void
  headingTitle: string
  headingValue: string
}) => {
  return (
    <div className={clsx('w-full max-w-full min-w-0 rounded-xl bg-white p-4 shadow-xs dark:bg-neutral-800', className)}>
      <Transition show={!isActive}>
        <button
          type="button"
          className="flex w-full min-w-0 gap-x-3 text-start text-sm font-medium sm:gap-x-5"
          onClick={headingOnClick}
        >
          <p className="shrink-0 text-neutral-400">{headingTitle}</p>
          <div className="min-w-0 flex-1 text-end">
            <span className="line-clamp-1">{headingValue}</span>
          </div>
        </button>
      </Transition>
      <Transition unmount={false} show={isActive} as="div">
        {children}
      </Transition>
    </div>
  )
}

export default FieldPanelContainer
