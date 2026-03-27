import { PublicKey, Keypair } from '@solana/web3.js';
import EventEmitter from 'eventemitter3';
import {
  HeadlessConfig,
  PaymentOptions,
  Transaction,
  GateEvent,
  GateError,
  GateErrorCode,
  WalletAdapter,
} from '../types';
import {
  getConnection,
  DEFAULT_RISK_THRESHOLD,
  buildTransfer,
  getBalance,
  scoreTransaction,
  dispatchWithRetry,
} from '../utils';

export class GateHeadless extends EventEmitter {
  private config: HeadlessConfig;

  constructor(config: HeadlessConfig) {
    super();

    if (!config.merchant) {
      throw new GateError(
        GateErrorCode.WALLET_NOT_FOUND,
        'Merchant wallet address is required'
      );
    }

    if (!config.signer) {
      throw new GateError(
        GateErrorCode.SIGNER_INVALID,
        'Signer (Keypair or WalletAdapter) is required for headless mode'
      );
    }

    this.config = {
      network: 'mainnet',
      accept: ['SOL'],
      riskThreshold: DEFAULT_RISK_THRESHOLD,
      ...config,
    };
  }

  /**
   * Execute a payment directly — no UI, no approval prompt
   */
  async pay(options: PaymentOptions): Promise<Transaction> {
    const {
      amount,
      currency = 'SOL',
      memo,
      metadata,
    } = options;

    const connection = getConnection(
      this.config.network || 'mainnet',
      this.config.rpc
    );

    const signer = this.config.signer;
    const fromPubkey = this.getPublicKey(signer);
    const toPubkey = new PublicKey(this.config.merchant);

    // Check balance
    const balance = await getBalance(connection, fromPubkey, currency);
    if (balance < amount) {
      throw new GateError(
        GateErrorCode.INSUFFICIENT_BALANCE,
        `Insufficient ${currency} balance: ${balance.toFixed(6)}, need ${amount}`
      );
    }

    // Build transaction
    const tx = await buildTransfer({
      connection,
      from: fromPubkey,
      to: toPubkey,
      amount,
      currency,
      memo,
    });

    // Sign
    let signature: string;

    if (signer instanceof Keypair) {
      tx.sign(signer);
      signature = await connection.sendRawTransaction(tx.serialize());
    } else {
      // WalletAdapter
      const signed = await signer.signTransaction(tx);
      signature = await connection.sendRawTransaction(signed.serialize());
    }

    // Confirm
    await connection.confirmTransaction(signature, 'confirmed');

    // Risk score
    const risk = await scoreTransaction(
      signature,
      fromPubkey.toBase58(),
      toPubkey.toBase58(),
      amount
    );

    const txResult: Transaction = {
      signature,
      amount,
      currency,
      from: fromPubkey.toBase58(),
      to: toPubkey.toBase58(),
      riskScore: risk.score,
      memo: memo || '',
      metadata: metadata || {},
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Risk flagging
    const threshold = this.config.riskThreshold || DEFAULT_RISK_THRESHOLD;
    if (risk.score > threshold) {
      this.emit('risk:flagged', txResult);
    }

    // Webhook
    if (this.config.webhook) {
      dispatchWithRetry(this.config.webhook, 'payment.confirmed', txResult);
    }

    this.emit('confirmed', txResult);
    return txResult;
  }

  private getPublicKey(signer: Keypair | WalletAdapter): PublicKey {
    if (signer instanceof Keypair) {
      return signer.publicKey;
    }
    return new PublicKey(signer.publicKey.toBase58());
  }

}
