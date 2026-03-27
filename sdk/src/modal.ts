/**
 * GATEX402 Checkout Modal
 * Injects a styled payment overlay into the DOM
 */

export interface ModalOptions {
  amount: number;
  currency: string;
  memo?: string;
  theme: 'dark' | 'light' | 'auto';
  merchant: string;
  expiry?: number;
  onConnect: (walletType: string) => void;
  onCancel: () => void;
}

export function injectModal(options: ModalOptions): HTMLElement {
  const { amount, currency, memo, theme, merchant, expiry, onConnect, onCancel } = options;

  const resolvedTheme =
    theme === 'auto'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  const isDark = resolvedTheme === 'dark';
  const bg = isDark ? '#0a0a0f' : '#ffffff';
  const surface = isDark ? '#12121c' : '#f5f5f7';
  const border = isDark ? '#1e1e30' : '#e0e0e5';
  const text = isDark ? '#e0e0e8' : '#1a1a2e';
  const dim = isDark ? '#6a6a80' : '#8a8a9a';
  const neon = '#00ff8c';

  const overlay = document.createElement('div');
  overlay.id = 'gatex402-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:99999;
    display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,.7);backdrop-filter:blur(6px);
    font-family:'JetBrains Mono',monospace;
    animation:gatex402FadeIn .25s ease;
  `;

  const shortMerchant = merchant.slice(0, 4) + '...' + merchant.slice(-4);

  overlay.innerHTML = `
    <style>
      @keyframes gatex402FadeIn{from{opacity:0}to{opacity:1}}
      @keyframes gatex402SlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      .g402-modal{
        background:${bg};border:1px solid ${border};
        width:380px;max-width:90vw;padding:2rem;
        animation:gatex402SlideUp .3s ease;position:relative;
      }
      .g402-modal *{box-sizing:border-box;margin:0;padding:0}
      .g402-close{
        position:absolute;top:1rem;right:1rem;
        background:none;border:none;color:${dim};
        font-size:1.2rem;cursor:pointer;font-family:inherit;
      }
      .g402-close:hover{color:${text}}
      .g402-label{
        font-size:.55rem;letter-spacing:3px;text-transform:uppercase;
        color:${neon};margin-bottom:1.5rem;
      }
      .g402-amount{
        font-size:2.2rem;font-weight:800;color:${text};
        margin-bottom:.3rem;
      }
      .g402-amount span{color:${neon};font-size:1rem;margin-left:.3rem}
      .g402-to{font-size:.7rem;color:${dim};margin-bottom:.5rem}
      .g402-memo{
        font-size:.65rem;color:${dim};
        padding:.4rem .6rem;background:${surface};
        border:1px solid ${border};margin-bottom:1.5rem;
        word-break:break-all;
      }
      .g402-divider{
        height:1px;background:${border};margin:1.2rem 0;
      }
      .g402-wallets{display:flex;flex-direction:column;gap:.6rem}
      .g402-wallet-btn{
        display:flex;align-items:center;gap:.8rem;
        padding:.8rem 1rem;background:${surface};
        border:1px solid ${border};color:${text};
        font-family:inherit;font-size:.75rem;letter-spacing:1px;
        cursor:pointer;transition:all .2s;text-transform:uppercase;
      }
      .g402-wallet-btn:hover{
        border-color:${neon};color:${neon};
        box-shadow:0 0 15px rgba(0,255,140,.1);
      }
      .g402-wallet-dot{
        width:8px;height:8px;border-radius:50%;
        background:${neon};box-shadow:0 0 6px ${neon};
      }
      .g402-footer{
        margin-top:1.5rem;font-size:.5rem;letter-spacing:2px;
        text-transform:uppercase;color:${dim};text-align:center;
      }
      ${expiry ? `.g402-expiry{
        font-size:.6rem;color:${dim};text-align:center;
        margin-top:.8rem;
      }` : ''}
    </style>
    <div class="g402-modal">
      <button class="g402-close" id="g402Close">✕</button>
      <div class="g402-label">GATEX402 Checkout</div>
      <div class="g402-amount">${amount}<span>${currency}</span></div>
      <div class="g402-to">→ ${shortMerchant}</div>
      ${memo ? `<div class="g402-memo">${memo}</div>` : ''}
      <div class="g402-divider"></div>
      <div class="g402-wallets">
        <button class="g402-wallet-btn" data-wallet="phantom">
          <div class="g402-wallet-dot"></div>
          Phantom
        </button>
        <button class="g402-wallet-btn" data-wallet="solflare">
          <div class="g402-wallet-dot"></div>
          Solflare
        </button>
      </div>
      ${expiry ? `<div class="g402-expiry" id="g402Timer">Expires in ${Math.floor(expiry / 60)}:${String(expiry % 60).padStart(2, '0')}</div>` : ''}
      <div class="g402-footer">Powered by X402 Protocol</div>
    </div>
  `;

  // Event handlers
  overlay.querySelector('#g402Close')!.addEventListener('click', () => {
    overlay.remove();
    onCancel();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      onCancel();
    }
  });

  overlay.querySelectorAll('.g402-wallet-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const walletType = (btn as HTMLElement).dataset.wallet!;
      onConnect(walletType);
    });
  });

  // Expiry countdown
  if (expiry) {
    let remaining = expiry;
    const timerEl = overlay.querySelector('#g402Timer');
    const interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(interval);
        overlay.remove();
        onCancel();
        return;
      }
      if (timerEl) {
        const m = Math.floor(remaining / 60);
        const s = String(remaining % 60).padStart(2, '0');
        timerEl.textContent = `Expires in ${m}:${s}`;
      }
    }, 1000);
  }

  document.body.appendChild(overlay);
  return overlay;
}

export function removeModal(): void {
  const el = document.getElementById('gatex402-overlay');
  if (el) el.remove();
}

export function updateModalStatus(message: string, isError = false): void {
  const modal = document.querySelector('.g402-modal');
  if (!modal) return;

  const existing = modal.querySelector('.g402-status');
  if (existing) existing.remove();

  const status = document.createElement('div');
  status.className = 'g402-status';
  status.style.cssText = `
    font-size:.65rem;letter-spacing:1px;text-align:center;
    margin-top:1rem;padding:.5rem;
    color:${isError ? '#ff4d6a' : '#00ff8c'};
    border:1px solid ${isError ? 'rgba(255,77,106,.2)' : 'rgba(0,255,140,.2)'};
    background:${isError ? 'rgba(255,77,106,.05)' : 'rgba(0,255,140,.05)'};
  `;
  status.textContent = message;
  modal.appendChild(status);
}
