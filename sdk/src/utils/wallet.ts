import { GateError, GateErrorCode, WalletAdapter } from '../types';

declare global {
  interface Window {
    solana?: any;
    solflare?: any;
    backpack?: any;
  }
}

export type WalletType = 'phantom' | 'solflare' | 'backpack';

export function detectWallets(): WalletType[] {
  const wallets: WalletType[] = [];

  if (typeof window === 'undefined') return wallets;

  if (window.solana?.isPhantom) wallets.push('phantom');
  if (window.solflare?.isSolflare) wallets.push('solflare');
  if (window.backpack) wallets.push('backpack');

  return wallets;
}

export async function connectWallet(type: WalletType): Promise<WalletAdapter> {
  if (typeof window === 'undefined') {
    throw new GateError(
      GateErrorCode.WALLET_NOT_FOUND,
      'Wallet connection requires a browser environment'
    );
  }

  let provider: any;

  switch (type) {
    case 'phantom':
      provider = window.solana;
      if (!provider?.isPhantom) {
        throw new GateError(
          GateErrorCode.WALLET_NOT_FOUND,
          'Phantom wallet not detected'
        );
      }
      break;

    case 'solflare':
      provider = window.solflare;
      if (!provider?.isSolflare) {
        throw new GateError(
          GateErrorCode.WALLET_NOT_FOUND,
          'Solflare wallet not detected'
        );
      }
      break;

    case 'backpack':
      provider = window.backpack;
      if (!provider) {
        throw new GateError(
          GateErrorCode.WALLET_NOT_FOUND,
          'Backpack wallet not detected'
        );
      }
      break;

    default:
      throw new GateError(
        GateErrorCode.WALLET_NOT_FOUND,
        `Unknown wallet type: ${type}`
      );
  }

  try {
    const resp = await provider.connect();
    return {
      publicKey: resp.publicKey || provider.publicKey,
      signTransaction: (tx: any) => provider.signTransaction(tx),
      signAllTransactions: provider.signAllTransactions
        ? (txs: any[]) => provider.signAllTransactions(txs)
        : undefined,
    };
  } catch (err: any) {
    throw new GateError(
      GateErrorCode.TX_REJECTED,
      `Wallet connection rejected: ${err.message}`
    );
  }
}
