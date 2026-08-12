'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '../lib/SessionContext';

interface HeaderProps {
  role: 'staff' | 'user' | 'landing' | 'demo';
}

export const Header: React.FC<HeaderProps> = ({ role }) => {
  const { session } = useSession();
  const router = useRouter();

  useEffect(() => {
    router.prefetch('/user');
    router.prefetch('/staff');
  }, [router]);

  return (
    <header className="h-[64px] bg-white border-b border-[#D9E1DD] px-6 sm:px-12 flex items-center justify-between sticky top-0 z-50 select-none">
      {/* Left Logo Section - Fixed Position */}
      <div className="flex items-center gap-3 min-w-[220px]">
        <Link href="/" prefetch={true} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#126B55] flex items-center justify-center text-white font-bold text-base">
            🤟
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading font-bold text-xl text-[#13231F] tracking-tight">SAMBUT</span>
          </div>
        </Link>
      </div>

      {/* Right Controls Container - Always Fixed and Locked Position across all routes */}
      <div className="flex items-center justify-end gap-4 shrink-0">
        {/* Human Assistance Badge */}
        {session.need_human_help && (
          <div className="bg-[#B42318] text-white text-xs px-3 py-1 rounded font-semibold flex items-center gap-1.5 animate-pulse">
            <span>⚠️</span>
            <span className="hidden sm:inline">Bantuan Petugas Diminta</span>
          </div>
        )}

        {/* Navigation Role Links */}
        <nav className="flex items-center gap-1 bg-[#F8FAF9] p-1 rounded border border-[#D9E1DD] text-xs">
          <Link
            href="/user"
            prefetch={true}
            className={`px-3 py-1 rounded font-semibold transition-colors ${
              role === 'user'
                ? 'bg-[#126B55] text-white'
                : 'text-[#63736E] hover:text-[#13231F]'
            }`}
          >
            Tablet Pasien
          </Link>
          <Link
            href="/staff"
            prefetch={true}
            className={`px-3 py-1 rounded font-semibold transition-colors ${
              role === 'staff'
                ? 'bg-[#126B55] text-white'
                : 'text-[#63736E] hover:text-[#13231F]'
            }`}
          >
            Loket Petugas
          </Link>
        </nav>
      </div>
    </header>
  );
};
