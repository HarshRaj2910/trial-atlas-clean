import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  check_eligibility(context: __compactRuntime.CircuitContext<PS>,
                    a1c_level_0: bigint,
                    has_cvd_0: boolean,
                    has_kidney_disease_0: boolean): __compactRuntime.CircuitResults<PS, boolean>;
}

export type ProvableCircuits<PS> = {
  check_eligibility(context: __compactRuntime.CircuitContext<PS>,
                    a1c_level_0: bigint,
                    has_cvd_0: boolean,
                    has_kidney_disease_0: boolean): __compactRuntime.CircuitResults<PS, boolean>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  check_eligibility(context: __compactRuntime.CircuitContext<PS>,
                    a1c_level_0: bigint,
                    has_cvd_0: boolean,
                    has_kidney_disease_0: boolean): __compactRuntime.CircuitResults<PS, boolean>;
}

export type Ledger = {
  readonly trial_enrollment_count: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
