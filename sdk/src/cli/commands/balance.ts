import { PublicKey } from '@solana/web3.js';
import { ParsedArgs, requireFlag } from '../parser';
import { getConnection } from '../../utils/connection';
import { getBalance } from '../../utils/transaction';
import { KNOWN_TOKENS } from '../../utils/constants';

export async function cmdBalance(args: ParsedArgs) {
  const wallet = requireFlag(args, 'wallet', 'wallet address');
  const currency = args.flags.currency;
  const network = (args.flags.network || process.env.GATEX402_NETWORK || 'mainnet') as 'mainnet' | 'devnet';
  const rpc = args.flags.rpc || process.env.GATEX402_RPC;

  const connection = getConnection(network, rpc);
  const pubkey = new PublicKey(wallet);

  console.log('');
  console.log(`\x1b[90m→ Fetching balances on ${network}...\x1b[0m`);
  console.log('');

  if (currency) {
    // Single token
    const balance = await getBalance(connection, pubkey, currency);
    console.log(`  \x1b[32m${currency}\x1b[0m  ${balance.toFixed(6)}`);
  } else {
    // All known tokens
    for (const symbol of Object.keys(KNOWN_TOKENS)) {
      const balance = await getBalance(connection, pubkey, symbol);
      const display = balance > 0 ? `\x1b[32m${balance.toFixed(6)}\x1b[0m` : `\x1b[90m${balance.toFixed(6)}\x1b[0m`;
      console.log(`  \x1b[1m${symbol.padEnd(6)}\x1b[0m ${display}`);
    }
  }

  console.log('');
  console.log(`  \x1b[90mWallet: ${wallet.slice(0, 4)}...${wallet.slice(-4)}\x1b[0m`);
  console.log('');
}
