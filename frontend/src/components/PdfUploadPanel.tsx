import React, { useRef, useState } from 'react';
import { uploadPDF } from '../services/documentService';

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface Props {
  token: string;
  documents: string[];
  onUploadSuccess: (filename: string) => void;
}

export default function PdfUploadPanel({ token, documents, onUploadSuccess }: Props): React.JSX.Element {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('uploading');
    setMessage('');
    try {
      const res = await uploadPDF(file, token);
      setStatus('success');
      setMessage(`"${res.filename}" — ${res.chunks_added} chunks added`);
      onUploadSuccess(res.filename);
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Upload failed.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      className={`border border-dashed rounded-xl p-4 mx-4 mt-4 transition-all duration-200
        ${status === 'uploading'
          ? 'border-indigo-500 bg-[#1e2130] animate-shimmer'
          : 'border-gray-600 hover:border-indigo-500 bg-[#1e2130]'
        }`}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg btn-press transition-colors">
            {status === 'uploading' ? 'Uploading…' : '+ Upload PDF'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFile}
              disabled={status === 'uploading'}
            />
          </label>
          {documents.length > 0 && (
            <span className="text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-700 px-2 py-1 rounded-full">
              {documents.length} PDF{documents.length !== 1 ? 's' : ''} indexed
            </span>
          )}
        </div>
        {message && (
          <p className={`text-xs flex items-center gap-1 ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            <span className={status === 'success' ? 'animate-checkBounce inline-block' : 'animate-shake inline-block'}>
              {status === 'success' ? '✓' : '✗'}
            </span>
            {message}
          </p>
        )}
      </div>
      {documents.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {documents.map((doc) => (
            <span key={doc} className="text-xs text-gray-400 bg-[#0f1117] px-2 py-1 rounded hover:text-gray-200 transition-colors">
              {doc}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
