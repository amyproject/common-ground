// Hosted volunteer storage: Upstash Redis over its REST API. Vercel's Upstash/KV
// integration sets KV_REST_API_URL and KV_REST_API_TOKEN (or the UPSTASH_* names).
export function upstashConfig(env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null
}

export function upstashStore({ url, token }, prefix = 'cg:') {
  const command = async (...args) => {
    const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
    const body = await response.json().catch(() => ({}))
    if (!response.ok || body.error) throw new Error(`Upstash ${args[0]} failed: ${body.error ?? response.status}`)
    return body.result
  }
  return {
    async hget(hash, field) { return (await command('HGET', prefix + hash, field)) ?? null },
    async hset(hash, field, value) { await command('HSET', prefix + hash, field, value) },
    async hsetnx(hash, field, value) { return (await command('HSETNX', prefix + hash, field, value)) === 1 },
    async hgetall(hash) {
      const flat = (await command('HGETALL', prefix + hash)) ?? []
      const out = {}
      for (let i = 0; i < flat.length; i += 2) out[flat[i]] = flat[i + 1]
      return out
    },
  }
}
