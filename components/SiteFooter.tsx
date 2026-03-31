import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-dim)',
        background: 'var(--bg-surface)',
        padding: '24px 20px',
        marginTop: 'auto',
      }}
    >
       <div
         style={{
           maxWidth: 880,
           margin: '0 auto',
           display: 'flex',
           justifyContent: 'space-between',
           alignItems: 'center',
           flexWrap: 'wrap',
           gap: 16,
         }}
       >
         <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
           <img src="/logo.png" alt="Logo" width={20} height={20} style={{ objectFit: 'contain' }} />
           <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
             Data from Blizzard Entertainment API. Not affiliated with or endorsed by Blizzard Entertainment.
           </span>
         </div>
         <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
           <Link
             href="https://github.com/ArKmatty/HSBGLdb"
             target="_blank"
             rel="noopener noreferrer"
             className="footer-link"
           >
             GitHub
           </Link>
         </div>
       </div>
    </footer>
  );
}
