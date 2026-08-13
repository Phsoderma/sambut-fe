import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./components/Providers";

export const metadata: Metadata = {
  title: "SAMBUT - Isyarat tersambut. Layanan berlanjut.",
  description: "Sistem aksesibilitas untuk komunikasi administratif di layanan pendaftaran Puskesmas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#F8FAF9] text-[#13231F]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
