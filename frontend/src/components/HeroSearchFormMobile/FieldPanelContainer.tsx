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
    <div className={clsx('w-full rounded-xl bg-white p-4 shadow-xs dark:bg-neutral-800', className)}>
      <Transition show={!isActive}>
        <button type="button" className="flex w-full gap-x-5 text-sm font-medium" onClick={headingOnClick}>
          <p className="shrink-0 text-neutral-400">{headingTitle}</p>
          <div className="flex w-full justify-end">
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
