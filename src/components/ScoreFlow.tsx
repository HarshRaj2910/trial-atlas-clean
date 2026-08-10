import { useState } from 'react';
import { ShieldCheck, FileText, Send, Loader2, RefreshCcw, CheckCircle2, XCircle, Plus, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FileUpload } from './FileUpload';
import type { MedicalData } from '../types';
import type { WalletState } from '../hooks/useWallet';
import { submitEligibilityProof } from '../lib/midnight/contract';

interface ScoreFlowProps {
  medicalData: MedicalData | null;
  onDataLoaded: (data: MedicalData) => void;
  wallet: WalletState;
}

export function ScoreFlow({ medicalData, onDataLoaded, wallet }: ScoreFlowProps) {
  const [step, setStep] = useState<'idle' | 'generating' | 'ready' | 'submitting' | 'success'>('idle');
  const [proofHash, setProofHash] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [proofApproved, setProofApproved] = useState<boolean | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [analyzingPDF, setAnalyzingPDF] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

  const canGenerate = medicalData !== null;

  const handleGenerateProof = async () => {
    if (!medicalData || !wallet.connector) return;
    setStep('generating');
    setProofError(null);
    try {
      setStep('submitting');
      const data = await submitEligibilityProof(
        wallet.connector,
        medicalData.a1c_level,
        medicalData.has_cvd,
        medicalData.has_kidney_disease,
      );
      setProofHash(data.proofHash);
      setTxHash(data.transactionHash);
      setProofApproved(data.approved);
      setStep('success');
    } catch (err) {
      console.error('Proof generation failed:', err);
      setProofError(err instanceof Error ? err.message : 'Proof submission failed');
      setStep('idle');
    }
  };

  const handleSubmitProof = async () => {};

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setAnalyzingPDF(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('bill', files[0]);

    try {
      const response = await fetch('/api/upload-medical', { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok) {
        setUploadError(data.error ?? 'Upload failed');
        return;
      }

      if (data.analysis) {
        onDataLoaded(data.analysis);
        setShowUpload(false);
      }
    } catch {
      setUploadError('Network error - could not reach server');
    } finally {
      setAnalyzingPDF(false);
    }
  };

  return (
    <div className="space-y-8 p-5 sm:p-6 lg:p-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Eligibility review</h2>
        <p className="max-w-xl text-sm italic text-slate-600">
          Upload a medical record or load the demo dataset. The document stays local while the verdict remains easy to inspect.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-700" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Local record</span>
            </div>
            {medicalData && (
              <button
                onClick={() => setShowUpload(!showUpload)}
                className={`rounded-md p-1 transition-colors ${showUpload ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                title="Upload another PDF"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex-1 p-4">
            {showUpload ? (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <FileUpload onUpload={handleFileUpload} />
                {analyzingPDF && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs italic text-emerald-700">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Extracting fields locally...
                  </div>
                )}
                {uploadError && <p className="mt-3 text-center text-xs text-rose-600">{uploadError}</p>}
              </div>
            ) : medicalData ? (
              <div className="space-y-3 font-mono text-[11px]">
                {medicalData.lab_results.map((lab, i) => (
                  <div key={i} className="flex items-center justify-between text-slate-500">
                    <span className="truncate max-w-[120px]">{lab.test}</span>
                    <span className="mx-1 text-slate-300">........</span>
                    <span className="text-slate-950">{lab.value}</span>
                    <span className={`ml-2 font-bold ${lab.flag === 'NORMAL' ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {lab.flag}
                    </span>
                  </div>
                ))}
                <div className="space-y-1.5 border-t border-dashed border-slate-200 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Eligibility</span>
                    <span className={`text-xl font-bold ${medicalData.eligible_for_trial ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {medicalData.eligible_for_trial ? 'MATCH' : 'NO MATCH'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Hemoglobin A1C</span>
                    <span className={`text-xs font-bold ${medicalData.a1c_level >= 7.0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {medicalData.a1c_level}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">CVD history</span>
                    <span className="text-slate-700">{medicalData.has_cvd ? 'Present' : 'Absent'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Kidney disease</span>
                    <span className="text-slate-700">{medicalData.has_kidney_disease ? 'Present' : 'Absent'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => setShowUpload(true)}
                  className="group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 py-8 transition-all hover:border-emerald-500 hover:bg-emerald-50"
                >
                  <UploadCloud className="h-8 w-8 text-slate-400 transition-colors group-hover:text-emerald-700" />
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-600 transition-colors group-hover:text-slate-950">
                      Upload medical record (PDF)
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-4 py-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">or</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <button
                  onClick={async () => {
                    const res = await fetch('/api/demo-data');
                    const data = await res.json();
                    onDataLoaded(data.analysis);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-950 py-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                >
                  Load demo data
                </button>

                {uploadError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                    <p className="text-center text-xs text-rose-600">{uploadError}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="relative flex flex-col items-center justify-center space-y-6 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50 p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_40%)]" />

          <AnimatePresence mode="wait">
            {step === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center space-y-4"
              >
                <ShieldCheck className="mx-auto h-12 w-12 text-slate-400" />
                <button
                  onClick={handleGenerateProof}
                  disabled={!canGenerate || !wallet.isConnected}
                  className="rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Generate verification proof
                </button>
                {!medicalData && <p className="text-[10px] uppercase tracking-widest text-slate-500">Upload a record to begin</p>}
                {medicalData && !wallet.isConnected && <p className="text-[10px] uppercase tracking-widest text-slate-500">Connect wallet to submit on Midnight preprod</p>}
                {proofError && <p className="max-w-sm text-xs text-rose-600">{proofError}</p>}
              </motion.div>
            )}

            {step === 'generating' && (
              <motion.div key="generating" className="space-y-4 text-center">
                <div className="relative">
                  <Loader2 className="mx-auto h-16 w-16 animate-spin text-emerald-200 opacity-20" />
                  <RefreshCcw className="absolute inset-0 m-auto h-8 w-8 animate-spin text-emerald-700" />
                </div>
                <p className="font-mono text-sm text-slate-500">Processing proof bundle</p>
                <div className="mx-auto h-1 w-48 overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2.2 }}
                    className="h-full bg-emerald-700"
                  />
                </div>
              </motion.div>
            )}

            {step === 'ready' && (
              <motion.div key="ready" className="space-y-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
                  <ShieldCheck className="h-8 w-8 text-emerald-700" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-slate-950">Proof generated</p>
                  <p className="font-mono text-xs text-slate-500">CONTRACT: {proofHash?.slice(0, 20)}...</p>
                </div>
                <button
                  onClick={handleSubmitProof}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800"
                >
                  <Send className="h-4 w-4" />
                  Submit proof
                </button>
              </motion.div>
            )}

            {step === 'submitting' && (
              <motion.div key="submitting" className="w-full space-y-4 font-mono text-left">
                <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-4">
                  <ShieldCheck className="h-6 w-6 text-emerald-700" />
                  <p className="text-sm font-bold tracking-widest text-slate-950">VERIFICATION RUN</p>
                </div>
                <div className="space-y-2 text-xs text-slate-500">
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0 }}>
                    [1/4] Initializing wallet connector...
                  </motion.p>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
                    [2/4] Loading proving key...
                  </motion.p>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="text-emerald-700">
                    [3/4] Computing eligibility witness...
                  </motion.p>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 5 }}>
                    [4/4] Finalizing verification record...
                  </motion.p>
                </div>
                <div className="flex justify-center pt-4">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div key="success" className="space-y-6 text-center">
                <div
                  className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full shadow-lg ${
                    medicalData?.eligible_for_trial
                      ? 'bg-emerald-600 shadow-[0_0_30px_rgba(16,185,129,0.28)]'
                      : 'bg-rose-600 shadow-[0_0_30px_rgba(244,63,94,0.28)]'
                  }`}
                >
                  {medicalData?.eligible_for_trial ? (
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  ) : (
                    <XCircle className="h-8 w-8 text-white" />
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-bold text-slate-950">{proofApproved ? 'Proof accepted' : 'Transaction submitted'}</p>
                  <p className="max-w-sm text-xs leading-5 text-slate-600">
                    {proofApproved
                      ? 'The circuit returned PASS. Raw medical values are not displayed in this receipt.'
                      : 'Submission receipt recorded. Wallet did not return a PASS result; inspect transaction status in your wallet or explorer.'}
                  </p>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-left">
                    <p className="mb-1 font-mono text-[10px] text-slate-500">SUBMISSION RECEIPT</p>
                    <p className="truncate font-mono text-[11px] text-slate-700">{txHash}</p>
                  </div>
                </div>
                <button onClick={() => setStep('idle')} className="text-xs text-slate-500 underline transition-colors hover:text-slate-950">
                  Start new review
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
