import { privateKeyToAccount } from 'viem/accounts'
import { config } from './config.js'

export async function signReport(): Promise<{
  reporter_name: string
  reporter_signature: string
  reporter_message: string
}> {
  const account = privateKeyToAccount(config.operatorPrivateKey)
  const timestamp = Math.floor(Date.now() / 1000)
  const message = `soulink:${config.poolAgentName}:${timestamp}`
  const signature = await account.signMessage({ message })
  return {
    reporter_name: config.poolAgentName,
    reporter_signature: signature,
    reporter_message: message,
  }
}
