import { describe, it, expect } from 'vitest';
import { GateErrorCode, GateError } from '../src/types';
import { resolveToken, KNOWN_TOKENS, classifyRisk } from '../src/utils';

describe('Types', () => {
  it('GateError has correct code', () => {
    const err = new GateError(GateErrorCode.WALLET_NOT_FOUND, 'No wallet');
    expect(err.code).toBe('GATE_001');
    expect(err.message).toBe('No wallet');
    expect(err.name).toBe('GateError');
  });

  it('All error codes are unique', () => {
    const codes = Object.values(GateErrorCode);
    const unique = new Set(codes);
    expect(codes.length).toBe(unique.size);
  });

  it('Error codes follow GATE_XXX format', () => {
    Object.values(GateErrorCode).forEach((code) => {
      expect(code).toMatch(/^GATE_\d{3}$/);
    });
  });
});

describe('Token Registry', () => {
  it('resolves known tokens', () => {
    const sol = resolveToken('SOL');
    expect(sol.symbol).toBe('SOL');
    expect(sol.decimals).toBe(9);
    expect(sol.mint).toBeTruthy();

    const usdc = resolveToken('USDC');
    expect(usdc.symbol).toBe('USDC');
    expect(usdc.decimals).toBe(6);

    const usdt = resolveToken('USDT');
    expect(usdt.symbol).toBe('USDT');
    expect(usdt.decimals).toBe(6);
  });

  it('resolves case-insensitively', () => {
    expect(resolveToken('sol').symbol).toBe('SOL');
    expect(resolveToken('Usdc').symbol).toBe('USDC');
  });

  it('treats unknown strings as SPL mint addresses', () => {
    const mint = 'G8e2v6t4LfsJChH1LiF7xTiVVNR4u4R98VTmU6QWpump';
    const token = resolveToken(mint);
    expect(token.mint).toBe(mint);
    expect(token.decimals).toBe(9);
  });

  it('has 3 known tokens', () => {
    expect(Object.keys(KNOWN_TOKENS).length).toBe(3);
  });
});

describe('Risk Classification', () => {
  it('classifies low risk', () => {
    expect(classifyRisk(0.0)).toBe('low');
    expect(classifyRisk(0.15)).toBe('low');
    expect(classifyRisk(0.3)).toBe('low');
  });

  it('classifies medium risk', () => {
    expect(classifyRisk(0.31)).toBe('medium');
    expect(classifyRisk(0.5)).toBe('medium');
    expect(classifyRisk(0.6)).toBe('medium');
  });

  it('classifies high risk', () => {
    expect(classifyRisk(0.61)).toBe('high');
    expect(classifyRisk(0.75)).toBe('high');
    expect(classifyRisk(0.85)).toBe('high');
  });

  it('classifies critical risk', () => {
    expect(classifyRisk(0.86)).toBe('critical');
    expect(classifyRisk(0.95)).toBe('critical');
    expect(classifyRisk(1.0)).toBe('critical');
  });
});

describe('GateCheckout', () => {
  it('throws without merchant', async () => {
    const { GateCheckout } = await import('../src/checkout');
    expect(() => new GateCheckout({} as any)).toThrow('Merchant wallet address is required');
  });

  it('creates instance with valid config', async () => {
    const { GateCheckout } = await import('../src/checkout');
    const gate = new GateCheckout({
      merchant: '9mRqABC123DEF456GHI789JKL012MNO345PQR678STU9',
      network: 'devnet',
      accept: ['SOL', 'USDC'],
    });
    expect(gate).toBeTruthy();
    expect(gate.escrow).toBeTruthy();
  });

  it('supports event listeners', async () => {
    const { GateCheckout } = await import('../src/checkout');
    const gate = new GateCheckout({
      merchant: '9mRqABC123DEF456GHI789JKL012MNO345PQR678STU9',
    });

    let fired = false;
    gate.on('confirmed', () => { fired = true; });
    gate.emit('confirmed', {});
    expect(fired).toBe(true);
  });
});

describe('GateHeadless', () => {
  it('throws without merchant', async () => {
    const { GateHeadless } = await import('../src/headless');
    expect(() => new GateHeadless({} as any)).toThrow();
  });

  it('throws without signer', async () => {
    const { GateHeadless } = await import('../src/headless');
    expect(() => new GateHeadless({ merchant: 'abc123' } as any)).toThrow('Signer');
  });
});

describe('MicroStream', () => {
  it('throws without merchant', async () => {
    const { MicroStream } = await import('../src/micro');
    expect(() => new MicroStream({} as any)).toThrow();
  });

  it('tracks ticks and unsettled amount', async () => {
    const { Keypair } = await import('@solana/web3.js');
    const { MicroStream } = await import('../src/micro');

    const stream = new MicroStream({
      merchant: '9mRqABC123DEF456GHI789JKL012MNO345PQR678STU9',
      signer: Keypair.generate(),
      ratePerCall: 0.001,
      settleEvery: 999999, // won't auto-settle
      currency: 'USDC',
      network: 'devnet',
    });

    await stream.tick();
    await stream.tick();
    await stream.tick();

    const stats = stream.stats();
    expect(stats.ticks).toBe(3);
    expect(stats.unsettled).toBeCloseTo(0.003);
    expect(stats.totalSettled).toBe(0);
    expect(stats.ratePerCall).toBe(0.001);
    expect(stats.currency).toBe('USDC');
  });

  it('resets correctly', async () => {
    const { Keypair } = await import('@solana/web3.js');
    const { MicroStream } = await import('../src/micro');

    const stream = new MicroStream({
      merchant: '9mRqABC123DEF456GHI789JKL012MNO345PQR678STU9',
      signer: Keypair.generate(),
      ratePerCall: 0.01,
      settleEvery: 999999,
      network: 'devnet',
    });

    await stream.tick();
    await stream.tick();
    stream.reset();

    const stats = stream.stats();
    expect(stats.ticks).toBe(0);
    expect(stats.unsettled).toBe(0);
  });
});
