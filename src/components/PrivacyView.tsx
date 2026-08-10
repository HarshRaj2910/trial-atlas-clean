import { Eye, EyeOff, Lock, Network, FileX } from 'lucide-react';
import type { MedicalData } from '../types';

interface PrivacyViewProps {
  medicalData: MedicalData | null;
}

export function PrivacyView({ medicalData }: PrivacyViewProps) {
  if (!medicalData) {
    return (
      <div className="space-y-6 px-6 pb-12">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Privacy view</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-12">
          <FileX className="h-8 w-8 text-slate-400" />
          <p className="text-xs font-mono uppercase tracking-wider text-slate-500">No record loaded - upload a PDF to preview the split</p>
        </div>
      </div>
    );
  }

  const confidenceScore = Math.round(medicalData.confidence * 10);

  return (
    <div className="space-y-6 px-6 pb-12">
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Privacy view</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="group space-y-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <Eye className="h-4 w-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Local view</h3>
          </div>
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-colors group-hover:bg-white">
            <div className="flex items-end justify-between">
              <div>
                <p className="mb-1 text-[10px] uppercase text-slate-500">Match confidence</p>
                <div className="flex h-3 gap-1">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className={`h-full w-1.5 rounded-full ${i < confidenceScore ? 'bg-emerald-600' : 'bg-slate-200'}`} />
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="mb-1 text-[10px] uppercase text-slate-500">Status</p>
                <p className="text-lg font-bold tabular-nums text-slate-950">{medicalData.eligible_for_trial ? 'ELIGIBLE' : 'NO MATCH'}</p>
              </div>
            </div>
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-mono text-[10px] text-slate-500"># EXTRACTED_DATA</p>
              <p className="font-mono text-[11px] text-slate-700">LABS: {medicalData.lab_results.length} records</p>
              <p className="font-mono text-[11px] text-slate-700">HEMOGLOBIN A1C: {medicalData.a1c_level}%</p>
              <p className="font-mono text-[11px]">
                <span className="text-slate-600">CVD_HISTORY: </span>
                <span className={medicalData.has_cvd ? 'text-rose-600' : 'text-emerald-700'}>{medicalData.has_cvd ? 'PRESENT' : 'ABSENT'}</span>
              </p>
              <p className="font-mono text-[11px]">
                <span className="text-slate-600">KIDNEY_DISEASE: </span>
                <span className={medicalData.has_kidney_disease ? 'text-rose-600' : 'text-emerald-700'}>
                  {medicalData.has_kidney_disease ? 'PRESENT' : 'ABSENT'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="group space-y-4">
          <div className="flex items-center gap-2 text-slate-500">
            <EyeOff className="h-4 w-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Proof view</h3>
          </div>
          <div className="relative space-y-4 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-6 transition-colors group-hover:bg-emerald-100/70">
            <div className="absolute right-0 top-0 p-3 opacity-20 transition-opacity group-hover:opacity-40">
              <Lock className="h-12 w-12" />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="mb-1 text-[10px] uppercase text-slate-500">Encrypted payload</p>
                <div className="flex h-3 gap-1">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-full w-1.5 rounded-full bg-emerald-400/50" />
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="mb-1 text-[10px] font-bold uppercase text-emerald-700/70">Eligibility check</p>
                <p className={`text-lg font-bold underline decoration-dotted underline-offset-4 ${medicalData.eligible_for_trial ? 'text-emerald-700' : 'text-amber-600'}`}>
                  {medicalData.eligible_for_trial ? 'PASS' : 'FAIL'}
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white p-4 font-mono">
              <p className="mb-2 text-[10px] text-emerald-700/60"># CIRCUIT_DISCLOSURE</p>
              <p className="text-[11px] leading-5 text-slate-700">
                Public ledger change: anonymous enrollment counter increments only after eligible proof.
              </p>
              <p className="mt-3 text-[11px] leading-5 text-slate-700">
                Not rendered here or published as ledger fields: A1C, CVD history, kidney-disease status, PDF text, patient ID, provider, and lab results.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
        <Network className="mb-4 h-8 w-8 text-slate-400" />
        <p className="max-w-xs font-mono text-xs uppercase leading-relaxed text-slate-500">
          Midnight circuit receives eligibility witness privately. This screen intentionally never manufactures a proof hash or exposes witness values.
        </p>
      </div>
    </div>
  );
}
