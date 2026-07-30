import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parseTatilbudurPriceNumber,
  pickTatilbudurStayTotalPrice,
} from './tatilbudur-stay-price.mjs'

describe('pickTatilbudurStayTotalPrice', () => {
  it('prefers Toplam Fiyat over Worldcard sepette line', () => {
    const total = pickTatilbudurStayTotalPrice({
      text: [
        '2 Yetişkin + 2 Çocuk 7 Gece',
        'Ultra Her Şey Dahil',
        '223.911 TL',
        'Toplam Fiyat',
        '110.395 TL',
        'Worldcard ile sepette %8',
        '101.563 TL',
        'Rezervasyon Yap',
      ].join(' '),
      price_texts: ['223.911 TL', '110.395 TL', '101.563 TL'],
    })
    assert.equal(total, 110395)
  })

  it('drops last price when it looks like card discount of previous', () => {
    const total = pickTatilbudurStayTotalPrice({
      text: 'Toplam Fiyat mevcut Rezervasyon Yap',
      price_texts: ['110.395 TL', '101.563 TL'],
    })
    assert.equal(total, 110395)
  })

  it('keeps single price when no card campaign', () => {
    const total = pickTatilbudurStayTotalPrice({
      text: 'Toplam Fiyat 85.000 TL Rezervasyon Yap',
      price_texts: ['85.000 TL'],
    })
    assert.equal(total, 85000)
  })

  it('returns null when only card campaign price remains ambiguous', () => {
    const total = pickTatilbudurStayTotalPrice({
      text: 'Worldcard ile sepette %8 101.563 TL',
      price_texts: ['101.563 TL'],
    })
    assert.equal(total, null)
  })

  it('parses dotted thousands', () => {
    assert.equal(parseTatilbudurPriceNumber('101.563 TL'), 101563)
    assert.equal(parseTatilbudurPriceNumber('110.395'), 110395)
  })
})
