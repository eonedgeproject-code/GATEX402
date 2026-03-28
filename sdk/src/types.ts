import { Keypair } from '@solana/web3.js';

// ── Configuration ──

export interface GateConfig {
  /** Solana wallet address of the merchant (required) */
  merchant: string;
  /** Solana network */
  network?: 'mainnet' | 'devnet';
  /** Accepted token symbols or SPL mint addresses */
  accept?: string[];
  /** Checkout modal theme */
  theme?: 'dark' | 'light' | 'auto';
  /** Custom RPC endpoint URL */
  rpc?: string;
  /** Webhook URL for payment notifications */
  webhook?: string;
  /** XVA-402 risk score threshold (0-1). Transactions above are flagged */
  riskThreshold?: number;
  /** Auto-convert received tokens to this currency */
  autoConvert?: string;
  /** Enable escrow mode */
  escrow?: boolean;
}

export interface HeadlessConfig extends GateConfig {
  /** Keypair or wallet adapter for signing */
  signer: Keypair | WalletAdapter;
}

export interface WalletAdapter {
  publicKey: { toBase58(): string };
  signTransaction(tx: any): Promise<any>;
  signAllTransactions?(txs: any[]): Promise<any[]>;
}

// ── Payment Options ──

export interface PaymentOptions {
  /** Payment amount (required) */
  amount: number;
  /** Token symbol or SPL mint address */
  currency?: string;
  /** On-chain memo */
  memo?: string;
  /** Custom metadata (sent to webhook) */
  metadata?: Record<string, any>;
  /** Redirect URL after payment */
  redirectUrl?: string;
  /** Checkout expiration in seconds */
  expiry?: number;
}

// ── Transaction ──

export interface Transaction {
  /** Transaction signature */
  signature: string;
  /** Settled amount */
  amount: number;
  /** Token used */
  currency: string;
  /** Payer wallet address */
  from: string;
  /** Merchant wallet address */
  to: string;
  /** XVA-402 risk score (0-1) */
  riskScore: number;
  /** On-chain memo */
  memo: string;
  /** Custom metadata */
  metadata: Record<string, any>;
  /** Unix timestamp */
  timestamp: number;
}

// ── Payment Link ──

export interface LinkOptions {
  /** Payment amount */
  amount: number;
  /** Token symbol */
  currency?: string;
  /** Display label */
  label?: string;
  /** Expiry duration (e.g. '24h', '7d') or seconds */
  expiry?: string | number;
}

export interface PaymentLink {
  /** Full payment URL */
  url: string;
  /** Link ID */
  id: string;
  /** Expiry timestamp */
  expiry: number;
}

// ── Escrow ──

export interface EscrowOptions {
  /** Escrow amount */
  amount: number;
  /** Token symbol */
  currency?: string;
  /** Worker/payee wallet address */
  payee: string;
  /** Auto-refund expiry in seconds */
  expiry?: number;
  /** On-chain memo */
  memo?: string;
}

export interface EscrowContract {
  /** Escrow ID */
  id: string;
  /** Locked amount */
  amount: number;
  /** Token used */
  currency: string;
  /** Escrow status */
  status: 'locked' | 'released' | 'refunded' | 'disputed';
  /** Parties involved */
  parties: { payer: string; payee: string };
  /** Expiry timestamp */
  expiry: number;
  /** Release funds to payee */
  release(): Promise<Transaction>;
  /** Refund funds to payer */
  refund(): Promise<Transaction>;
}

// ── MicroStream ──

export interface MicroStreamConfig {
  /** API provider wallet */
  merchant: string;
  /** Signer keypair */
  signer: Keypair | WalletAdapter;
  /** Cost per API call in currency units */
  ratePerCall: number;
  /** Settle on-chain every N calls */
  settleEvery?: number;
  /** Token symbol */
  currency?: string;
  /** Solana network */
  network?: 'mainnet' | 'devnet';
  /** Custom RPC */
  rpc?: string;
}

// ── Events ──

export type GateEvent =
  | 'confirmed'
  | 'failed'
  | 'cancelled'
  | 'risk:flagged'
  | 'escrow:created'
  | 'escrow:released'
  | 'escrow:refunded';

// ── Errors ──

export enum GateErrorCode {
  WALLET_NOT_FOUND = 'GATE_001',
  INSUFFICIENT_BALANCE = 'GATE_002',
  TX_REJECTED = 'GATE_003',
  NETWORK_ERROR = 'GATE_004',
  RISK_BLOCKED = 'GATE_005',
  CHECKOUT_EXPIRED = 'GATE_006',
  INVALID_TOKEN = 'GATE_007',
  ESCROW_EXPIRED = 'GATE_008',
  WEBHOOK_FAILED = 'GATE_009',
  SIGNER_INVALID = 'GATE_010',
}

export class GateError extends Error {
  code: GateErrorCode;
  constructor(code: GateErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'GateError';
  }
}

// ── Token Registry ──

export interface TokenInfo {
  symbol: string;
  mint: string;
  decimals: number;
}

// ── Webhook ──

export interface WebhookPayload {
  event: string;
  tx: Transaction;
  timestamp: number;
}
