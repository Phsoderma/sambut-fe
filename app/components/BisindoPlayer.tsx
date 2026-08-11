'use client';

import React, { useState } from 'react';

interface BisindoPlayerProps {
  questionText: string;
  videoUrl?: string;
  signDescription?: string;
}

export const BisindoPlayer: React.FC<BisindoPlayerProps> = ({
  questionText,
  signDescription,
}) => {
  return (
    <div className="bg-white rounded-xl border border-[#D9E1DD] overflow-hidden shadow-xs flex flex-col h-full justify-between p-8">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-[#126B55]"></span>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#126B55]">
            Pertanyaan Petugas
          </span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[#13231F] leading-tight mb-6 transition-all duration-300">
          {questionText}
        </h2>

        {signDescription && (
          <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#D9E1DD] text-xs text-[#63736E] leading-relaxed">
            <span className="font-semibold text-[#13231F] block mb-1">💡 Petunjuk Tanggapan:</span>
            {signDescription}
          </div>
        )}
      </div>
    </div>
  );
};
