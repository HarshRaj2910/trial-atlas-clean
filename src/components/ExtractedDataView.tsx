import { useState } from 'react';
import { User, Calendar, Activity, Eye, EyeOff, Lock, FileText, AlertTriangle } from 'lucide-react';
import type { MedicalData } from '../types';

interface ExtractedDataViewProps {
  medicalData: MedicalData;
}

export function ExtractedDataView({ medicalData: d }: ExtractedDataViewProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="mx-6 mb-10 border-t border-slate-200/80">
      <div className="flex items-center gap-4 py-6">
        <div className="h-px flex-1 bg-slate-200" />
        <div className="flex items-center gap-3">
          <Lock className="h-3 w-3 text-slate-400" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Private medical data</span>
          <button
            onClick={() => setVisible(v => !v)}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-500 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
          >
            {visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {visible ? 'Hide' : 'Show'}
          </button>
        </div>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {!visible && (
        <div className="mb-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-8">
          <Lock className="h-6 w-6 text-slate-400" />
          <div className="space-y-1 text-center">
            <p className="text-xs font-semibold text-slate-600">Only you can see this data</p>
            <p className="max-w-xs text-[10px] text-slate-500">
              Your extracted medical history stays on this device. Only the proof result leaves the browser.
            </p>
          </div>
          <button
            onClick={() => setVisible(true)}
            className="mt-1 flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-1.5 text-xs text-white transition-colors hover:bg-slate-800"
          >
            <Eye className="h-3 w-3" /> View extracted data
          </button>
        </div>
      )}

      {visible && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { icon: <User className="h-3.5 w-3.5" />, label: 'Patient ID', value: d.patient_id },
              { icon: <FileText className="h-3.5 w-3.5" />, label: 'Provider', value: d.provider },
              { icon: <Calendar className="h-3.5 w-3.5" />, label: 'Date', value: d.date },
              { icon: <Activity className="h-3.5 w-3.5" />, label: 'AI Confidence', value: `${(d.confidence * 100).toFixed(0)}%` },
            ].map(({ icon, label, value }) => (
              <div key={label} className="space-y-1 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-1.5 text-slate-400">
                  {icon}
                  <span className="text-[9px] uppercase tracking-widest">{label}</span>
                </div>
                <p className="truncate font-mono text-xs text-slate-950" title={value}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {d.lab_results && d.lab_results.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Lab results</p>
                </div>
                <table className="w-full font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-2 text-left font-normal text-slate-500">Test</th>
                      <th className="px-4 py-2 text-right font-normal text-slate-500">Value</th>
                      <th className="px-4 py-2 text-right font-normal text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.lab_results.map((lab, i) => (
                      <tr key={i} className="border-b border-slate-100 transition-colors hover:bg-slate-50 last:border-0">
                        <td className="px-4 py-2.5 text-slate-600">{lab.test}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-950">{lab.value}</td>
                        <td className={`px-4 py-2.5 text-right font-bold ${lab.flag === 'NORMAL' ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {lab.flag}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Diagnosed conditions</p>
                </div>
                <div className="space-y-2.5 p-4 font-mono text-[11px]">
                  {d.diagnosed_conditions.map((condition, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-slate-700">{condition}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">AI clinical summary</p>
                </div>
                <div className="p-4">
                  <p className="text-xs italic leading-relaxed text-slate-600">"{d.summary}"</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
