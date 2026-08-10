'use client';

import React, { useState } from 'react';

interface BisindoPlayerProps {
  questionText: string;
  videoUrl?: string;
  signDescription?: string;
}

export const BisindoPlayer: React.FC<BisindoPlayerProps> = ({
  questionText,
  videoUrl,
  signDescription,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);

  const handleReplay = () => {
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 100);
  };

  return (
    <div className="bg-white rounded-xl border border-[#D9E1DD] overflow-hidden shadow-xs flex flex-col h-full">
      {/* Video Container / Visual Placeholder */}
      <div className="relative bg-[#13231F] aspect-video w-full flex items-center justify-center overflow-hidden">
        {videoUrl ? (
          <video
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-6 text-white max-w-sm flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-[#126B55]/30 border-2 border-[#126B55] flex items-center justify-center text-4xl mb-4 animate-pulse">
              🤟
            </div>
            <p className="text-sm font-medium text-emerald-300 mb-1">Peragaan Bahasa Isyarat BISINDO</p>
            <p className="text-xs text-gray-300">{signDescription || 'Visual pertanyaan ditampilkan di sini'}</p>
          </div>
        )}

        {/* Video Watermark / Verification Badge */}
        <div className="absolute top-3 left-3 bg-[#13231F]/80 backdrop-blur-xs border border-white/20 text-white text-[11px] px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          Terverifikasi Komunitas Tuli
        </div>

        {/* Replay Button */}
        <button
          onClick={handleReplay}
          className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-[#13231F] text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
        >
          🔄 Putar Ulang
        </button>
      </div>

      {/* Question Text Box */}
      <div className="p-6 bg-white flex-1 flex flex-col justify-center border-t border-[#D9E1DD]">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#126B55] mb-1">
          Pertanyaan Loket
        </span>
        <h2 className="text-2xl sm:text-3xl font-heading font-semibold text-[#13231F] leading-tight">
          {questionText}
        </h2>
      </div>
    </div>
  );
};
