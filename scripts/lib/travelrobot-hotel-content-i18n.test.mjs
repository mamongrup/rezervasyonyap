import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  extractTravelrobotHotelTranslations,
  hasEditorialHtmlStructure,
} from './travelrobot-listing-db.mjs'

test('KPlus I18nDetails içeriklerini doğru site dillerine ayırır', () => {
  const translations = extractTravelrobotHotelTranslations({
    I18nDetails: {
      en: { Hotel: { HotelName: 'Blue Hotel', Description: 'English description' } },
      'zh-CN': { Result: { Name: '蓝色酒店', SummaryText: '中文酒店介绍' } },
      es: { Name: 'Hotel Azul', Description: 'No soportado' },
    },
  })
  assert.deepEqual(translations.en, {
    title: 'Blue Hotel',
    description: 'English description',
  })
  assert.deepEqual(translations.zh, {
    title: '蓝色酒店',
    description: '中文酒店介绍',
  })
  assert.equal(translations.es, undefined)
})

test('editoryal HTML ile düz sağlayıcı metnini ayırır', () => {
  assert.equal(hasEditorialHtmlStructure('<h2>Konum</h2><p>Denize yakındır.</p>'), true)
  assert.equal(hasEditorialHtmlStructure('Konum Denize yakındır. Odalar ve olanaklar.'), false)
})
