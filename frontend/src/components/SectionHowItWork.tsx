import VectorImg from '@/images/VectorHIW.svg'
import { en } from '../../public/locales/en'
import Heading from '@/shared/Heading'
import Image from 'next/image'
import { FC } from 'react'

const HIW_FALLBACK = en.homePage.howItWorks

export interface HowItWorkStep {
  id: number
  title: string
  desc: string
}

export interface SectionHowItWorkProps {
  className?: string
  /** Verilmezse `en` şablonundaki 3 adım */
  steps?: HowItWorkStep[]
  title?: string
  subheading?: string
}

const defaultSteps: HowItWorkStep[] = [
  {
    id: 1,
    title: HIW_FALLBACK.step1Title,
    desc: HIW_FALLBACK.step1Desc,
  },
  {
    id: 2,
    title: HIW_FALLBACK.step2Title,
    desc: HIW_FALLBACK.step2Desc,
  },
  {
    id: 3,
    title: HIW_FALLBACK.step3Title,
    desc: HIW_FALLBACK.step3Desc,
  },
]

const SectionHowItWork: FC<SectionHowItWorkProps> = ({
  className = '',
  steps = defaultSteps,
  title = HIW_FALLBACK.title,
  subheading = HIW_FALLBACK.subheading,
}) => {
  return (
    <div className={`nc-SectionHowItWork ${className}`} data-nc-id="SectionHowItWork">
      <Heading isCenter subheading={subheading}>
        {title}
      </Heading>
      <div className="relative mt-20 grid gap-20 md:grid-cols-3">
        <Image className="absolute inset-x-0 top-10 hidden md:block" src={VectorImg} alt="" />
        {steps.map((item, index) => (
          <div key={item.id} className="relative mx-auto flex max-w-xs flex-col items-center">
            <div
              className="relative z-10 mb-8 flex size-28 items-center justify-center rounded-[2rem] bg-gradient-to-br from-primary-50 to-secondary-50 text-primary-700 shadow-sm ring-1 ring-primary-100 dark:from-neutral-800 dark:to-neutral-900 dark:text-primary-300 dark:ring-neutral-700"
              aria-hidden
            >
              <span className="text-4xl font-semibold tabular-nums">{String(index + 1).padStart(2, '0')}</span>
            </div>
            <div className="mt-auto text-center">
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <span className="mt-5 block text-neutral-500 dark:text-neutral-400">{item.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SectionHowItWork
