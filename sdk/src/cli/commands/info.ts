import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ParsedArgs, requireFlag } from '../parser';
import { getConnection } from '../../utils/connection';
import { scoreTransaction, classifyRisk } from '../../utils/risk';

export async function cmdInfo(args: ParsedArgs) {
  const sig = requireFlag(args, 'sig', 'transaction signature');
  const network = (args.flags.network || process.env.GATEX402_NETWORK || 'mainnet') as 'mainnet' | 'devnet';
  const rpc = args.flags.rpc || process.env.GATEX402_RPC;

  const connection = getConnection(network, rpc);

  console.log('');
  console.log('\x1b[90m→ Fetching transaction...\x1b[0m');

  const tx = await connection.getTransaction(sig, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) {
    throw new Error('Transaction not found. Check signature and network.');
  }

  const accounts = tx.transaction.message.staticAccountKeys || tx.transaction.message.accountKeys;
  const from = accounts[0]?.toBase58() || 'unknown';
  const to = accounts.length > 1 ? accounts[1]?.toBase58() : 'unknown';

  // Fee
  const fee = (tx.meta?.fee || 0) / LAMPORTS_PER_SOL;

  // SOL transfer amount (if applicable)
  const preBalances = tx.meta?.preBalances || [];
  const postBalances = tx.meta?.postBalances || [];
  let solTransferred = 0;
  if (preBalances.length >= 2 && postBalances.length >= 2) {
    solTransferred = (preBalances[0] - postBalances[0] - (tx.meta?.fee || 0)) / LAMPORTS_PER_SOL;
  }

  // Risk
  const risk = await scoreTransaction(sig, from, to as string, Math.abs(solTransferred));
  const level = classifyRisk(risk.score);

  // Status
  const status = tx.meta?.err ? '\x1b[31m✗ FAILED\x1b[0m' : '\x1b[32m✓ CONFIRMED\x1b[0m';

  // Time
  const time = tx.blockTime
    ? new Date(tx.blockTime * 1000).toISOString()
    : 'unknown';

  console.log('');
  console.log(`  \x1b[1mStatus\x1b[0m      ${status}`);
  console.log(`  \x1b[1mSignature\x1b[0m   ${sig.slice(0, 20)}...${sig.slice(-8)}`);
  console.log(`  \x1b[1mFrom\x1b[0m        ${from.slice(0, 8)}...${from.slice(-4)}`);
  console.log(`  \x1b[1mTo\x1b[0m          ${(to as string).slice(0, 8)}...${(to as string).slice(-4)}`);
  if (solTransferred > 0) {
    console.log(`  \x1b[1mAmount\x1b[0m      ${solTransferred.toFixed(6)} SOL`);
  }
  console.log(`  \x1b[1mFee\x1b[0m         ${fee.toFixed(6)} SOL`);
  console.log(`  \x1b[1mSlot\x1b[0m        ${tx.slot}`);
  console.log(`  \x1b[1mTime\x1b[0m        ${time}`);
  console.log(`  \x1b[1mRisk\x1b[0m        ${risk.score.toFixed(2)} (${level})`);
  console.log(`  \x1b[1mNetwork\x1b[0m     ${network}`);
  console.log(`  \x1b[1mExplorer\x1b[0m    https://solscan.io/tx/${sig}`);
  console.log('');
}
