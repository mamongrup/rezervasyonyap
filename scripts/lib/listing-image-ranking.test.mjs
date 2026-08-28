import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { classifyImageScene, sortGalleryImages } from './listing-image-ranking.mjs'

describe('listing-image-ranking', () => {
  it('classifies Turkish and English scene terms correctly', () => {
    assert.equal(classifyImageScene('BANYO/banyo-1.jpg').scene_code, 'bathroom')
    assert.equal(classifyImageScene('uploads/listings/villas/bathroom-view.avif').scene_code, 'bathroom')
    assert.equal(classifyImageScene('1. YATAK ODASI/oda1.jpg').scene_code, 'bedroom')
    assert.equal(classifyImageScene('master-bedroom.jpg').scene_code, 'bedroom')
    assert.equal(classifyImageScene('HAVUZ/sonsuzluk-havuz.jpg').scene_code, 'pool')
    assert.equal(classifyImageScene('deniz-manzarasi-genel.jpg').scene_code, 'sea_view')
    assert.equal(classifyImageScene('dis-cephe-drone.jpg').scene_code, 'sea_view')
    assert.equal(classifyImageScene('SALON/salon-mutfak.jpg').scene_code, 'living')
    assert.equal(classifyImageScene('hamam-spa.jpg').scene_code, 'hammam')
    assert.equal(classifyImageScene('sauna-ahsap.jpg').scene_code, 'sauna')
    assert.equal(classifyImageScene('kat-plani.pdf').scene_code, 'unspecified')
  })

  it('sorts gallery items so exterior/pool/living are first and bedroom/bathroom are last', () => {
    const rawFiles = [
      'BANYO/01.jpg',
      'YATAK ODASI/01.jpg',
      'HAVUZ/01.jpg',
      'DENIZ/manzara.jpg',
      'SALON/01.jpg',
      'YATAK ODASI/02.jpg',
      'BANYO/02.jpg',
    ]

    const sorted = sortGalleryImages(rawFiles, (f) => f)

    assert.deepEqual(sorted, [
      'DENIZ/manzara.jpg', // Sea / exterior (priority 10)
      'HAVUZ/01.jpg',      // Pool (priority 20)
      'SALON/01.jpg',      // Living (priority 30)
      'YATAK ODASI/01.jpg',// Bedroom 1 (priority 50)
      'YATAK ODASI/02.jpg',// Bedroom 2 (priority 50)
      'BANYO/01.jpg',      // Bathroom 1 (priority 70)
      'BANYO/02.jpg',      // Bathroom 2 (priority 70)
    ])
  })

  it('preserves order within same priority category', () => {
    const rawFiles = [
      'BANYO/01-ana.jpg',
      'BANYO/02-ebeveyn.jpg',
      'BANYO/03-misafir.jpg',
    ]
    const sorted = sortGalleryImages(rawFiles, (f) => f)
    assert.deepEqual(sorted, [
      'BANYO/01-ana.jpg',
      'BANYO/02-ebeveyn.jpg',
      'BANYO/03-misafir.jpg',
    ])
  })
})
