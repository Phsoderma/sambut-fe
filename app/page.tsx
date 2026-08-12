import Link from 'next/link';
import { Header } from './components/Header';

export default function Home() {
  return (
    <div className="app-shell">
      <Header role="landing" />
      <main className="focus-page">
        <div className="focus-content">
          <p className="eyebrow">Layanan pendaftaran Puskesmas</p>
          <h1>Isyarat tersambut.<br />Layanan berlanjut.</h1>
          <p className="lead">Pilih terminal sesuai peran Anda untuk memulai satu sesi layanan bersama.</p>
          <div className="role-actions">
            <Link className="role-link" href="/user">
              <strong>Terminal pengguna</strong>
              <span>Hubungkan ke sesi yang dibuat petugas</span>
            </Link>
            <Link className="role-link" href="/staff">
              <strong>Terminal petugas</strong>
              <span>Buat dan jalankan sesi layanan</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
