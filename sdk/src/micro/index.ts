import { PublicKey, Keypair } from '@solana/web3.js';
import EventEmitter from 'eventemitter3';
import {
  MicroStreamConfig,
  Transaction,
  GateError,
  GateErrorCode,
  WalletAdapter,
} from '../types';
import {
  getConnection,
  buildTransfer,
  getBalance,
  scoreTransaction,
  DEFAULT_MICRO_SETTLE,
} from '../utils';

export class MicroStream extends EventEmitter {
  private config: Required<
    Pick<MicroStreamConfig, 'merchant' | 'signer' | 'ratePerCall' | 'settleEvery' | 'currency'>
  > &
    MicroStreamConfig;
  private ticks: number = 0;
  private unsettled: number = 0;
  private totalSettled: number = 0;
  private isSettling: boolean = false;

  constructor(config: MicroStreamConfig) {
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
        'Signer required for MicroStream'
      );
    }

    this.config = {
      currency: 'USDC',
      settleEvery: DEFAULT_MICRO_SETTLE,
      network: 'mainnet',
      ...config,
    };
  }

  /**
   * Record a single API call / usage tick
   * Automatically settles on-chain when settleEvery threshold is reached
   */
  async tick(): Promise<void> {
    this.ticks++;
    this.unsettled += this.config.ratePerCall;

    this.emit('tick', {
      ticks: this.ticks,
      unsettled: this.unsettled,
      totalSettled: this.totalSettled,
    });

    // Auto-settle check
    if (this.ticks % this.config.settleEvery === 0) {
      await this.settle();
    }
  }

  /**
   * Force settle all unsettled ticks on-chain
   */
  async settle(): Promise<Transaction> {
    if (this.isSettling) {
      throw new GateError(
        GateErrorCode.NETWORK_ERROR,
        'Settlement already in progress'
      );
    }

    if (this.unsettled <= 0) {
      throw new GateError(
        GateErrorCode.NETWORK_ERROR,
        'Nothing to settle'
      );
    }

    this.isSettling = true;

    try {
      const connection = getConnection(
        this.config.network || 'mainnet',
        this.config.rpc
      );

      const signer = this.config.signer;
      const fromPubkey = this.getPublicKey(signer);
      const toPubkey = new PublicKey(this.config.merchant);
      const amount = this.unsettled;

      // Check balance
      const balance = await getBalance(
        connection,
        fromPubkey,
        this.config.currency
      );
      if (balance < amount) {
        throw new GateError(
          GateErrorCode.INSUFFICIENT_BALANCE,
          `Insufficient ${this.config.currency}: ${balance.toFixed(6)}, need ${amount.toFixed(6)}`
        );
      }

      // Build & send
      const tx = await buildTransfer({
        connection,
        from: fromPubkey,
        to: toPubkey,
        amount,
        currency: this.config.currency,
        memo: `microstream:${this.ticks}ticks:${amount.toFixed(6)}${this.config.currency}`,
      });

      let signature: string;

      if (signer instanceof Keypair) {
        tx.sign(signer);
        signature = await connection.sendRawTransaction(tx.serialize());
      } else {
        const signed = await signer.signTransaction(tx);
        signature = await connection.sendRawTransaction(signed.serialize());
      }

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
        currency: this.config.currency,
        from: fromPubkey.toBase58(),
        to: toPubkey.toBase58(),
        riskScore: risk.score,
        memo: `microstream:${this.ticks}ticks`,
        metadata: {
          ticks: this.ticks,
          ratePerCall: this.config.ratePerCall,
          settledAmount: amount,
        },
        timestamp: Math.floor(Date.now() / 1000),
      };

      // Update state
      this.totalSettled += this.unsettled;
      this.unsettled = 0;

      this.emit('settled', txResult);
      return txResult;
    } finally {
      this.isSettling = false;
    }
  }

  /**
   * Get current stream stats
   */
  stats(): {
    ticks: number;
    unsettled: number;
    totalSettled: number;
    ratePerCall: number;
    currency: string;
  } {
    return {
      ticks: this.ticks,
      unsettled: this.unsettled,
      totalSettled: this.totalSettled,
      ratePerCall: this.config.ratePerCall,
      currency: this.config.currency,
    };
  }

  /**
   * Reset stream (does NOT refund unsettled amount)
   */
  reset(): void {
    this.ticks = 0;
    this.unsettled = 0;
    this.totalSettled = 0;
  }

  private getPublicKey(signer: Keypair | WalletAdapter): PublicKey {
    if (signer instanceof Keypair) {
      return signer.publicKey;
    }
    return new PublicKey(signer.publicKey.toBase58());
  }
}
