import { Transaction, WebhookPayload } from '../types';
import { GATEWAY_API } from './constants';

export async function dispatchWebhook(
  webhookUrl: string,
  event: string,
  tx: Transaction
): Promise<boolean> {
  const payload: WebhookPayload = {
    event,
    tx,
    timestamp: Math.floor(Date.now() / 1000),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gate-Source': 'gatex402-sdk',
        'X-Gate-Event': event,
      },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch {
    return false;
  }
}

export async function dispatchWithRetry(
  webhookUrl: string,
  event: string,
  tx: Transaction,
  maxRetries = 3,
  delayMs = 1000
): Promise<boolean> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const ok = await dispatchWebhook(webhookUrl, event, tx);
    if (ok) return true;

    if (attempt < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  return false;
}
