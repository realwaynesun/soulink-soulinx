const OKX_TICKER_URL = 'https://www.okx.com/api/v5/market/ticker?instId=OKB-USDT'
const CACHE_TTL_MS = 60_000

let cached: { price: number; fetchedAt: number } | null = null

function isCacheValid(): boolean {
  return cached !== null && Date.now() - cached.fetchedAt < CACHE_TTL_MS
}

export async function getOkbPrice(): Promise<number> {
  if (isCacheValid()) return cached!.price

  const res = await fetch(OKX_TICKER_URL)
  if (!res.ok) {
    throw new Error(`OKX API failed: ${res.status} ${res.statusText}`)
  }

  const body = await res.json() as { data?: Array<{ last?: string }> }
  const last = body.data?.[0]?.last
  if (!last) {
    throw new Error('OKX API returned no price data')
  }

  const price = Number(last)
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`OKX API returned invalid price: ${last}`)
  }

  cached = { price, fetchedAt: Date.now() }
  return price
}

/** Visible for testing only */
export function _clearCache(): void {
  cached = null
}
