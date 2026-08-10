import { useState } from 'react';
import { Shield, Lock, Fingerprint, ArrowRight, CheckCircle2, Sparkles, NotebookText, LayoutGrid } from 'lucide-react';
import { WalletConnect } from './components/WalletConnect';
import { ScoreFlow } from './components/ScoreFlow';
import { PrivacyView } from './components/PrivacyView';
import { ExtractedDataView } from './components/ExtractedDataView';
import { useWallet } from './hooks/useWallet';
import type { MedicalData } from './types';

export default function App() {
  const wallet = useWallet();
  const [medicalData, setMedicalData] = useState<MedicalData | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-[#f5f1ea] text-slate-900">
        <main className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-between px-6 py-6 lg:px-10">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute left-[-10%] top-[-10%] h-80 w-80 rounded-full bg-[#d8e6ff] blur-3xl opacity-70" />
            <div className="absolute right-[-12%] top-[12%] h-96 w-96 rounded-full bg-[#d8f0de] blur-3xl opacity-60" />
            <div className="absolute bottom-[-12%] left-[30%] h-80 w-80 rounded-full bg-[#efe0c7] blur-3xl opacity-70" />
          </div>

          <header className="flex items-center justify-between gap-4 rounded-full border border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-white">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Trial Atlas</p>
                <p className="text-sm text-slate-600">Private trial matching workspace</p>
              </div>
            </div>
            <button
              onClick={() => setHasStarted(true)}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
            >
              Open workspace <ArrowRight className="h-4 w-4" />
            </button>
          </header>

          <section className="grid gap-10 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-20">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-600 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Privacy-first matching
              </div>

              <div className="space-y-5">
                <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                  A calmer way to match patients with the right study.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                  Upload a medical record, review the extracted findings locally, and generate a verification outcome without exposing the full document to the network.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setHasStarted(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(22,101,52,0.55)] transition-all hover:-translate-y-0.5"
                >
                  Start matching flow <ArrowRight className="h-4 w-4" />
                </button>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-5 py-3 text-sm text-slate-600">
                  <Lock className="h-4 w-4 text-slate-900" />
                  Local review, private proof
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Today&apos;s workflow</p>
                  <LayoutGrid className="h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-6 space-y-4">
                  {[
                    ['1', 'Ingest a record', 'Drop in a PDF or load demo data to start the analysis.'],
                    ['2', 'Review the extract', 'Confirm the visible fields and privacy split before submission.'],
                    ['3', 'Generate proof', 'Produce a concise outcome for the eligibility check.'],
                  ].map(([step, title, copy]) => (
                    <div key={step} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                        {step}
                      </div>
                      <div>
                        <p className="font-medium text-slate-950">{title}</p>
                        <p className="text-sm leading-6 text-slate-600">{copy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  [Lock, 'Local-first', 'Source documents stay on device until you choose to submit a proof.'],
                  [CheckCircle2, 'Readable output', 'The interface favors clarity, spacing, and calm visual hierarchy.'],
                  [Fingerprint, 'Verification trail', 'The final outcome is concise and easy to share with the study team.'],
                ].map(([Icon, title, copy]) => (
                  <div key={title as string} className="rounded-[1.5rem] border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur">
                    <Icon className="h-5 w-5 text-emerald-700" />
                    <p className="mt-4 text-sm font-semibold text-slate-950">{title as string}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{copy as string}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f1ea] text-slate-900">
      <WalletConnect {...wallet} />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 pb-16 sm:px-6 lg:px-10">
        <section className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white/80 p-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.35)] backdrop-blur lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              <NotebookText className="h-3.5 w-3.5 text-emerald-700" />
              Trial Atlas workspace
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Clinical review dashboard
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Import a record, inspect the extracted facts, and compare the local view with the minimal proof sent to the network.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Status</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{medicalData ? 'Record loaded' : 'Waiting for file'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Mode</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">Private verification</p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white/90 shadow-[0_30px_100px_-70px_rgba(15,23,42,0.45)]">
          <ScoreFlow medicalData={medicalData} onDataLoaded={setMedicalData} wallet={wallet} />
          {medicalData && <ExtractedDataView medicalData={medicalData} />}
          <PrivacyView medicalData={medicalData} />
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/60 px-6 py-6 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
          Trial Atlas // local analysis // private verification
        </p>
      </footer>
    </div>
  );
}
