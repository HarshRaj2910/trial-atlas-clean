export interface MedicalData {
  patient_id: string;
  provider: string;
  date: string;
  summary: string;
  confidence: number;
  a1c_level: number;
  has_cvd: boolean;
  has_kidney_disease: boolean;
  eligible_for_trial: boolean;
  lab_results: {
    test: string;
    value: string;
    flag: string;
    date: string;
  }[];
  diagnosed_conditions: string[];
}
