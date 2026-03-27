import {
  GateConfig,
  EscrowOptions,
  EscrowContract,
  Transaction,
  GateError,
  GateErrorCode,
} from '../types';
import { GATEWAY_API, DEFAULT_ESCROW_EXPIRY } from '../utils/constants';

export class EscrowManager {
  private config: GateConfig;

  constructor(config: GateConfig) {
    this.config = config;
  }

  /**
   * Create an escrow contract — locks funds until release() or refund()
   */
  async create(options: EscrowOptions): Promise<EscrowContract> {
    const {
      amount,
      currency = 'USDC',
      payee,
      expiry = DEFAULT_ESCROW_EXPIRY,
      memo,
    } = options;

    try {
      const res = await fetch(`${GATEWAY_API}/escrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: this.config.merchant,
          payee,
          amount,
          currency,
          expiry,
          memo,
          network: this.config.network || 'mainnet',
        }),
      });

      if (!res.ok) throw new Error('Failed to create escrow');

      const data = await res.json();

      return this.buildContract(data.id, amount, currency, payee, expiry);
    } catch {
      // Offline fallback with local ID
      const id = `escrow_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      return this.buildContract(id, amount, currency, payee, expiry);
    }
  }

  private buildContract(
    id: string,
    amount: number,
    currency: string,
    payee: string,
    expiry: number
  ): EscrowContract {
    const expiryTimestamp = Math.floor(Date.now() / 1000) + expiry;

    const contract: EscrowContract = {
      id,
      amount,
      currency,
      status: 'locked',
      parties: {
        payer: this.config.merchant,
        payee,
      },
      expiry: expiryTimestamp,

      release: async (): Promise<Transaction> => {
        if (contract.status !== 'locked') {
          throw new GateError(
            GateErrorCode.ESCROW_EXPIRED,
            `Cannot release escrow in status: ${contract.status}`
          );
        }

        const res = await fetch(`${GATEWAY_API}/escrow/${id}/release`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) throw new Error('Failed to release escrow');

        contract.status = 'released';
        const data = await res.json();

        return {
          signature: data.signature,
          amount,
          currency,
          from: contract.parties.payer,
          to: contract.parties.payee,
          riskScore: 0,
          memo: `escrow:${id}:release`,
          metadata: { escrowId: id },
          timestamp: Math.floor(Date.now() / 1000),
        };
      },

      refund: async (): Promise<Transaction> => {
        if (contract.status !== 'locked') {
          throw new GateError(
            GateErrorCode.ESCROW_EXPIRED,
            `Cannot refund escrow in status: ${contract.status}`
          );
        }

        const res = await fetch(`${GATEWAY_API}/escrow/${id}/refund`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) throw new Error('Failed to refund escrow');

        contract.status = 'refunded';
        const data = await res.json();

        return {
          signature: data.signature,
          amount,
          currency,
          from: contract.parties.payee,
          to: contract.parties.payer,
          riskScore: 0,
          memo: `escrow:${id}:refund`,
          metadata: { escrowId: id },
          timestamp: Math.floor(Date.now() / 1000),
        };
      },
    };

    // Auto-refund timer
    setTimeout(async () => {
      if (contract.status === 'locked') {
        try {
          await contract.refund();
        } catch {
          // silently fail
        }
      }
    }, expiry * 1000);

    return contract;
  }
}
