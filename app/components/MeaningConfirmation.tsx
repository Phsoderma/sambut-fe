'use client';

import React from 'react';
import { UserIntent, ConfidenceBand } from '../lib/types';
import { INTENT_TRANSLATIONS } from '../lib/workflow';

interface MeaningConfirmationProps {
  intent: UserIntent;
  confidence: number;
  confidenceBand: ConfidenceBand;
  onConfirm: () => void;
  onRetry: () => void;
  onTypeFallback: () => void;
}

export const MeaningConfirmation: React.FC<MeaningConfirmationProps> = ({
  intent,
  confidence,
  confidenceBand,
  onConfirm,
  onRetry,
  onTypeFallback,
}) => {
  const translation = INTENT_TRANSLATIONS[intent] || {
    labelText: intent,
    descriptionText: 'Jawaban isyarat terdeteksi',
  };

  const isLowConfidence = confidenceBand === 'LOW' || intent === 'UNKNOWN';

  return (
    <div className="bg-white rounded-xl border border-[#D9E1DD] p-6 shadow-xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#63736E]">
            Hasil Analisis Computer Vision
          </span>
          <div className="flex items-center gap-1.5 bg-[#F8FAF9] px-2.5 py-1 rounded-full border border-[#D9E1DD]">
            <span
              className={`w-2 h-2 rounded-full ${
                confidenceBand === 'HIGH'
                  ? 'bg-[#16734E]'
                  : confidenceBand === 'MEDIUM'
                  ? 'bg-amber-500'
                  : 'bg-[#B42318]'
              }`}
            ></span>
            <span className="text-[11px] font-mono font-semibold text-[#13231F]">
              Kepercayaan: {Math.round(confidence * 100)}% ({confidenceBand})
            </span>
          </div>
        </div>

        {isLowConfidence ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-heading font-bold text-lg text-amber-900 mb-1">
                  Kami belum memahami isyarat tadi
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Gerakan isyarat kurang jelas atau posisi tangan belum sepenuhnya berada di bingkai. Silakan coba ulangi isyarat atau pilih opsi ketik jawaban.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#F8FAF9] border border-[#D9E1DD] rounded-xl p-6 mb-6">
            <span className="text-xs font-medium text-[#63736E] block mb-1">Jawaban yang dipahami:</span>
            <h3 className="font-heading font-bold text-3xl text-[#126B55] mb-2">
              {translation.labelText}
            </h3>
            <p className="text-xs text-[#63736E] leading-relaxed">
              {translation.descriptionText}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-4 border-t border-[#D9E1DD]">
        {!isLowConfidence && (
          <button
            onClick={onConfirm}
            className="w-full py-3 bg-[#126B55] hover:bg-[#095442] text-white font-heading font-semibold text-base rounded-lg shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <span>✓</span>
            <span>Benar, Lanjutkan</span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onRetry}
            className="py-2.5 bg-white hover:bg-[#F8FAF9] text-[#13231F] border border-[#D9E1DD] font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>🔄</span>
            <span>Ulangi Isyarat</span>
          </button>
          <button
            onClick={onTypeFallback}
            className="py-2.5 bg-white hover:bg-[#F8FAF9] text-[#13231F] border border-[#D9E1DD] font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>⌨️</span>
            <span>Ketik Jawaban</span>
          </button>
        </div>
      </div>
    </div>
  );
};
