# Preprod batch runner

Run from this project with Node 20–22:

```powershell
$env:MIDNIGHT_RUNNER_KEY_PASSWORD = 'use-a-long-local-password'
$env:MIDNIGHT_PROOF_SERVER_URL = 'https://your-reachable-preprod-proof-server'
$env:MIDNIGHT_RUNNER_COOLDOWN_MS = '60000'
npm run run:preprod-batch
```

The runner processes the nine supplied contract addresses in order. It generates a fresh 32-byte seed per contract, encrypts the account file with AES-256-GCM, requests Preprod tNIGHT from the faucet, waits for synchronization, submits the configured circuit call, appends a JSONL result, stops the wallet, and waits for the cooldown before continuing.

Keys are written to `.midnight-preprod-runner/accounts.enc.json` and results to `.midnight-preprod-runner/runs.jsonl`. Never commit that directory. The default call arguments are smoke-test values; change the `args` in the manifest for application-specific proofs, especially contracts that use private witnesses or require contract-owner state.

The runner is intentionally Preprod-only and never deploys or targets a local node. It fails before creating accounts if the proof-server URL or key password is missing.
