import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import { join } from 'node:path';

const root = process.cwd();
const managed = join(root, 'src', 'contracts', 'managed', 'clinical-trial-matcher');
const contractSource = readFileSync(join(root, 'src', 'contracts', 'clinical_trial.compact'), 'utf8');
const contractInfo = JSON.parse(readFileSync(join(managed, 'compiler', 'contract-info.json'), 'utf8'));
const deployment = JSON.parse(readFileSync(join(root, 'deployments', 'preprod.json'), 'utf8'));
const config = readFileSync(join(root, 'src', 'config.ts'), 'utf8');

test('managed Compact contract binding exists', () => {
  for (const artifact of ['contract/index.js', 'contract/index.d.ts', 'compiler/contract-info.json']) {
    assert.ok(existsSync(join(managed, artifact)), `missing ${artifact}`);
  }
});

test('managed proving assets are non-empty', () => {
  for (const artifact of ['keys/check_eligibility.prover', 'keys/check_eligibility.verifier', 'zkir/check_eligibility.zkir']) {
    assert.ok(statSync(join(managed, artifact)).size > 0, `${artifact} is empty`);
  }
});

test('compiled circuit metadata exposes check_eligibility proof circuit', () => {
  const circuit = contractInfo.circuits.find(({ name }) => name === 'check_eligibility');
  assert.ok(circuit, 'check_eligibility absent from compiled metadata');
  assert.equal(circuit.proof, true);
  assert.deepEqual(circuit.arguments.map(({ name }) => name), ['a1c_level', 'has_cvd', 'has_kidney_disease']);
});

test('circuit enforces Trial 884 witness predicates and changes minimal public state', () => {
  assert.match(contractSource, /assert\(a1c_level >= 70/);
  assert.match(contractSource, /assert\(has_cvd == false/);
  assert.match(contractSource, /assert\(has_kidney_disease == false/);
  assert.match(contractSource, /trial_enrollment_count\.increment\(1\)/);
});

test('recorded deployment is preprod and application uses same contract address', () => {
  assert.equal(deployment.network, 'preprod');
  assert.match(deployment.contractAddress, /^[0-9a-f]{64}$/);
  assert.match(config, new RegExp(deployment.contractAddress));
});

test('frontend makes a real Midnight circuit call rather than fabricating a verdict', () => {
  const client = readFileSync(join(root, 'src', 'lib', 'midnight', 'contract.ts'), 'utf8');
  assert.match(client, /createCircuitCallTxInterface/);
  assert.match(client, /\.check_eligibility\(/);
  assert.match(client, /result\.result === true/);
});
