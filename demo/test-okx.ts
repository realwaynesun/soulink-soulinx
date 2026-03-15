import { createHmac } from 'crypto'

async function main() {
  const baseUrl = 'https://web3.okx.com'
  const path = '/api/v6/wallet/payments/supported'
  const timestamp = new Date().toISOString()
  const sign = createHmac('sha256', process.env.OKX_API_SECRET!).update(timestamp + 'GET' + path + '').digest('base64')
  const res = await fetch(baseUrl + path, {
    headers: {
      'OK-ACCESS-KEY': process.env.OKX_API_KEY!,
      'OK-ACCESS-SIGN': sign,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': process.env.OKX_API_PASSPHRASE!,
      'Content-Type': 'application/json',
    },
  })
  console.log('Status:', res.status)
  const text = await res.text()
  console.log('Response:', text.slice(0, 500))
}
main()
