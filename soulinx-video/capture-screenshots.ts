import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'

const SCREENSHOTS_DIR = './public/screenshots'

const PAGES = [
  {
    name: 'pool-contract',
    url: 'https://www.oklink.com/xlayer/address/0xBCae727ABBD3f4237894268deF39E2Ce66376DC5',
    desc: 'SoulinXPool contract on OKLink',
  },
  {
    name: 'alice-repay-tx',
    url: 'https://www.oklink.com/xlayer/tx/0xdffa08799e4b66bc4efd22e5e0e6dd457bf5a9bea97f9b7f48e3a38e4e0f3ebc',
    desc: 'Alice repay transaction',
  },
  {
    name: 'deposit-tx',
    url: 'https://www.oklink.com/xlayer/tx/0xb10959a8e56dbac4c4bb808c9ad89a5e7a8ce03dcba1e84d1b1db2abe5d2c7f3',
    desc: 'Lender deposit transaction',
  },
  {
    name: 'alice-registration',
    url: 'https://www.oklink.com/xlayer/tx/0x1201baf93321a00efb55d82c90ac94e054df2d5af876694398afbcab42b0a12c',
    desc: 'alice.agent registration',
  },
  {
    name: 'soulink-registry',
    url: 'https://www.oklink.com/xlayer/address/0x15d13ed36b337dff3d5877ed46655037ee4c1be0',
    desc: 'Soulink Registry on X Layer',
  },
]

async function main() {
  await mkdir(SCREENSHOTS_DIR, { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })

  for (const page of PAGES) {
    console.log(`Capturing: ${page.desc}...`)
    const p = await context.newPage()
    await p.goto(page.url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
    await p.waitForTimeout(3000)
    // Hide cookie banners
    await p.evaluate(() => {
      document.querySelectorAll('[class*="cookie"], [class*="consent"], [class*="banner"]').forEach(el => (el as HTMLElement).style.display = 'none')
    }).catch(() => {})
    await p.screenshot({ path: `${SCREENSHOTS_DIR}/${page.name}.png`, fullPage: false })
    await p.close()
    console.log(`  Saved: ${SCREENSHOTS_DIR}/${page.name}.png`)
  }

  await browser.close()
  console.log('\nAll screenshots captured!')
}

main()
