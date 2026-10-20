/**
 * Halaman 404 kustom
 */
import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '400px' }}>
        <div
          style={{
            fontSize: '6rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1,
            marginBottom: '1rem',
          }}
        >
          404
        </div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Halaman tidak ditemukan
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
          Halaman yang Anda cari tidak ada atau sudah dipindahkan.
        </p>
        <Link href="/" className="btn-primary">
          Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}
