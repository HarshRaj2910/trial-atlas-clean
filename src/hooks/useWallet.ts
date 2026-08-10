import { useState, useCallback } from 'react';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import '@midnight-ntwrk/dapp-connector-api';

const NETWORK_ID = 'preprod';

export interface WalletState {
  connector: ConnectedAPI | null;
  address: string | null;
  walletName: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useWallet(): WalletState {
  const [connector, setConnector] = useState<ConnectedAPI | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const walletKeys = Object.keys(window.midnight ?? {});
      console.log('Detected window.midnight wallets:', walletKeys);

      if (walletKeys.length === 0) {
        setError('No Midnight wallet detected. Install Lace, 1AM, or another DApp Connector wallet and refresh.');
        return;
      }

      const walletKey = walletKeys.find((key) => key.toLowerCase().includes('lace')) ?? walletKeys[0];
      const api = window.midnight![walletKey];
      console.log(`Connecting to wallet "${walletKey}" (name: ${api.name}) on ${NETWORK_ID}...`);

      const connected = await api.connect(NETWORK_ID);
      const { shieldedAddress } = await connected.getShieldedAddresses();

      setConnector(connected);
      setAddress(shieldedAddress);
      setWalletName(api.name ?? walletKey);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnector(null);
    setAddress(null);
    setWalletName(null);
    setIsConnected(false);
    setError(null);
  }, []);

  return { connector, address, walletName, isConnected, isConnecting, error, connect, disconnect };
}
