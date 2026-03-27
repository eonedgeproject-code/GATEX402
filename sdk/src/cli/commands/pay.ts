import { Keypair, PublicKey } from '@solana/web3.js';
import { ParsedArgs, requireFlag } from '../parser';
import { getConnection } from '../../utils/connection';
import { buildTransfer, getBalance } from '../../utils/transaction';
import { scoreTransaction } from '../../utils/risk';
import { readFileSync } from 'fs';

export async function cmdPay(args: ParsedArgs) {
  const to = requireFlag(args, 'to', 'recipient wallet');
  const amount = parseFloat(requireFlag(args, 'amount', 'payment amount'));
  const currency = args.flags.currency || 'SOL';
  const memo = args.flags.memo || '';
  const network = (args.flags.network || process.env.GATEX402_NETWORK || 'mainnet') as 'mainnet' | 'devnet';
  const keyPath = args.flags.key || process.env.GATEX402_KEY;
  const rpc = args.flags.rpc || process.env.GATEX402_RPC;

  if (!keyPath) {
    throw new Error('Keypair required. Use --key <path> or set GATEX402_KEY');
  }

  if (isNaN(amount) || amount <= 0) {
    throw new Error('Invalid amount. Must be a positive number');
  }

  // Load keypair
  console.log('\x1b[90m→ Loading keypair...\x1b[0m');
  let signer: Keypair;
  try {
    const raw = readFileSync(keyPath, 'utf-8');
    const secret = JSON.parse(raw);
    signer = Keypair.fromSecretKey(Uint8Array.from(secret));
  } catch {
    throw new Error(`Failed to load keypair from: ${keyPath}`);
  }

  const connection = getConnection(network, rpc);
  const fromPubkey = signer.publicKey;
  const toPubkey = new PublicKey(to);

  // Check balance
  console.log('\x1b[90m→ Checking balance...\x1b[0m');
  const balance = await getBalance(connection, fromPubkey, currency);
  if (balance < amount) {
    throw new Error(`Insufficient ${currency} balance: ${balance.toFixed(6)}, need ${amount}`);
  }

  // Build transaction
  console.log('\x1b[90m→ Building transaction...\x1b[0m');
  const tx = await buildTransfer({
    connection,
    from: fromPubkey,
    to: toPubkey,
    amount,
    currency,
    memo: memo || undefined,
  });

  // Sign & send
  console.log('\x1b[90m→ Signing & sending...\x1b[0m');
  tx.sign(signer);
  const signature = await connection.sendRawTransaction(tx.serialize());

  console.log('\x1b[90m→ Confirming on-chain...\x1b[0m');
  await connection.confirmTransaction(signature, 'confirmed');

  // Risk score
  const risk = await scoreTransaction(
    signature,
    fromPubkey.toBase58(),
    toPubkey.toBase58(),
    amount
  );

  console.log('');
  console.log('\x1b[32m✓ Payment confirmed\x1b[0m');
  console.log('');
  console.log(`  \x1b[1mSignature\x1b[0m   ${signature}`);
  console.log(`  \x1b[1mAmount\x1b[0m      ${amount} ${currency}`);
  console.log(`  \x1b[1mFrom\x1b[0m        ${fromPubkey.toBase58().slice(0, 8)}...`);
  console.log(`  \x1b[1mTo\x1b[0m          ${to.slice(0, 8)}...`);
  console.log(`  \x1b[1mRisk Score\x1b[0m  ${risk.score.toFixed(2)} (${risk.level})`);
  console.log(`  \x1b[1mNetwork\x1b[0m     ${network}`);
  if (memo) console.log(`  \x1b[1mMemo\x1b[0m        ${memo}`);
  console.log('');
}
