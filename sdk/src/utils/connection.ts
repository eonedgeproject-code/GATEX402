import { Connection } from '@solana/web3.js';
import { DEFAULT_RPC } from './constants';

const connectionCache = new Map<string, Connection>();

export function getConnection(
  network: 'mainnet' | 'devnet' = 'mainnet',
  customRpc?: string
): Connection {
  const endpoint = customRpc || DEFAULT_RPC[network];
  if (!connectionCache.has(endpoint)) {
    connectionCache.set(
      endpoint,
      new Connection(endpoint, { commitment: 'confirmed' })
    );
  }
  return connectionCache.get(endpoint)!;
}
