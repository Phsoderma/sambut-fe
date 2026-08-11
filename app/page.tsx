'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from './components/Header';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch('/user');
    router.prefetch('/staff');
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9]">
      <Header role="landing" />

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-[#126B55]/10 border border-[#126B55]/20 px-3 py-1 rounded-full text-[#126B55] text-xs font-semibold mb-6">
            <span>🏆 GEMASTIK XIX 2026</span>
            <span>•</span>
            <span>Divisi VIII Pengembangan Perangkat Lunak</span>
          </div>

          <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl text-[#13231F] leading-tight tracking-tight mb-6">
            Isyarat tersambut.<br />
            <span className="text-[#126B55]">Layanan berlanjut.</span>
          </h1>

          <p className="text-lg text-[#63736E] leading-relaxed mb-8 font-sans max-w-2xl mx-auto">
            Sistem komunikasi dua arah berbasis <strong>Computer Vision</strong> dan <strong>Workflow-Gated Sign-to-Intent</strong> yang membantu pengguna Tuli dan petugas Puskesmas bertransaksi pendaftaran secara mandiri dan inklusif.
          </p>
        </div>

        {/* Dual-Interface Mode Selectors (2 modes as per PRD) */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full mb-16">
          {/* User Terminal Card */}
          <div className="bg-white rounded-2xl border border-[#D9E1DD] p-8 shadow-xs hover:shadow-md hover:border-[#126B55] transition-all flex flex-col justify-between group">
            <div>
              <div className="w-14 h-14 rounded-xl bg-[#126B55]/10 text-[#126B55] flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                📱
              </div>
              <h2 className="font-heading font-bold text-2xl text-[#13231F] mb-3">
                Terminal Pasien (User Tablet)
              </h2>
              <p className="text-sm text-[#63736E] leading-relaxed mb-6">
                Antarmuka visual-first untuk tablet Android 10-11 inch landscape di depan loket. Dilengkapi peragaan BISINDO terverifikasi, kamera depan, dan konfirmasi makna.
              </p>
            </div>
            <Link
              href="/user"
              prefetch={true}
              className="w-full py-3.5 bg-[#126B55] hover:bg-[#095442] text-white font-heading font-semibold text-sm rounded-xl shadow-sm transition-all text-center block cursor-pointer"
            >
              Buka Terminal Pasien →
            </Link>
          </div>

          {/* Staff Terminal Card */}
          <div className="bg-white rounded-2xl border border-[#D9E1DD] p-8 shadow-xs hover:shadow-md hover:border-[#126B55] transition-all flex flex-col justify-between group">
            <div>
              <div className="w-14 h-14 rounded-xl bg-[#13231F]/10 text-[#13231F] flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                💻
              </div>
              <h2 className="font-heading font-bold text-2xl text-[#13231F] mb-3">
                Terminal Loket (Staff Desktop)
              </h2>
              <p className="text-sm text-[#63736E] leading-relaxed mb-6">
                Antarmuka PC/Laptop petugas loket. Dilengkapi push-to-talk STT, pemantauan workflow state machine, penerimaan intent pasien, dan pembaca TTS.
              </p>
            </div>
            <Link
              href="/staff"
              prefetch={true}
              className="w-full py-3.5 bg-[#13231F] hover:bg-black text-white font-heading font-semibold text-sm rounded-xl shadow-sm transition-all text-center block cursor-pointer"
            >
              Buka Terminal Loket →
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-[#D9E1DD] text-center text-xs text-[#63736E]">
        SAMBUT &copy; 2026 — Apex Trinity
      </footer>
    </div>
  );
}
