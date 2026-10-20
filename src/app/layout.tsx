import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'E-Voting Pemilihan Ketua RT',
  description:
    'Sistem pemungutan suara elektronik untuk pemilihan Ketua RT dengan token sekali pakai.',
  robots: 'noindex, nofollow', // Tidak diindeks search engine
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Orb animasi latar belakang */}
        <div className="orb orb-1" aria-hidden="true" />
        <div className="orb orb-2" aria-hidden="true" />
        <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
      </body>
    </html>
  );
}
