import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { createCircuitCallTxInterface } from '@midnight-ntwrk/midnight-js-contracts';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { CostModel, Transaction } from '@midnight-ntwrk/ledger-v8';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { MIDNIGHT_CONFIG } from '../../config';
import * as clinicalTrial from '../../contracts/managed/clinical-trial-matcher/contract/index.js';

function hexToBytes(hex: string): Uint8Array {
  return Uint8Array.from(Buffer.from(hex.replace(/^0x/, ''), 'hex'));
}

function buildCompiledContract() {
  const contract = CompiledContract.make('clinical-trial-matcher', clinicalTrial.Contract as never);
  return CompiledContract.withCompiledFileAssets(
    CompiledContract.withVacantWitnesses(contract),
    '/zk/clinical-trial-matcher',
  );
}

export async function submitEligibilityProof(
  api: ConnectedAPI,
  a1cLevel: number,
  hasCvd: boolean,
  hasKidneyDisease: boolean,
) {
  setNetworkId(MIDNIGHT_CONFIG.networkId);
  const [configuration, addresses] = await Promise.all([
    api.getConfiguration(),
    api.getShieldedAddresses(),
  ]);

  if (configuration.networkId !== MIDNIGHT_CONFIG.networkId) {
    throw new Error(`Wallet connected to ${configuration.networkId}; switch wallet to Midnight preprod.`);
  }

  const zkConfigProvider = new FetchZkConfigProvider(
    new URL('/zk/clinical-trial-matcher/', window.location.origin).toString(),
    window.fetch.bind(window),
  );
  const provingProvider = await api.getProvingProvider(zkConfigProvider);
  const publicDataProvider = indexerPublicDataProvider(configuration.indexerUri, configuration.indexerWsUri);
  const providers = {
    zkConfigProvider,
    publicDataProvider,
    walletProvider: {
      getCoinPublicKey: () => addresses.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => addresses.shieldedEncryptionPublicKey,
      balanceTx: async (tx: { serialize(): Uint8Array }) => {
        const balanced = await api.balanceUnsealedTransaction(Buffer.from(tx.serialize()).toString('hex'));
        return Transaction.deserialize('signature', 'proof', 'binding', hexToBytes(balanced.tx));
      },
    },
    proofProvider: {
      proveTx: (tx: { prove: (provider: typeof provingProvider, costModel: unknown) => Promise<unknown> }) =>
        tx.prove(provingProvider, CostModel.initialCostModel()),
    },
    midnightProvider: {
      submitTx: async (tx: { serialize(): Uint8Array }) => {
        const txHex = Buffer.from(tx.serialize()).toString('hex');
        const response = await (api.submitTransaction as unknown as (transaction: string) => Promise<unknown>)(txHex);
        if (typeof response === 'string' && response) return response;
        if (response && typeof response === 'object') {
          const submitted = response as { transactionId?: string; txId?: string; id?: string };
          return submitted.transactionId ?? submitted.txId ?? submitted.id ?? txHex.slice(0, 64);
        }
        return txHex.slice(0, 64);
      },
    },
  };

  const contract = buildCompiledContract();
  const circuits = createCircuitCallTxInterface(
    providers as never,
    contract as never,
    MIDNIGHT_CONFIG.contractAddress,
    undefined,
  );
  const result = await (circuits as never as {
    check_eligibility: (a1c: bigint, cvd: boolean, kidney: boolean) => Promise<{ public?: { txId?: string }; result?: boolean }>;
  }).check_eligibility(BigInt(Math.round(a1cLevel * 10)), hasCvd, hasKidneyDisease);

  return {
    transactionHash: result.public?.txId ?? 'submitted',
    proofHash: `contract:${MIDNIGHT_CONFIG.contractAddress}`,
    // Do not infer a verdict when the connector omits a circuit result. A
    // submitted transaction is evidence of submission, not evidence of PASS.
    approved: result.result === true,
  };
}
