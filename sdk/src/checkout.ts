import { PublicKey } from '@solana/web3.js';
import EventEmitter from 'eventemitter3';
import {
  GateConfig,
  PaymentOptions,
  Transaction,
  LinkOptions,
  PaymentLink,
  GateEvent,
  GateError,
  GateErrorCode,
} from './types';
import {
  getConnection,
  DEFAULT_RISK_THRESHOLD,
  DEFAULT_CHECKOUT_EXPIRY,
  PAYMENT_LINK_BASE,
  GATEWAY_API,
  buildTransfer,
  getBalance,
  scoreTransaction,
  dispatchWithRetry,
} from './utils';
import { injectModal, removeModal, updateModalStatus } from './modal';
import { connectWallet, WalletType } from './utils/wallet';
import { EscrowManager } from './escrow';

export class GateCheckout extends EventEmitter {
  private config: Required<
    Pick<GateConfig, 'merchant' | 'network' | 'accept' | 'theme' | 'riskThreshold'>
  > &
    GateConfig;
  private escrowManager: EscrowManager;

  constructor(config: GateConfig) {
    super();

    if (!config.merchant) {
      throw new GateError(
        GateErrorCode.WALLET_NOT_FOUND,
        'Merchant wallet address is required'
      );
    }

    this.config = {
      network: 'mainnet',
      accept: ['SOL'],
      theme: 'dark',
      riskThreshold: DEFAULT_RISK_THRESHOLD,
      ...config,
    };

    this.escrowManager = new EscrowManager(this.config);
  }

  /**
   * Open the checkout modal
   */
  open(options: PaymentOptions): void {
    const {
      amount,
      currency = this.config.accept[0] || 'SOL',
      memo,
      metadata,
      redirectUrl,
      expiry = DEFAULT_CHECKOUT_EXPIRY,
    } = options;

    // Validate token
    if (!this.config.accept.includes(currency)) {
      const isMint = currency.length > 10;
      if (!isMint) {
        throw new GateError(
          GateErrorCode.INVALID_TOKEN,
          `Token ${currency} not in accepted list: ${this.config.accept.join(', ')}`
        );
      }
    }

    injectModal({
      amount,
      currency,
      memo,
      theme: this.config.theme,
      merchant: this.config.merchant,
      expiry,
      onConnect: async (walletType: string) => {
        try {
          updateModalStatus('Connecting wallet...');
          const wallet = await connectWallet(walletType as WalletType);

          updateModalStatus('Building transaction...');
          const connection = getConnection(this.config.network, this.config.rpc);
          const from = new PublicKey(wallet.publicKey.toBase58());
          const to = new PublicKey(this.config.merchant);

          // Check balance
          const balance = await getBalance(connection, from, currency);
          if (balance < amount) {
            updateModalStatus(
              `Insufficient ${currency} balance (${balance.toFixed(4)})`,
              true
            );
            this.emit('failed', {
              code: GateErrorCode.INSUFFICIENT_BALANCE,
              message: `Need ${amount} ${currency}, have ${balance}`,
            });
            return;
          }

          // Build & sign transaction
          const tx = await buildTransfer({
            connection,
            from,
            to,
            amount,
            currency,
            memo,
          });

          updateModalStatus('Awaiting signature...');
          const signed = await wallet.signTransaction(tx);

          updateModalStatus('Confirming on-chain...');
          const signature = await connection.sendRawTransaction(
            signed.serialize()
          );

          await connection.confirmTransaction(signature, 'confirmed');

          // Risk scoring
          const risk = await scoreTransaction(
            signature,
            from.toBase58(),
            to.toBase58(),
            amount
          );

          const txResult: Transaction = {
            signature,
            amount,
            currency,
            from: from.toBase58(),
            to: to.toBase58(),
            riskScore: risk.score,
            memo: memo || '',
            metadata: metadata || {},
            timestamp: Math.floor(Date.now() / 1000),
          };

          // Check risk threshold
          if (risk.score > this.config.riskThreshold) {
            this.emit('risk:flagged', txResult);
          }

          // Dispatch webhook
          if (this.config.webhook) {
            dispatchWithRetry(
              this.config.webhook,
              'payment.confirmed',
              txResult
            );
          }

          // Close modal
          removeModal();

          // Emit confirmed
          this.emit('confirmed', txResult);

          // Redirect if specified
          if (redirectUrl) {
            window.location.href = redirectUrl;
          }
        } catch (err: any) {
          if (err instanceof GateError) {
            updateModalStatus(err.message, true);
            this.emit('failed', err);
          } else if (err.message?.includes('User rejected')) {
            removeModal();
            this.emit('cancelled', { reason: 'User rejected transaction' });
          } else {
            updateModalStatus(`Error: ${err.message}`, true);
            this.emit('failed', {
              code: GateErrorCode.NETWORK_ERROR,
              message: err.message,
            });
          }
        }
      },
      onCancel: () => {
        this.emit('cancelled', { reason: 'User closed checkout' });
      },
    });
  }

  /**
   * Close the checkout modal programmatically
   */
  close(): void {
    removeModal();
  }

  /**
   * Generate a shareable payment link
   */
  async createLink(options: LinkOptions): Promise<PaymentLink> {
    const { amount, currency = 'USDC', label, expiry } = options;

    let expirySeconds: number;
    if (typeof expiry === 'string') {
      const match = expiry.match(/^(\d+)(h|d|m)$/);
      if (match) {
        const val = parseInt(match[1]);
        const unit = match[2];
        expirySeconds =
          unit === 'h' ? val * 3600 : unit === 'd' ? val * 86400 : val * 60;
      } else {
        expirySeconds = 86400;
      }
    } else {
      expirySeconds = expiry || 86400;
    }

    try {
      const res = await fetch(`${GATEWAY_API}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: this.config.merchant,
          amount,
          currency,
          label,
          expiry: expirySeconds,
        }),
      });

      if (!res.ok) throw new Error('Failed to create payment link');

      const data = await res.json();
      return {
        url: `${PAYMENT_LINK_BASE}/${data.id}`,
        id: data.id,
        expiry: Math.floor(Date.now() / 1000) + expirySeconds,
      };
    } catch {
      // Offline fallback: generate a local link ID
      const id = Math.random().toString(36).slice(2, 8);
      return {
        url: `${PAYMENT_LINK_BASE}/${id}`,
        id,
        expiry: Math.floor(Date.now() / 1000) + expirySeconds,
      };
    }
  }

  /**
   * Get transaction details by signature
   */
  async getTransaction(signature: string): Promise<Transaction | null> {
    try {
      const connection = getConnection(this.config.network, this.config.rpc);
      const tx = await connection.getTransaction(signature, {
        commitment: 'confirmed',
      });

      if (!tx) return null;

      const risk = await scoreTransaction(
        signature,
        tx.transaction.message.accountKeys[0].toBase58(),
        this.config.merchant,
        0
      );

      return {
        signature,
        amount: 0, // Would need parsing from tx
        currency: 'SOL',
        from: tx.transaction.message.accountKeys[0].toBase58(),
        to: this.config.merchant,
        riskScore: risk.score,
        memo: '',
        metadata: {},
        timestamp: tx.blockTime || Math.floor(Date.now() / 1000),
      };
    } catch {
      return null;
    }
  }

  /**
   * Escrow manager
   */
  get escrow(): EscrowManager {
    return this.escrowManager;
  }

  /**
   * Type-safe event listener
   */
}
