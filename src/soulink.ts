import { verifyMessage, type Address } from 'viem'
import { publicClient } from './contract.js'
import { config } from './config.js'
import type {
  SoulinkResolveResponse,
  SoulinkCreditResponse,
  SoulinkVerifyResponse,
  SoulinkReportRequest,
} from './types.js'

const REGISTRY = '0x15d13ED36b337Dff3d5877ed46655037Ee4C1bE0' as Address

const registryAbi = [
  {
    type: 'function', name: 'resolve',
    inputs: [{ type: 'string', name: 'name' }],
    outputs: [{
      type: 'tuple',
      components: [
        { type: 'uint256', name: 'tokenId' },
        { type: 'address', name: 'owner' },
        { type: 'bytes32', name: 'soulHash' },
        { type: 'address', name: 'paymentAddress' },
        { type: 'uint256', name: 'registeredAt' },
        { type: 'uint256', name: 'expiresAt' },
      ],
    }],
    stateMutability: 'view',
  },
] as const

export function createSoulinkClient(_baseUrl: string) {
  return {
    async resolve(name: string): Promise<SoulinkResolveResponse> {
      const result = await publicClient.readContract({
        address: REGISTRY,
        abi: registryAbi,
        functionName: 'resolve',
        args: [name],
      })
      return {
        name: `${name}.agent`,
        owner: result.owner,
        expires_at: new Date(Number(result.expiresAt) * 1000).toISOString(),
      }
    },

    async credit(name: string): Promise<SoulinkCreditResponse> {
      const identity = await publicClient.readContract({
        address: REGISTRY,
        abi: registryAbi,
        functionName: 'resolve',
        args: [name],
      })
      const score = await publicClient.readContract({
        address: config.poolContractAddress,
        abi: [{ type: 'function', name: 'creditScores', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' }],
        functionName: 'creditScores',
        args: [identity.owner],
      })
      return {
        name,
        score: Number(score),
        total_reports: 0,
        positive: 0,
        negative: 0,
        updated_at: null,
      }
    },

    async verify(req: { name: string; signature: string; message: string }): Promise<SoulinkVerifyResponse> {
      const identity = await publicClient.readContract({
        address: REGISTRY,
        abi: registryAbi,
        functionName: 'resolve',
        args: [req.name],
      })

      const parts = req.message.split(':')
      if (parts.length !== 3 || parts[0] !== 'soulink' || parts[1] !== req.name) {
        return { valid: false, error: 'Invalid message format' }
      }

      const timestamp = parseInt(parts[2], 10)
      const now = Math.floor(Date.now() / 1000)
      if (Math.abs(now - timestamp) > 300) {
        return { valid: false, error: 'Message expired (5-min TTL)' }
      }

      const valid = await verifyMessage({
        address: identity.owner,
        message: req.message,
        signature: req.signature as `0x${string}`,
      })

      return valid
        ? { valid: true, name: req.name, owner: identity.owner }
        : { valid: false, error: 'Signature mismatch' }
    },

    async submitReport(_req: SoulinkReportRequest): Promise<{ id: string; recorded: boolean }> {
      // Credit reports are handled via pool.write.updateCredit() directly
      return { id: 'local', recorded: true }
    },
  }
}
