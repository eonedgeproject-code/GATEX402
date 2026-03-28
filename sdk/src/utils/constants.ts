import { TokenInfo } from '../types';

export const DEFAULT_RPC: Record<string, string> = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
};

export const GATEWAY_API = 'https://api.gatex402.com/v1';
export const PAYMENT_LINK_BASE = 'https://pay.gatex402.com/p';

export const DEFAULT_RISK_THRESHOLD = 0.7;
export const DEFAULT_CHECKOUT_EXPIRY = 300; // 5 min
export const DEFAULT_ESCROW_EXPIRY = 86400; // 24h
export const DEFAULT_MICRO_SETTLE = 100;

export const KNOWN_TOKENS: Record<string, TokenInfo> = {
  SOL: {
    symbol: 'SOL',
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
  },
  USDC: {
    symbol: 'USDC',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
  },
  USDT: {
    symbol: 'USDT',
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    decimals: 6,
  },
};

export function resolveToken(symbolOrMint: string): TokenInfo {
  const upper = symbolOrMint.toUpperCase();
  if (KNOWN_TOKENS[upper]) return KNOWN_TOKENS[upper];

  // Assume custom SPL mint address
  return {
    symbol: symbolOrMint.slice(0, 6).toUpperCase(),
    mint: symbolOrMint,
    decimals: 9, // default, will be fetched on-chain
  };
}
