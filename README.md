# GATEX402

**The Payment Gate for Agentic Economy**

x402 Payment Gateway Protocol for Autonomous Transactions on Solana.

## Repository Structure

```
GATEX402/
├── site/                 ← Landing page + docs (single HTML)
│   └── index.html
├── sdk/                  ← @gatex402/checkout npm package
│   ├── src/
│   │   ├── index.ts          — barrel exports
│   │   ├── types.ts          — TypeScript interfaces
│   │   ├── checkout.ts       — GateCheckout (modal UI)
│   │   ├── modal.ts          — checkout modal renderer
│   │   ├── headless/         — GateHeadless (agent-to-agent)
│   │   ├── micro/            — MicroStream (pay-per-use)
│   │   ├── escrow/           — EscrowManager
│   │   ├── cli/              — CLI tool (npx gatex402)
│   │   └── utils/            — connection, tokens, risk, tx builder
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
├── assets/               ← Brand assets (logo, PFP, banner)
├── .github/workflows/    ← CI (test + auto-publish)
└── LICENSE
```

## Quick Start

### SDK

```bash
cd sdk
npm install
npm run build
npm test
```

### CLI

```bash
cd sdk
npx gatex402 help
npx gatex402 link --amount 50 --currency USDC --merchant <wallet>
npx gatex402 pay --to <wallet> --amount 5 --currency SOL --key keypair.json
npx gatex402 balance --wallet <address>
npx gatex402 info --sig <tx_signature>
```

### Website

Deploy `site/index.html` to any static host. Single file, zero dependencies.

## SDK Usage

```javascript
import { GateCheckout } from '@gatex402/checkout'

const gate = new GateCheckout({
  merchant: 'YOUR_WALLET_ADDRESS',
  network: 'mainnet',
  accept: ['SOL', 'USDC', 'USDT'],
})

gate.open({ amount: 25, currency: 'USDC', memo: 'order-9281' })
gate.on('confirmed', (tx) => console.log(tx.signature, tx.riskScore))
```

## Links

- Website: [gatex402.com](https://gatex402.xyz)
- Twitter: [@GATEX402_](https://x.com/GATEX402_)
- npm: [@gatex402/checkout](https://www.npmjs.com/package/@gatex402/checkout)
- 

## License

MIT
