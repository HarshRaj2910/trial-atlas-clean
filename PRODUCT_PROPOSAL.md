# Trial Atlas product proposal

## Problem

Clinical-trial screening exposes too much patient information too early. A sponsor commonly receives a complete record before confirming basic eligibility, increasing sensitive-data exposure and creating unnecessary handling obligations.

## Proposal

Trial Atlas uses Midnight Compact to let an applicant prove Trial 884 eligibility privately. The initial circuit accepts three witness values: A1C, cardiovascular-disease status, and kidney-disease status. It accepts only an A1C of at least 7.0 with neither disqualifying condition present. A successful proof increments an anonymous enrollment counter; it does not put those witness values, a patient ID, or PDF contents in public state.

## MVP scope

- Midnight Preprod Compact contract and committed managed proof assets.
- Compatible wallet connect/disconnect and real frontend circuit call.
- Record review UI with an explicit disclosure boundary.
- Deployed web demo and reproducible CI verification.

## Success measure

A reviewer can connect a Preprod wallet, submit a valid proof, and confirm the contract address and aggregate counter update without gaining access to medical witness values.

## Approval status

Draft for submission. This file is evidence of proposal preparation, not evidence that an external reviewer approved it.
