import { ParsedArgs, requireFlag } from '../parser';
import { PAYMENT_LINK_BASE, GATEWAY_API } from '../../utils/constants';

export async function cmdLink(args: ParsedArgs) {
  const amount = parseFloat(requireFlag(args, 'amount', 'payment amount'));
  const currency = args.flags.currency || 'USDC';
  const label = args.flags.label || '';
  const expiry = args.flags.expiry || '24h';
  const merchant = args.flags.merchant || process.env.GATEX402_MERCHANT;

  if (!merchant) {
    throw new Error('Merchant wallet required. Use --merchant or set GATEX402_MERCHANT');
  }

  if (isNaN(amount) || amount <= 0) {
    throw new Error('Invalid amount. Must be a positive number');
  }

  // Parse expiry
  let expirySeconds = 86400;
  const match = expiry.match(/^(\d+)(m|h|d)$/);
  if (match) {
    const val = parseInt(match[1]);
    const unit = match[2];
    expirySeconds = unit === 'm' ? val * 60 : unit === 'h' ? val * 3600 : val * 86400;
  }

  // Generate link ID
  const id = generateLinkId();

  // Try API first, fallback to local
  let url = `${PAYMENT_LINK_BASE}/${id}`;

  try {
    const res = await fetch(`${GATEWAY_API}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant, amount, currency, label, expiry: expirySeconds }),
    });
    if (res.ok) {
      const data = await res.json();
      url = `${PAYMENT_LINK_BASE}/${data.id}`;
    }
  } catch {
    // Use local fallback
  }

  const expiryDate = new Date(Date.now() + expirySeconds * 1000);

  console.log('');
  console.log('\x1b[32m✓ Payment link created\x1b[0m');
  console.log('');
  console.log(`  \x1b[1mURL\x1b[0m       ${url}`);
  console.log(`  \x1b[1mAmount\x1b[0m    ${amount} ${currency}`);
  if (label) console.log(`  \x1b[1mLabel\x1b[0m     ${label}`);
  console.log(`  \x1b[1mExpiry\x1b[0m    ${expiryDate.toISOString()}`);
  console.log(`  \x1b[1mMerchant\x1b[0m  ${merchant.slice(0, 4)}...${merchant.slice(-4)}`);
  console.log('');
}

function generateLinkId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
