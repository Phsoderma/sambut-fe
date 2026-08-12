'use client';

import Link from 'next/link';
import { useSession } from '../lib/SessionContext';

export function Header({ role }: { role: 'landing' | 'staff' | 'user' }) {
  const { connection, snapshot } = useSession();
  const status = connection === 'CONNECTED'
    ? 'Terhubung'
    : connection === 'RECONNECTING' || connection === 'CONNECTING'
      ? 'Menghubungkan…'
      : 'Tidak terhubung';

  return (
    <header className="app-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="SAMBUT beranda">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>SAMBUT</span>
        </Link>
        <div className="header-meta">
          {role !== 'landing' && snapshot && (
            <span className="connection-text"><span className={`status-dot ${connection.toLowerCase()}`} />{status}</span>
          )}
          <nav aria-label="Pilih terminal">
            <Link className={role === 'user' ? 'active' : ''} href="/user">Pengguna</Link>
            <Link className={role === 'staff' ? 'active' : ''} href="/staff">Petugas</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
