import { test } from 'node:test'
import assert from 'node:assert/strict'
import { discoverGemini, providerJson, recoveryCandidates, saveVerifiedGemini, verifyGemini } from './lib/ai-provider-recovery.mjs'

test('discovery follows pagination and excludes non-generative models', async () => {
  const requests = []
  const result = await discoverGemini('SECRET', async (url, init) => {
    requests.push({url,init})
    return Response.json(requests.length===1 ? { models:[{name:'models/embed',supportedGenerationMethods:['embedContent']}], nextPageToken:'page2' } : {models:[{name:'models/gemini-9.1-flash',supportedGenerationMethods:['generateContent']}]})
  })
  assert.deepEqual(result, {ok:true,models:['gemini-9.1-flash']})
  assert.ok(requests[1].url.includes('pageToken=page2'))
  assert.ok(!requests[0].url.includes('SECRET'))
})
test('candidates preserve supported config and never invent a model or auto-select preview/pro', () => {
  const models=['gemini-9.0-pro','gemini-9.1-flash-preview','gemini-8.1-flash','gemini-9.1-flash']
  assert.deepEqual(recoveryCandidates(models,'retired'),['gemini-9.1-flash','gemini-8.1-flash'])
  assert.equal(recoveryCandidates(models,'gemini-8.1-flash')[0],'gemini-8.1-flash')
  assert.deepEqual(recoveryCandidates(['embedding'],'retired'),[])
})
test('generation must return usable first-part JSON, not merely HTTP 200', async () => {
  const fake = (text) => async () => Response.json({candidates:[{content:{parts:[{text}]}}]})
  assert.equal((await verifyGemini('key','model',fake('{"ok":true}'))).ok,true)
  assert.equal((await verifyGemini('key','model',fake(''))).ok,false)
  assert.equal((await verifyGemini('key','model',fake('```json\n{"ok":true}\n```'))).ok,false)
  assert.equal((await verifyGemini('key','../bad',fake('{}'))).error,'invalid_model_name')
})
test('authentication and network failures never expose provider responses or credentials', async () => {
  const result = await providerJson('https://example.test', {}, async () => new Response('secret-token', {status:401}))
  assert.deepEqual(result,{ok:false,error:'http_401'})
  assert.deepEqual(await discoverGemini('SECRET',async () => { throw new Error('SECRET') }),{ok:false,error:'network_timeout_or_invalid_json'})
})
test('saving changes only the model and fails on a concurrent settings update', async () => {
  let captured
  const settings={id:'test',value_json:{deepseek_api_key:'secret',gemini_model:'old'}}
  await saveVerifiedGemini({query:async (...args)=>{captured=args;return {rowCount:1}}},settings,'new')
  assert.ok(captured[0].includes("jsonb_set(value_json,'{gemini_model}'"))
  assert.deepEqual(captured[1],['test','new',JSON.stringify(settings.value_json)])
  await assert.rejects(saveVerifiedGemini({query:async ()=>({rowCount:0})},settings,'new'),/ai_settings_changed_or_missing/)
})
