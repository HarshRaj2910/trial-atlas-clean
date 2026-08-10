import React, { useRef, useState } from 'react';
import { Upload, File, X, Check } from 'lucide-react';

interface FileUploadProps {
  onUpload: (files: File[]) => void;
}

export function FileUpload({ onUpload }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const allFiles = Array.from(e.dataTransfer.files) as File[];
      const droppedFiles = allFiles.filter(f => f.type === 'application/pdf');
      if (droppedFiles.length > 0) {
        setFiles(prev => [...prev, ...droppedFiles]);
        onUpload(droppedFiles);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const allFiles = Array.from(e.target.files) as File[];
      const selectedFiles = allFiles.filter(f => f.type === 'application/pdf');
      setFiles(prev => [...prev, ...selectedFiles]);
      onUpload(selectedFiles);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer text-center ${
          isDragging ? 'border-teal-500 bg-teal-500/10' : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf"
          multiple
        />
        <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-teal-400' : 'text-zinc-600'}`} />
        <p className="text-xs text-zinc-400">
          <span className="text-teal-400 font-bold">Click to upload</span> or drag and drop PDFs
        </p>
        <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-tighter">MEDICAL RECORDS, LAB RESULTS</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800 group">
              <div className="flex items-center gap-3 overflow-hidden">
                <File className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <span className="text-[11px] text-zinc-300 truncate font-mono">{file.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">STAGED</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                  className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
