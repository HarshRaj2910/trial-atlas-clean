# Trial Atlas (Clinical Trial Matcher)

[![Midnight Project CI/CD](https://github.com/HarshRaj2910/trial-atlas/actions/workflows/ci.yml/badge.svg)](https://github.com/HarshRaj2910/trial-atlas/actions)

Privacy-preserving clinical review and matching platform powered by Midnight zk-SNARKs

## Initial Product Idea

Trial Atlas addresses critical privacy requirements in Web3 applications by leveraging Midnight's zero-knowledge selective disclosure framework. The system allows users and institutions to prove compliance, eligibility, and state transitions without exposing sensitive underlying records or private inputs to the public blockchain.

## Privacy Model (Public State vs. Private Witness)

* **Public State (On-Chain Anchor)**:
  * Contract state commitments, Merkle roots, and update counters stored immutably on Midnight Preprod.
  * Zero-knowledge proof verification tokens enabling anyone to independently verify valid operations.
* **Private Witness (Off-Chain Data)**:
  * Full medical details, identity attributes, financial amounts, and internal policy rules remain local on the user's client device.
  * Nullifiers and commitments ensure single-use proof integrity without revealing user identity or payload data.

## Verified Contract Deployment

* **Network**: Midnight Preprod Testnet
* **Contract Address**: `0x02a149b819f078e352cb246d8142345e69e8`
* **Live Demo Link**: [https://trial-atlas.vercel.app](https://trial-atlas.vercel.app)
* **Product X Profile**: [https://x.com/trial_atlas_zk](https://x.com/trial_atlas_zk)

## Requirements & Setup Instructions

### Prerequisites
* Node.js v20+ & npm / pnpm
* Compact CLI v0.5.1+
* Midnight Lace Wallet (Preprod extension)

### Quick Start
```bash
# 1. Clone the repository
git clone https://github.com/HarshRaj2910/trial-atlas.git
cd trial-atlas

# 2. Install dependencies
npm install

# 3. Run contract compilation
npm run compile-contracts

# 4. Run test suite (3+ tests passing)
npm test

# 5. Launch local dev environment
npm run dev
```
