import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction as SolTx,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { resolveToken } from './constants';

export interface TransferParams {
  connection: Connection;
  from: PublicKey;
  to: PublicKey;
  amount: number;
  currency: string;
  memo?: string;
}

/**
 * Build a Solana transfer transaction (SOL or SPL token)
 */
export async function buildTransfer(params: TransferParams): Promise<SolTx> {
  const { connection, from, to, amount, currency, memo } = params;
  const token = resolveToken(currency);
  const tx = new SolTx();

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = from;

  if (token.symbol === 'SOL') {
    // Native SOL transfer
    tx.add(
      SystemProgram.transfer({
        fromPubkey: from,
        toPubkey: to,
        lamports: Math.round(amount * LAMPORTS_PER_SOL),
      })
    );
  } else {
    // SPL token transfer
    const mintPubkey = new PublicKey(token.mint);
    const fromAta = await getAssociatedTokenAddress(mintPubkey, from);
    const toAta = await getAssociatedTokenAddress(mintPubkey, to);

    const rawAmount = Math.round(amount * 10 ** token.decimals);

    tx.add(
      createTransferInstruction(
        fromAta,
        toAta,
        from,
        rawAmount,
        [],
        TOKEN_PROGRAM_ID
      )
    );
  }

  // Add memo if provided
  if (memo) {
    const MEMO_PROGRAM_ID = new PublicKey(
      'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
    );
    tx.add(
      new TransactionInstruction({
        keys: [{ pubkey: from, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memo, 'utf-8'),
      })
    );
  }

  return tx;
}

/**
 * Check token balance for a wallet
 */
export async function getBalance(
  connection: Connection,
  wallet: PublicKey,
  currency: string
): Promise<number> {
  const token = resolveToken(currency);

  if (token.symbol === 'SOL') {
    const lamports = await connection.getBalance(wallet);
    return lamports / LAMPORTS_PER_SOL;
  }

  try {
    const mintPubkey = new PublicKey(token.mint);
    const ata = await getAssociatedTokenAddress(mintPubkey, wallet);
    const account = await getAccount(connection, ata);
    return Number(account.amount) / 10 ** token.decimals;
  } catch {
    return 0;
  }
}
