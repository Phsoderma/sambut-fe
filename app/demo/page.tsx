'use client';

import React from 'react';
import { SessionProvider, useSession } from '../lib/SessionContext';
import { Header } from '../components/Header';
import UserTerminalPage from '../user/page';
import StaffTerminalPage from '../staff/page';

function DualEmulatorContent() {
  const { session, resetSession, goToNextState } = useSession();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9]">
      <Header role="demo" />

      {/* Demo Banner */}
      <div className="bg-[#13231F] text-white px-6 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="font-heading font-bold text-sm">SAMBUT Dual Emulator (Split View Mode)</span>
          <span className="text-xs text-gray-400 hidden sm:inline">
            • Sinkronisasi Real-Time Dua Perangkat
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => goToNextState()}
            className="px-3 py-1 bg-[#126B55] hover:bg-[#095442] text-white font-semibold rounded shadow-xs cursor-pointer"
          >
            Simulasi Langkah Berikutnya →
          </button>
          <button
            onClick={resetSession}
            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold rounded cursor-pointer"
          >
            Reset Sesi
          </button>
        </div>
      </div>

      {/* Side-by-side Dual Split Container */}
      <main className="flex-1 grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#D9E1DD] overflow-hidden">
        {/* Left Side: Staff Terminal */}
        <div className="p-4 overflow-y-auto max-h-[calc(100vh-120px)] bg-[#F8FAF9]">
          <div className="mb-2 px-2 flex items-center justify-between text-xs text-[#63736E]">
            <span className="font-bold text-[#13231F] font-heading">💻 TERMINAL LOKET (PETUGAS)</span>
            <span>Viewport: Desktop 1440x900</span>
          </div>
          <div className="scale-95 transform-gpu transform origin-top border border-[#D9E1DD] rounded-2xl overflow-hidden shadow-sm">
            <StaffTerminalPage />
          </div>
        </div>

        {/* Right Side: User Tablet Terminal */}
        <div className="p-4 overflow-y-auto max-h-[calc(100vh-120px)] bg-[#F8FAF9]">
          <div className="mb-2 px-2 flex items-center justify-between text-xs text-[#63736E]">
            <span className="font-bold text-[#126B55] font-heading">📱 TERMINAL PASIEN (TABLET LANDSCAPE)</span>
            <span>Viewport: Android Tablet 10-11&quot;</span>
          </div>
          <div className="scale-95 transform-gpu transform origin-top border border-[#D9E1DD] rounded-2xl overflow-hidden shadow-sm">
            <UserTerminalPage />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DemoPage() {
  return (
    <SessionProvider>
      <DualEmulatorContent />
    </SessionProvider>
  );
}
