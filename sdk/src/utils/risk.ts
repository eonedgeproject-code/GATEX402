import { GATEWAY_API } from './constants';

export interface RiskResult {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
}

export async function scoreTransaction(
  signature: string,
  from: string,
  to: string,
  amount: number
): Promise<RiskResult> {
  try {
    const res = await fetch(`${GATEWAY_API}/risk/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature, from, to, amount }),
    });

    if (!res.ok) {
      // Fallback: return low risk if API is unreachable
      return { score: 0.0, level: 'low', factors: [] };
    }

    return await res.json();
  } catch {
    // Offline fallback
    return { score: 0.0, level: 'low', factors: [] };
  }
}

export function classifyRisk(score: number): RiskResult['level'] {
  if (score <= 0.3) return 'low';
  if (score <= 0.6) return 'medium';
  if (score <= 0.85) return 'high';
  return 'critical';
}
