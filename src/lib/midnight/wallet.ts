import '@midnight-ntwrk/dapp-connector-api';
import type { InitialAPI } from '@midnight-ntwrk/dapp-connector-api';

export function desiredMidnightNetwork() {
  const configured = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_MIDNIGHT_NETWORK;
  return configured === 'preprod' ? configured : 'preprod';
}

export function detectMidnightConnector(): InitialAPI | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const entries = Object.entries(window.midnight ?? {});
  const [preferred] = entries.filter(([key]) => key.toLowerCase().includes('lace'));
  return preferred?.[1] ?? entries[0]?.[1] ?? null;
}
