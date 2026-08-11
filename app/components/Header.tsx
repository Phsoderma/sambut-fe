'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '../lib/SessionContext';

interface HeaderProps {
  role: 'staff' | 'user' | 'landing';
}

export const Header: React.FC<HeaderProps> = ({ role }) => {
  const { session } = useSession();
  const router = useRouter();

  useEffect(() => {
    router.prefetch('/user');
    router.prefetch('/staff');
  }, [router]);

  return (
    <header className="h-[64px] bg-white border-b border-[#D9E1DD] px-6 sm:px-12 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link href="/" prefetch={true} className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-[#126B55] flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:bg-[#095442] transition-colors">
            🤟
          </div>
          <div>
            <span className="font-heading font-bold text-xl text-[#13231F] tracking-tight">SAMBUT</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {/* Session Code Badge - Only shown exclusively for staff */}
        {role === 'staff' && (
          <div className="flex items-center gap-2 bg-[#F8FAF9] border border-[#D9E1DD] px-3 py-1.5 rounded-md text-xs font-medium text-[#13231F]">
            <span className="w-2 h-2 rounded-full bg-[#16734E] animate-pulse"></span>
            <span className="text-[#63736E]">Kode Sesi:</span>
            <strong suppressHydrationWarning className="font-mono text-sm tracking-wider text-[#126B55]">{session.session_id}</strong>
          </div>
        )}

        {/* Human Help Alert Badge */}
        {session.need_human_help && (
          <div className="bg-[#B42318] text-white text-xs px-3 py-1.5 rounded-md font-semibold animate-bounce flex items-center gap-1.5 shadow-sm">
            <span>⚠️</span>
            <span>Bantuan Petugas Diminta</span>
          </div>
        )}

        {/* Navigation role links (2 modes as per PRD) */}
        <nav className="hidden md:flex items-center gap-1 bg-[#F8FAF9] p-1 rounded-lg border border-[#D9E1DD] text-xs">
          <Link
            href="/user"
            prefetch={true}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              role === 'user'
                ? 'bg-[#126B55] text-white shadow-xs'
                : 'text-[#63736E] hover:text-[#13231F]'
            }`}
          >
            Tablet Pasien
          </Link>
          <Link
            href="/staff"
            prefetch={true}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              role === 'staff'
                ? 'bg-[#126B55] text-white shadow-xs'
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
