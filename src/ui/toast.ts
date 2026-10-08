/* ---------- toasts ---------- */
import { $, esc } from '../core/utils';
import { ic } from '../core/icons';
import { S, save } from '../core/store';
import { render } from '../shell/render';

export function toast(msg, opt: Record<string, any> = {}) {
  const host = $('#toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  const icon = opt.kind === 'err' ? ic('circle-alert', 15, 'bad') : opt.kind === 'info' ? ic('info', 15) : ic('circle-check', 15, 'ok');
  el.innerHTML = `${icon}<span class="grow">${esc(msg)}</span>${opt.action ? `<button class="ta">${esc(opt.action)}</button>` : ''}<button class="ibtn ibtn-xs" aria-label="Dismiss" style="color:inherit;opacity:.6">${ic('x', 13)}</button>`;
  const kill = () => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 160);
  };
  if (opt.action)
    el.querySelector<HTMLElement>('.ta')!.onclick = () => {
      opt.onAction?.();
      kill();
    };
  el.querySelector<HTMLElement>('.ibtn')!.onclick = kill;
  host.appendChild(el);
  setTimeout(kill, opt.ms || 4200);
}
/* guarded mutation: simulates offline failures for the "Failed to save" state */
export function mutate(fn: () => void, label?: string) {
  if (S.ui.offline) {
    toast("Your changes couldn't be saved. You're offline.", { kind: 'err', action: 'Try again', onAction: () => mutate(fn, label) });
    return false;
  }
  fn();
  save();
  render();
  return true;
}
