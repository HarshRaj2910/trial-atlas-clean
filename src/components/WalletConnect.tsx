import { Wallet, CheckCircle2, Loader2, XCircle, ExternalLink, LogOut } from 'lucide-react';
import type { WalletState } from '../hooks/useWallet';

type Props = Pick<WalletState, 'address' | 'walletName' | 'isConnected' | 'isConnecting' | 'error' | 'connect' | 'disconnect'>;

export function WalletConnect({ address, walletName, isConnected, isConnecting, error, connect, disconnect }: Props) {
  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white/75 p-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white">
          <Wallet className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Trial Atlas Wallet</span>
          <span className="text-sm text-slate-600">Connected to the private review session</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {error && (
          <div className="flex max-w-xs items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2">
            <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
            <p className="text-[11px] leading-tight text-rose-700">{error}</p>
            {error.includes('detected') && (
              <a
                href="https://1am.xyz"
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center gap-0.5 text-[11px] text-slate-900 underline decoration-slate-400 underline-offset-2"
              >
                Get it <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
        )}

        {isConnected && address ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <div className="flex flex-col">
                {walletName && (
                  <span className="mb-0.5 text-[9px] uppercase tracking-wider text-slate-500">{walletName}</span>
                )}
                <span className="font-mono text-xs text-slate-700" title={address}>
                  {truncate(address)}
                </span>
              </div>
            </div>
            <button
              onClick={disconnect}
              title="Disconnect"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            disabled={isConnecting}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                Connect wallet
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
