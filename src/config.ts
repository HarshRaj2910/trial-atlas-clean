export const MIDNIGHT_CONFIG = {
  networkId: 'preprod',
  contractAddress: '95eaf001046638c2d4e75bf3c41c36a420c1a7f171e4cf7ccde3bd992a6c3307',
  indexerUrl: ((import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_MIDNIGHT_INDEXER_URL) ?? 'https://indexer.preprod.midnight.network',
  indexerWsUrl: ((import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_MIDNIGHT_INDEXER_WS_URL) ?? 'wss://indexer.preprod.midnight.network/ws',
  nodeUrl: ((import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_MIDNIGHT_NODE_URL) ?? 'https://rpc.preprod.midnight.network',
  zkConfigUrl: ((import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_MIDNIGHT_ZK_CONFIG_URL) ?? 'https://zk-config.preprod.midnight.network',
};
