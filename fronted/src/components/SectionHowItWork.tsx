import HIW1img from '@/images/HIW1.png'
import HIW2img from '@/images/HIW2.png'
import HIW3img from '@/images/HIW3.png'
import VectorImg from '@/images/VectorHIW.svg'
import { en } from '../../public/locales/en'
import Heading from '@/shared/Heading'
import Image, { StaticImageData } from 'next/image'
import { FC } from 'react'

const HIW_FALLBACK = en.homePage.howItWorks
const STEP_IMAGES: StaticImageData[] = [HIW1img, HIW2img, HIW3img]

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
  const data = steps.map((step, i) => ({
    ...step,
    img: STEP_IMAGES[i] ?? HIW1img,
  }))

  return (
    <div className={`nc-SectionHowItWork ${className}`} data-nc-id="SectionHowItWork">
      <Heading isCenter subheading={subheading}>
        {title}
      </Heading>
      <div className="relative mt-20 grid gap-20 md:grid-cols-3">
        <Image className="absolute inset-x-0 top-10 hidden md:block" src={VectorImg} alt="" />
        {data.map((item) => (
          <div key={item.id} className="relative mx-auto flex max-w-xs flex-col items-center">
            <Image alt="" className="mx-auto mb-8 max-w-[180px]" src={item.img} />
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
