'use client';

import React, { useState } from 'react';

interface TypingFallbackProps {
  onSubmitText: (text: string) => void;
  onCancel: () => void;
  onLiveTextChange?: (text: string) => void;
}

export const TypingFallback: React.FC<TypingFallbackProps> = ({ onSubmitText, onCancel, onLiveTextChange }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmitText(text.trim());
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    if (onLiveTextChange) {
      onLiveTextChange(val);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#D9E1DD] p-6 shadow-xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">⌨️</span>
          <h3 className="font-heading font-bold text-xl text-[#13231F]">Ketik Jawaban Anda</h3>
        </div>
        <p className="text-xs text-[#63736E] mb-6">
          Tuliskan pesan atau jawaban Anda secara langsung untuk petugas loket.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={text}
            onChange={handleChange}
            placeholder="Tulis jawaban Anda di sini (misal: Pasien baru, berobat umum, atau ada keluhan kepala pusing)..."
            rows={5}
            className="w-full p-4 border border-[#D9E1DD] rounded-xl text-sm font-sans text-[#13231F] focus:ring-2 focus:ring-[#126B55] focus:border-[#126B55] outline-none transition-all resize-none bg-[#F8FAF9]"
            autoFocus
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 bg-white hover:bg-[#F8FAF9] text-[#13231F] border border-[#D9E1DD] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="px-6 py-2.5 bg-[#126B55] hover:bg-[#095442] disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              Kirim Jawaban Ke Petugas
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 p-3 bg-[#F8FAF9] rounded-lg border border-[#D9E1DD] flex items-center gap-2 text-[11px] text-[#63736E]">
        <span>ℹ️</span>
        <span>Jawaban teks ini akan langsung dikirimkan ke layar loket petugas.</span>
      </div>
    </div>
  );
};
