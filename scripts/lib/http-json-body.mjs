import http from 'node:http'
import https from 'node:https'

// This supplier specifies GET with a JSON request body. Fetch forbids that;
// use Node's HTTP transport without changing the supplier's HTTP contract.
export function requestJsonBody(url, method, body) {
  const payload = JSON.stringify(body)
  const transport = url.protocol === 'https:' ? https : http
  return new Promise((resolve, reject) => {
    const req = transport.request(url, {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('error', reject)
      res.on('end', () => resolve({
        ok: res.statusCode >= 200 && res.statusCode < 300,
        status: res.statusCode,
        statusText: res.statusMessage,
        text: async () => Buffer.concat(chunks).toString('utf8'),
      }))
    })
    req.setTimeout(30000, () => req.destroy(new Error('Supplier request timeout')))
    req.on('error', reject)
    req.end(payload)
  })
}
