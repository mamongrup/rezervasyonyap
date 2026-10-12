import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { requestJsonBody } from './http-json-body.mjs'

test('supplier GET keeps JSON authorization and array body out of URL', async () => {
  const server = http.createServer(async (req, res) => {
    let body = ''
    for await (const chunk of req) body += chunk
    assert.equal(req.method, 'GET')
    assert.equal(req.url, '/periods')
    assert.deepEqual(JSON.parse(body), { authorization: { token: 'test' }, ids: [12, 34] })
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end('{"data":[]}')
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const response = await requestJsonBody(new URL(`http://127.0.0.1:${server.address().port}/periods`), 'GET', { authorization: { token: 'test' }, ids: [12, 34] })
    assert.equal(response.ok, true)
    assert.deepEqual(JSON.parse(await response.text()), { data: [] })
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
