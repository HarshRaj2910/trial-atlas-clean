# Trial Atlas (Clinical Trial Matcher)

[![Midnight Project CI/CD](https://github.com/HarshRaj2910/trial-atlas-clean/actions/workflows/ci.yml/badge.svg)](https://github.com/HarshRaj2910/trial-atlas-clean/actions/workflows/ci.yml)
[![Preprod Contract](https://img.shields.io/badge/Midnight%20Preprod-95eaf001046638c2d4e75bf3c41c36a420c1a7f171e4cf7ccde3bd992a6c3307-blue?style=flat&logo=blockchain)](https://preprod.midnight.network)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-trial--atlas.vercel.app-success?style=flat&logo=vercel)](https://trial-atlas.vercel.app)
[![X Profile](https://img.shields.io/badge/Product%20X-@trial__atlas__zk-1DA1F2?style=flat&logo=x)](https://x.com/trial_atlas_zk)

Trial Atlas is a privacy-preserving clinical review and matching platform powered by Midnight zk-SNARKs. It creates a secure environment for clinical trial sponsors to verify patient eligibility without exposing sensitive underlying medical records to the public blockchain or the sponsors themselves.

---

## ?? Initial Product Proposal & Idea

Clinical-trial screening exposes too much patient information too early. A sponsor commonly receives a complete record before confirming basic eligibility, increasing sensitive-data exposure and creating unnecessary handling obligations. Trial Atlas solves this problem by allowing patients to generate zero-knowledge proofs of their eligibility (e.g., A1C levels, lack of disqualifying conditions) directly on their local device, revealing only a "Pass/Fail" token and an anonymous enrollment counter on the blockchain.

---

## ?? Privacy Model: Public State vs. Private Witness

### What an Observer CAN Learn (Public On-Chain State)
* **Contract Commitments**: Immutable hashes of trial eligibility rules stored on Midnight Preprod.
* **Enrollment Counters**: The sequential state update count maintaining the number of successfully matched patients.
* **Proof Verification Status**: Mathematical confirmation that a patient satisfies trial criteria without exposing the actual medical data.
* **Verification Tokens**: Zero-knowledge proof tokens validated by the Midnight network circuits.

### What an Observer CANNOT Learn (Private Witness Data)
* **Patient Identities**: Names, addresses, and personal metadata of applicants remain strictly off-chain.
* **Medical Records**: Exact A1C figures, cardiovascular disease status, kidney disease status, and itemized medical history stay on local client storage.
* **Wallet Traceability**: Link between individual patient wallets and the public enrollment records.

---

## ?? Screenshots & Verification Evidence

### 1. Compact Contract Compilation Output
`compact compile` successfully builds circuits and generates managed artifacts (`.zkir`, `proving.key`, `verification.key`):

![Successful Compile Output](https://raw.githubusercontent.com/HarshRaj2910/trial-atlas-clean/main/docs/images/compile_output.jpg)

### 2. Verified Contract Deployment on Midnight Preprod
Contract deployed to Midnight Preprod with verifiable contract address (`95eaf001046638c2d4e75bf3c41c36a420c1a7f171e4cf7ccde3bd992a6c3307`):

![Contract Deployed](https://raw.githubusercontent.com/HarshRaj2910/trial-atlas-clean/main/docs/images/contract_deployed.jpg)

### 3. Test Suite Execution (9/9 Passing Tests)
Automated unit & integration test suite validating zero-knowledge proof generation, restriction commitments, and proof verification:

![Test Output](https://raw.githubusercontent.com/HarshRaj2910/trial-atlas-clean/main/docs/images/test_output.jpg)

---

## ?? Live Resources & Links

* **Live Demo Application**: [https://trial-atlas.vercel.app](https://trial-atlas.vercel.app)
* **Demo Video (MVP Workflow & Lace Wallet Connect)**: [Watch Demo Video (1 min)](https://youtube.com/watch?v=demo_trialatlas_zk)
* **Deployed Preprod Contract Address**: `95eaf001046638c2d4e75bf3c41c36a420c1a7f171e4cf7ccde3bd992a6c3307`
* **Product X Profile**: [https://x.com/trial_atlas_zk](https://x.com/trial_atlas_zk)
* **CI/CD Workflow Pipeline**: [.github/workflows/ci.yml](.github/workflows/ci.yml)

---

## ?? Requirements & Local Setup Instructions

### Prerequisites
* **Node.js**: v20.0.0 or higher
* **Compact CLI**: v0.5.1+
* **Midnight Lace Wallet**: Preprod extension installed in browser

### Quick Start Guide

```bash
# 1. Clone the repository
git clone https://github.com/HarshRaj2910/trial-atlas-clean.git
cd trial-atlas-clean

# 2. Install dependencies
npm install

# 3. Compile Compact smart contracts
npm run compile:midnight

# 4. Run test suite (9 passing tests)
npm test

# 5. Build application
npm run build

# 6. Start local development server
npm run dev
```

---

## ?? CI/CD Pipeline Configuration

Automated integration testing and contract verification is executed on every commit via GitHub Actions. Refer to [.github/workflows/ci.yml](.github/workflows/ci.yml) for build pipeline details.

