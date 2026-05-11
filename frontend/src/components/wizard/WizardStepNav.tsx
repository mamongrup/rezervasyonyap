'use client'

import type { ReactNode } from 'react'

export type WizardStep = {
  label: string
  shortLabel: string
  icon: ReactNode
}

interface WizardStepNavProps {
  steps: WizardStep[]
  currentStep: number
  /** Düzenleme modunda tüm adımlara atlanabilir; yeni oluştururken yalnızca geçmiş adımlar */
  canJumpFreely: boolean
  onStepClick: (index: number) => void
}

export default function WizardStepNav({
  steps,
  currentStep,
  canJumpFreely,
  onStepClick,
}: WizardStepNavProps) {
  return (
    <nav aria-label="İlan oluşturma adımları" className="w-full">
      {/* Masaüstü: tam etiket */}
      <ol className="hidden items-center sm:flex">
        {steps.map((step, i) => {
          const isDone = i < currentStep
          const isActive = i === currentStep
          const clickable = canJumpFreely ? true : i <= currentStep
          return (
            <li key={i} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => clickable && onStepClick(i)}
                disabled={!clickable}
                className={[
                  'group flex flex-col items-center gap-1.5 outline-none',
                  clickable ? 'cursor-pointer' : 'cursor-default',
                ].join(' ')}
                aria-current={isActive ? 'step' : undefined}
              >
                {/* Daire */}
                <span
                  className={[
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all',
                    isDone
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : isActive
                        ? 'border-primary-600 bg-white text-primary-600 shadow-md dark:bg-neutral-900'
                        : 'border-neutral-300 bg-white text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-500',
                  ].join(' ')}
                >
                  {isDone ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step.icon
                  )}
                </span>
                {/* Etiket */}
                <span
                  className={[
                    'text-xs font-medium transition-colors',
                    isActive
                      ? 'text-primary-600 dark:text-primary-400'
                      : isDone
                        ? 'text-neutral-700 dark:text-neutral-300'
                        : 'text-neutral-400 dark:text-neutral-600',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </button>

              {/* Bağlantı çizgisi */}
              {i < steps.length - 1 && (
                <div className="mx-2 mt-[-18px] h-0.5 flex-1 transition-colors" style={{
                  backgroundColor: i < currentStep ? 'var(--color-primary-500, #6366f1)' : '#e5e7eb',
                }} />
              )}
            </li>
          )
        })}
      </ol>

      {/* Mobil: sadece aktif adım + ilerleme çubuğu */}
      <div className="flex items-center gap-3 sm:hidden">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
          {currentStep + 1}
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">
            {steps[currentStep]?.label}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Adım {currentStep + 1} / {steps.length}
          </p>
        </div>
        {/* Mini adım noktaları */}
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => (canJumpFreely || i <= currentStep) && onStepClick(i)}
              disabled={!canJumpFreely && i > currentStep}
              className={[
                'h-1.5 rounded-full transition-all',
                i === currentStep
                  ? 'w-5 bg-primary-600'
                  : i < currentStep
                    ? 'w-1.5 bg-primary-400'
                    : 'w-1.5 bg-neutral-300 dark:bg-neutral-700',
              ].join(' ')}
            />
          ))}
        </div>
      </div>
    </nav>
  )
}
