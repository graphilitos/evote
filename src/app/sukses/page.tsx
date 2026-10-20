/**
 * Halaman sukses setelah suara tercatat.
 * Tidak menampilkan token atau pilihan calon (privasi).
 */
export default function SuksesPage() {
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
        {/* Ikon sukses */}
        <div
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))',
            border: '2px solid rgba(16,185,129,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            margin: '0 auto 2rem',
            animation: 'pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          aria-hidden="true"
        >
          ✅
        </div>

        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            marginBottom: '1rem',
            lineHeight: 1.2,
          }}
        >
          Suara Anda
          <br />
          <span className="gradient-text">Telah Tercatat</span>
        </h1>

        <p
          style={{
            color: 'var(--color-text-muted)',
            fontSize: '1rem',
            lineHeight: 1.7,
            marginBottom: '2rem',
          }}
        >
          Terima kasih telah berpartisipasi dalam pemilihan Ketua RT. Suara Anda
          telah berhasil kami catat dan dijaga kerahasiaannya.
        </p>

        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 'var(--radius-md)',
            color: '#6ee7b7',
            fontSize: '0.875rem',
          }}
        >
          🔒 Token Anda telah dinonaktifkan dan tidak dapat digunakan lagi.
        </div>
      </div>

      <style>{`
        @keyframes pop-in {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </main>
  );
}
