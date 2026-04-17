'use client'

import { useAddListingsMessages } from '@/hooks/useAddListingsMessages'
import { useVitrinHref } from '@/hooks/use-vitrin-href'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Divider } from '@/shared/divider'
import { Fieldset, Label, Legend } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { Radio, RadioField, RadioGroup } from '@/shared/radio'
import { Cancel01Icon, PlusSignIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const Page = () => {
  const L = useAddListingsMessages()
  const router = useRouter()
  const vitrinPath = useVitrinHref()
  const nextHref = vitrinPath('/add-listing/6')

  useEffect(() => {
    router.prefetch(nextHref)
  }, [router, nextHref])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    console.log('Form submitted:', formObject)

    router.push(nextHref)
  }

  const renderNoInclude = (text: string) => {
    return (
      <div className="flex items-center justify-between py-3">
        <span className="flex-1 text-neutral-600 dark:text-neutral-400">{text}</span>
        <div className="cursor-pointer">
          <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" strokeWidth={1.75} />
        </div>
      </div>
    )
  }

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">{L.page5.pageTitle}</h2>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          {L.page5.pageDescription}
        </span>
      </div>

      <Divider />

      <Form id="add-listing-form" action={handleSubmitForm} className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
        <Fieldset>
          <Legend className="text-lg!">{L.page5.Smoking}</Legend>
          <RadioGroup name="Smoking" defaultValue="Allow">
            <RadioField>
              <Radio value="not" />
              <Label>{L.page5.radioDoNotAllow}</Label>
            </RadioField>
            <RadioField>
              <Radio value="Allow" />
              <Label>{L.page5.radioAllow}</Label>
            </RadioField>
            <RadioField>
              <Radio value="Charge" />
              <Label>{L.page5.radioCharge}</Label>
            </RadioField>
          </RadioGroup>
        </Fieldset>

        <Fieldset>
          <Legend className="text-lg!">{L.page5.Pets}</Legend>
          <RadioGroup name="Pets" defaultValue="Allow">
            <RadioField>
              <Radio value="not" />
              <Label>{L.page5.radioDoNotAllow}</Label>
            </RadioField>
            <RadioField>
              <Radio value="Allow" />
              <Label>{L.page5.radioAllow}</Label>
            </RadioField>
            <RadioField>
              <Radio value="Charge" />
              <Label>{L.page5.radioCharge}</Label>
            </RadioField>
          </RadioGroup>
        </Fieldset>

        <Fieldset>
          <Legend className="text-lg!">{L.page5['Party organizing']}</Legend>
          <RadioGroup name="Partyorganizing" defaultValue="Allow">
            <RadioField>
              <Radio value="not" />
              <Label>{L.page5.radioDoNotAllow}</Label>
            </RadioField>
            <RadioField>
              <Radio value="Allow" />
              <Label>{L.page5.radioAllow}</Label>
            </RadioField>
            <RadioField>
              <Radio value="Charge" />
              <Label>{L.page5.radioCharge}</Label>
            </RadioField>
          </RadioGroup>
        </Fieldset>

        <Fieldset>
          <Legend className="text-lg!">{L.page5.Cooking}</Legend>
          <RadioGroup name="Cooking" defaultValue="Do">
            <RadioField>
              <Radio value="Do" />
              <Label>{L.page5.radioDo}</Label>
            </RadioField>
            <RadioField>
              <Radio value="Allow" />
              <Label>{L.page5.radioAllow}</Label>
            </RadioField>
            <RadioField>
              <Radio value="Charge" />
              <Label>{L.page5.radioCharge}</Label>
            </RadioField>
          </RadioGroup>
        </Fieldset>

        <input type="hidden" name="Additionalrules[]" value={L.page5.ruleNoSmokingCommon} />
        <input type="hidden" name="Additionalrules[]" value={L.page5.ruleNoShoesIndoors} />
        <input type="hidden" name="Additionalrules[]" value={L.page5.ruleNoCookingBedroom} />
        {/* ...more */}
      </Form>

      <Divider />

      <p className="block text-lg font-semibold">{L.page5['Additional rules']}</p>
      <div className="flow-root">
        <div className="-my-3 divide-y divide-neutral-100 dark:divide-neutral-800">
          {renderNoInclude(L.page5.ruleNoSmokingCommon)}
          {renderNoInclude(L.page5.ruleNoShoesIndoors)}
          {renderNoInclude(L.page5.ruleNoCookingBedroom)}
        </div>
      </div>
      <div className="flex flex-col gap-x-5 gap-y-3 sm:flex-row sm:justify-between">
        <Input placeholder={L.page5['No smoking']} />
        <ButtonPrimary>
          <HugeiconsIcon icon={PlusSignIcon} className="h-5 w-5" strokeWidth={1.75} />
          <span>{L.page5['Add tag']}</span>
        </ButtonPrimary>
      </div>
    </>
  )
}

export default Page
