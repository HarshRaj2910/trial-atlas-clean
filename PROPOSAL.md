# Trial Atlas Product Proposal

## What the product is and who uses it
Trial Atlas is a privacy-preserving clinical-trial screening platform. It allows applicants (patients) to prove their eligibility for a clinical trial without revealing their complete medical records. Sponsors (reviewers) use it to verify eligibility without ever touching or storing sensitive patient data, reducing exposure and handling obligations.

## Why Midnight specifically
Midnight is the perfect fit because it allows us to leverage zero-knowledge proofs (zk-SNARKs) to verify medical conditions without exposing the underlying data. Its built-in data privacy capabilities ensure that sensitive health information remains entirely off-chain while verifiable proofs of eligibility are validated on-chain.

## Data model
- **Public State:** An anonymous enrollment counter (`trial_enrollment_count`) that tracks the number of eligible applicants. No patient IDs, names, or raw medical data are stored publicly.
- **Private Witness:** The patient's medical data: A1C level, cardiovascular-disease status, and kidney-disease status.
- **Disclosure Boundary:** Only a zero-knowledge proof of eligibility (A1C >= 7.0 and no disqualifying conditions) is disclosed to the network. The actual witness values never leave the user's local machine.

## Scope feasibility for Mainnet by Level 6
The MVP scope focuses on the core eligibility circuit and an anonymous enrollment counter. This isolated functionality is highly feasible for Mainnet deployment by Level 6 because it avoids complex multi-party state transitions and relies entirely on local witness evaluation and a single increment operation on the ledger state.
