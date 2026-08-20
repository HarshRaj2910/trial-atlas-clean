# Trial Atlas

Trial Atlas is a privacy-preserving eligibility workspace for Trial 884. A patient or study coordinator reviews a record, connects a Midnight wallet, and asks the deployed Compact circuit to prove eligibility without putting raw clinical values on Midnight's public ledger.

**Live demo:** https://trial-atlas-eight.vercel.app
**Network:** Midnight Preprod
**Contract address:** `95eaf001046638c2d4e75bf3c41c36a420c1a7f171e4cf7ccde3bd992a6c3307`
**Explorer:** https://explorer.preprod.midnight.network
**X profile:** `[PLACEHOLDER: add official Trial Atlas X profile URL]`
**Demo video:** `[PLACEHOLDER: add one-minute demo video URL]`

## Product idea

Finding a suitable clinical trial often requires sharing an entire medical record with multiple parties before a basic eligibility decision can be made. Trial Atlas narrows that disclosure: the applicant supplies the circuit witness, the circuit verifies Trial 884's A1C, cardiovascular-history, and kidney-disease predicates, and only a successful proof can increment the anonymous enrollment counter. The study can verify eligibility without receiving a patient identifier, PDF, lab panel, or the values used to satisfy the predicate.

## What works

- Lace, 1AM, and compatible Midnight DApp Connector wallets can connect and disconnect.
- Frontend calls `check_eligibility` through `createCircuitCallTxInterface` against Midnight Preprod.
- Contract proof requires A1C at least 7.0, no cardiovascular disease, and no kidney disease.
- Successful circuit execution increments `trial_enrollment_count`; it does not publish raw witness fields.
- Generated Compact bindings, ZKIR, prover key, and verifier key live under `src/contracts/managed/clinical-trial-matcher/` and are served from `/zk/clinical-trial-matcher/`.

## Privacy model

### Public state

`trial_enrollment_count` is ledger state. It reveals only aggregate successful-enrollment count. It does not encode a patient identity or clinical record.

### Private witness

The circuit witness is `a1c_level`, `has_cvd`, and `has_kidney_disease`. These values are consumed by the Compact proof and are not rendered as public ledger fields. The interface's proof view deliberately lists the disclosure boundary rather than generating a fake proof hash or exposing a supposed proof blob.

### What an observer can and cannot learn

An observer can learn that a valid transaction changed the enrollment counter. An observer cannot derive the applicant's A1C, CVD history, kidney-disease status, PDF contents, patient ID, provider, or other lab values from that counter update.

### Record-extraction boundary

PDF upload is **not** a Midnight transaction. In current development deployment, PDF text is sent to the configured Groq extraction API when `GROQ_API_KEY` exists, then temporary server files are deleted. Do not upload real protected health information until a suitable compliance review, data-processing agreement, access controls, and retention policy are in place. The privacy claim here is limited to the Midnight eligibility proof and public ledger disclosure.

## Run locally

Prerequisites:

- Node.js 22 or newer
- npm
- Compact CLI 0.5.1 with compiler release `0.30`
- WSL on Windows for `npm run compile:midnight` as currently scripted
- A Midnight Preprod wallet and test funds for an on-chain circuit call

```bash
npm ci
npm run compile:midnight
npm run sync:midnight-assets
npm test
npm run lint
npm run build
npm run dev
```

Open `http://localhost:3000`, connect a Preprod wallet, load data, then choose **Generate verification proof**. The wallet signs and submits the real circuit call. A failed assertion does not create a successful eligibility proof.

For optional PDF extraction during local development, add `GROQ_API_KEY` to `.env`. It is optional for demo data and does not belong in source control.

## Contract and managed artifacts

Source: `src/contracts/clinical_trial.compact`

```bash
npm run compile:midnight
npm run sync:midnight-assets
```

Compile output produces:

- `src/contracts/managed/clinical-trial-matcher/contract/` TypeScript/JavaScript binding
- `src/contracts/managed/clinical-trial-matcher/keys/` prover and verifier keys
- `src/contracts/managed/clinical-trial-matcher/zkir/` circuit representation

`npm test` validates six assertions covering managed artifacts, compiled metadata, contract predicates, deployment-address consistency, and real frontend circuit-call wiring. CI compiles Compact from source before running those tests.

## Deployment verification

`deployments/preprod.json` records the deployed address used by `src/config.ts`. Search that exact address in the [Midnight Preprod Explorer](https://explorer.preprod.midnight.network). The production web deployment is independently checked in CI with `curl`.

## CI/CD

`.github/workflows/ci.yml` runs on pushes and pull requests:

1. installs Compact, compiles contract, and refreshes managed assets;
2. runs tests, TypeScript check, and production build;
3. checks production Vercel demo responds successfully.

The workflow will have a public run only after this repository is pushed to GitHub.

## Proposal and social profile

`PRODUCT_PROPOSAL.md` contains submission-ready product proposal. It is not an approval record: approval must be granted by program reviewers. No official Trial Atlas X profile has been created or linked; do not infer one from this repository.

## Demo video

Video intentionally not included. Record a one-minute flow showing wallet connect, record load, successful Preprod proof submission, and explorer-visible transaction/address.
