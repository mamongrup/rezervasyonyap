'use client'

interface WizardStepFooterProps {
  currentStep: number
  totalSteps: number
  onBack: () => void
  onNext: () => void
  /** Mevcut adımda kaydet aksiyonu için click handler — her adımda buton gösterilir */
  onSave?: () => void
  isSaving?: boolean
  isLastStep?: boolean
}

export default function WizardStepFooter({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSave,
  isSaving = false,
  isLastStep,
}: WizardStepFooterProps) {
  const lastStep = isLastStep ?? currentStep === totalSteps - 1

  return (
    <div className="sticky bottom-0 z-20 flex items-center justify-between border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-900/95 sm:px-6">
      {/* Sol: Geri */}
      <button
        type="button"
        onClick={onBack}
        disabled={currentStep === 0}
        className={[
          'flex items-center gap-2 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium transition-all dark:border-neutral-600',
          currentStep === 0
            ? 'invisible'
            : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800',
        ].join(' ')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Geri
      </button>

      {/* Orta: adım sayacı */}
      <span className="text-xs text-neutral-400 dark:text-neutral-500 sm:text-sm">
        {currentStep + 1} / {totalSteps}
      </span>

      {/* Sağ: Kaydet (opsiyonel) + İleri/Yayınla */}
      <div className="flex items-center gap-2">
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="hidden rounded-xl border border-primary-500 px-4 py-2.5 text-sm font-medium text-primary-600 transition-all hover:bg-primary-50 disabled:opacity-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-900/20 sm:flex sm:items-center sm:gap-2"
          >
            {isSaving ? (
              <>
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Kaydediliyor…
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Kaydet
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 active:scale-95"
        >
          {lastStep ? (
            <>
              Yayınla
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </>
          ) : (
            <>
              İleri
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
