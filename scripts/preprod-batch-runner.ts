import 'dotenv/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { createCircuitCallTxInterface } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { LedgerParameters, DustSecretKey, ZswapSecretKeys } from '@midnight-ntwrk/ledger-v8';
import { FluentWalletBuilder, type EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import type { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { FaucetClient } from '@midnight-ntwrk/testkit-js';
import * as Rx from 'rxjs';

const ROOT = resolve(process.cwd(), '..');
const STATE_DIR = resolve(process.env.MIDNIGHT_RUNNER_STATE_DIR ?? join(ROOT, '.midnight-preprod-runner'));
const KEY_FILE = join(STATE_DIR, 'accounts.enc.json');
const RESULT_FILE = join(STATE_DIR, 'runs.jsonl');
const COOLDOWN_MS = Number(process.env.MIDNIGHT_RUNNER_COOLDOWN_MS ?? 60_000);
const PASSWORD = process.env.MIDNIGHT_RUNNER_KEY_PASSWORD;

type ContractSpec = {
  name: string;
  address: string;
  contractName: string;
  artifactDir: string;
  circuit: string;
  args: unknown[];
};

const bytes = (hex: string) => Uint8Array.from(Buffer.from(hex.replace(/^0x/, ''), 'hex'));
const h = (value: string) => createHash('sha256').update(value).digest();

const specs: ContractSpec[] = [
  { name: 'Trial Atlas', address: '95eaf001046638c2d4e75bf3c41c36a420c1a7f171e4cf7ccde3bd992a6c3307', contractName: 'clinical-trial-matcher', artifactDir: resolve(ROOT, 'Midnight Clinical Trial Matcher/src/contracts/managed/clinical-trial-matcher'), circuit: 'check_eligibility', args: [650, false, false] },
  { name: 'TalentCompass', address: '5e0775b3e657dff1f249bd92d5f8f92971c03172a46918fa7e003518955d7998', contractName: 'talentcompass-guard', artifactDir: resolve(ROOT, 'ShieldHire AI/contract'), circuit: 'verifyCandidate', args: [80] },
  { name: 'Iron Ledger', address: '373be4d0985d255dda0471f57574b7445587c9010e5c626b2a258e639eebcd13', contractName: 'witness', artifactDir: resolve(ROOT, 'WITNESS/ui/public/witness'), circuit: 'register_policy', args: [h('midnight-runner-policy')] },
  { name: 'CivicLedger', address: '1602db86f690df35e168216009f184e44a14e11f9971527e617a7629af260605', contractName: 'donor-proof', artifactDir: resolve(ROOT, 'DonorProof/app/contract/src/managed/donor-proof'), circuit: 'verifyCompliance', args: [] },
  { name: 'Northstar Vault', address: '6aa6407439e6209c112d8a6cab5a27a28f4f308a534589a5a0af63e266751c41', contractName: 'northstar-vault', artifactDir: resolve(ROOT, 'proofvault-zk/packages/contract/src/managed/northstar'), circuit: 'verifyAndRecord', args: [h('midnight-runner-university'), BigInt(Math.floor(Date.now() / 1000) + 86400)] },
  { name: 'ProofVault', address: '4301c20907642b171569c70f9d529e19dac29209ce806743ecb3da7333740b8b', contractName: 'proofvault', artifactDir: resolve(ROOT, 'TrustTrace/contract/src/managed/proofvault'), circuit: 'commit', args: [bytes('00'.repeat(160))] },
  { name: 'Nightframe', address: 'aa7e2ea388b3faeb436beb539e8333b6226e1aeab9235029ce1a2f8c211bf15c', contractName: 'nightframe-guard', artifactDir: resolve(ROOT, 'Kaelix/contracts/managed/nightframe-guard'), circuit: 'submitAttestation', args: [h('midnight-runner-commitment'), h('midnight-runner-policy'), 1] },
  { name: 'Midnight Ledger — Accreditation', address: '492dd3d1c0d5b9e0b50ba76e03c3c93f05ba35359016b9d71fddc8bd9c70e2f9', contractName: 'accreditation', artifactDir: resolve(ROOT, 'Zeed/contracts/src/managed/accreditation'), circuit: 'prove_by_income', args: [] },
  { name: 'Midnight Ledger — Founder Majority', address: '31f3d3d053691d7e0bc81a7ebec524bbd3ffe844f4239991900012b19b30eed9', contractName: 'founder-majority', artifactDir: resolve(ROOT, 'Zeed/contracts/src/managed/founder_majority'), circuit: 'publish_proof', args: [] },
];

type StoredAccount = { id: string; seed: string; createdAt: string; contract: string; address?: string };
type Store = { version: 1; salt: string; iv: string; tag: string; ciphertext: string };

function protect(accounts: StoredAccount[]): Store {
  if (!PASSWORD) throw new Error('Set MIDNIGHT_RUNNER_KEY_PASSWORD; keys are never written in plaintext.');
  const salt = randomBytes(16); const iv = randomBytes(12);
  const key = createHash('sha256').update(PASSWORD).update(salt).digest();
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(accounts), 'utf8'), cipher.final()]);
  return { version: 1, salt: salt.toString('hex'), iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), ciphertext: ciphertext.toString('base64') };
}

