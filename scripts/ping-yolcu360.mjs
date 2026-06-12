#!/usr/bin/env node
import { loadYolcu360ConfigFromDb } from './lib/listing-api-providers-db.mjs'
import { pingYolcu360 } from './lib/yolcu360-api.mjs'

const cfg = await loadYolcu360ConfigFromDb()
console.log('Yolcu360 config:', { baseUrl: cfg.baseUrl, enabled: cfg.enabled })
const out = await pingYolcu360(cfg)
console.log('[Yolcu360] OK —', out)
