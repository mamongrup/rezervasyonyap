import {
  COMPANY,
  COMPANY_PHONE_PRIMARY,
  COMPANY_PHONE_SECONDARY,
  companyAddressFull,
  formatTursabLabel,
} from '@/lib/corporate/company'

export function fillFaqPlaceholders(text: string): string {
  return text
    .replaceAll('{brand}', COMPANY.brandName)
    .replaceAll('{legalName}', COMPANY.legalName)
    .replaceAll('{agency}', COMPANY.agencyName)
    .replaceAll('{tursab}', formatTursabLabel())
    .replaceAll('{address}', companyAddressFull())
    .replaceAll('{email}', COMPANY.email)
    .replaceAll('{phone}', COMPANY_PHONE_PRIMARY)
    .replaceAll('{phone2}', COMPANY_PHONE_SECONDARY)
    .replaceAll('{officePhones}', COMPANY.phones.office.join(' / '))
    .replaceAll('{site}', COMPANY.siteUrl)
}