function unprotect(): StoredAccount[] {
  if (!existsSync(KEY_FILE)) return [];
  if (!PASSWORD) throw new Error('Set MIDNIGHT_RUNNER_KEY_PASSWORD to read stored accounts.');
  const store = JSON.parse(readFileSync(KEY_FILE, 'utf8')) as Store;
  const key = createHash('sha256').update(PASSWORD).update(Buffer.from(store.salt, 'hex')).digest();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(store.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(store.tag, 'hex'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(store.ciphertext, 'base64')), decipher.final()]).toString('utf8')) as StoredAccount[];
}

function save(accounts: StoredAccount[]) { mkdirSync(STATE_DIR, { recursive: true }); writeFileSync(KEY_FILE, JSON.stringify(protect(accounts), null, 2), { mode: 0o600 }); }
function log(value: unknown) { mkdirSync(dirname(RESULT_FILE), { recursive: true }); writeFileSync(RESULT_FILE, `${JSON.stringify(value)}\n`, { flag: 'a' }); }

function env(): EnvironmentConfiguration {
  const indexer = process.env.MIDNIGHT_INDEXER_HTTP_URL ?? 'https://indexer.preprod.midnight.network/api/v3/graphql';
  const indexerWS = process.env.MIDNIGHT_INDEXER_WS_URL ?? 'wss://indexer.preprod.midnight.network/api/v3/graphql/ws';
  const proofServer = process.env.MIDNIGHT_PROOF_SERVER_URL;
  if (!proofServer) throw new Error('Set MIDNIGHT_PROOF_SERVER_URL to a reachable Preprod proof server.');
  return { walletNetworkId: 'preprod', networkId: 'preprod', indexer, indexerWS, node: process.env.MIDNIGHT_NODE_URL ?? 'https://rpc.preprod.midnight.network', nodeWS: process.env.MIDNIGHT_NODE_WS_URL ?? 'wss://rpc.preprod.midnight.network', proofServer, faucet: process.env.MIDNIGHT_FAUCET_URL ?? 'https://faucet.preprod.midnight.network/api/request-tokens' };
}

