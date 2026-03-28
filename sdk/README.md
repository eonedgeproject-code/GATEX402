# @gatex402/checkout

**x402 Payment Gateway SDK for Solana**

One-line payment integration for dApps, AI agents, and marketplaces.

## Install

```bash
npm install @gatex402/checkout
```

## Quick Start

```javascript
import { GateCheckout } from '@gatex402/checkout'

const gate = new GateCheckout({
  merchant: 'YOUR_WALLET_ADDRESS',
  network: 'mainnet',
  accept: ['SOL', 'USDC', 'USDT'],
  theme: 'dark',
})

gate.open({ amount: 25, currency: 'USDC', memo: 'order-9281' })

gate.on('confirmed', (tx) => {
  console.log(tx.signature, tx.riskScore, tx.amount)
})
```

## Headless Mode (Agent-to-Agent)

```javascript
import { GateHeadless } from '@gatex402/checkout/headless'
import { Keypair } from '@solana/web3.js'

const gate = new GateHeadless({
  merchant: 'TARGET_WALLET',
  network: 'mainnet',
  signer: Keypair.fromSecretKey(agentSecret),
})

const tx = await gate.pay({
  amount: 2.5,
  currency: 'USDC',
  memo: 'agent-task-7712',
})
```

## Micropayments

```javascript
import { MicroStream } from '@gatex402/checkout/micro'

const stream = new MicroStream({
  merchant: 'API_PROVIDER_WALLET',
  signer: agentKeypair,
  ratePerCall: 0.001,
  settleEvery: 100,
  currency: 'USDC',
})

await stream.tick() // +0.001 USDC
await stream.settle() // force settle
```

## Escrow

```javascript
const escrow = await gate.escrow.create({
  amount: 100,
  currency: 'USDC',
  payee: 'WORKER_WALLET',
  expiry: 86400,
})

await escrow.release() // or escrow.refund()
```

## Payment Links

```javascript
const link = gate.createLink({
  amount: 50,
  currency: 'USDC',
  label: 'Invoice #42',
  expiry: '24h',
})
// → https://pay.gatex402.com/p/x7k9m2
```

## Links

- Website: [gatex402.com](https://gatex402.com)
- Twitter: [@GATEX402_](https://x.com/GATEX402_)
- Docs: [gatex402.com/docs](https://gatex402.com)

## License

MIT