async function main() {
  if (process.env.MIDNIGHT_NETWORK && process.env.MIDNIGHT_NETWORK !== 'preprod') throw new Error('This runner only permits MIDNIGHT_NETWORK=preprod.');
  setNetworkId('preprod'); const configuration = env(); let accounts = unprotect();
  for (const spec of specs) {
    const id = `${spec.address}:${Date.now()}`; const seed = Buffer.from(randomBytes(32)).toString('hex');
    const account: StoredAccount = { id, seed, createdAt: new Date().toISOString(), contract: spec.name };
    accounts.push(account); save(accounts); // persist before network calls so an interrupted run can be resumed.
    const builder = FluentWalletBuilder.forEnvironment(configuration).withDustOptions({ ledgerParams: LedgerParameters.initialParameters(), additionalFeeOverhead: 1_000n, feeBlocksMargin: 5 });
    const built = await builder.withSeed(seed).buildWithoutStarting() as any;
    const wallet = built.wallet as WalletFacade; const zswap = ZswapSecretKeys.fromSeed(built.seeds.shielded); const dust = DustSecretKey.fromSeed(built.seeds.dust); const unshieldedKeystore = built.keystore;
    try {
      await wallet.start(zswap, dust);
      const state = await Rx.firstValueFrom(wallet.state());
      const unshielded = UnshieldedAddress.codec.encode(getNetworkId(), state.unshielded.address).toString();
      await new FaucetClient(configuration.faucet, console as any).requestTokens(unshielded);
      const synced = await Rx.firstValueFrom(wallet.state().pipe(Rx.filter((s: any) => s.isSynced && Object.values(s.unshielded.balances ?? {}).some((balance) => BigInt(balance as bigint) > 0n)), Rx.timeout({ each: Number(process.env.MIDNIGHT_RUNNER_FUNDING_TIMEOUT_MS ?? 900000) })));
      const unregisteredCoins = (synced as any).unshielded.availableCoins.filter((coin: any) => !coin.meta.registeredForDustGeneration);
      if (unregisteredCoins.length > 0) {
        const dustState = await wallet.dust.waitForSyncedState();
        const dustRecipe = await (wallet as any).registerNightUtxosForDustGeneration(unregisteredCoins, unshieldedKeystore.getPublicKey(), (payload: Uint8Array) => unshieldedKeystore.signData(payload), dustState.address);
        await wallet.submitTransaction(await wallet.finalizeRecipe(dustRecipe));
        await Rx.firstValueFrom(wallet.state().pipe(Rx.filter((s: any) => s.isSynced && s.dust.balance(new Date()) > 0n), Rx.timeout({ each: Number(process.env.MIDNIGHT_RUNNER_DUST_TIMEOUT_MS ?? 900000) })));
      }
      account.address = UnshieldedAddress.codec.encode(getNetworkId(), synced.unshielded.address).toString(); save(accounts);
      const zkConfigProvider = new NodeZkConfigProvider(spec.artifactDir);
      const providers = { publicDataProvider: indexerPublicDataProvider(configuration.indexer, configuration.indexerWS), zkConfigProvider, proofProvider: httpClientProofProvider(configuration.proofServer, zkConfigProvider), walletProvider: { getCoinPublicKey: () => synced.shielded.coinPublicKey, getEncryptionPublicKey: () => synced.shielded.encryptionPublicKey, balanceTx: (tx: any) => wallet.balanceUnboundTransaction(tx, { shieldedSecretKeys: zswap, dustSecretKey: dust }, { ttl: new Date(Date.now() + 30 * 60 * 1000) }).then((recipe: any) => wallet.finalizeRecipe(recipe)) }, midnightProvider: { submitTx: (tx: any) => wallet.submitTransaction(tx) } } as any;
      const mod = await import(pathToFileURL(join(spec.artifactDir, 'contract/index.js')).href) as any;
      const compiled = CompiledContract.withCompiledFileAssets(CompiledContract.withVacantWitnesses(CompiledContract.make(spec.contractName, mod.Contract)), spec.artifactDir);
      const callTx = createCircuitCallTxInterface(providers, compiled as any, spec.address, `${spec.contractName}:${account.id}`) as any;
      const result = await callTx[spec.circuit](...spec.args);
      log({ at: new Date().toISOString(), contract: spec.name, address: spec.address, accountId: id, walletAddress: account.address, circuit: spec.circuit, txId: result?.public?.txId ?? result?.public?.txHash ?? null, status: 'submitted' });
    } catch (error) { log({ at: new Date().toISOString(), contract: spec.name, address: spec.address, accountId: id, status: 'failed', error: error instanceof Error ? error.message : String(error) }); throw error; }
    finally { await wallet.stop(); }
    if (spec !== specs.at(-1)) await new Promise((resolveDelay) => setTimeout(resolveDelay, COOLDOWN_MS));
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
