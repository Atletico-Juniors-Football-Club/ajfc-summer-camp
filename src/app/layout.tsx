import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AJFC Child Availability',
  description: 'Submit your child availability for football practice.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <div className="container nav-content">
            <Link href="/" className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/logo.png" alt="Atletico Juniors Logo" style={{ height: '40px', width: 'auto' }} />
              <div>Atletico <span className="nav-brand-highlight">Juniors</span></div>
            </Link>
            <div className="nav-links">
              <Link href="/admin">Coach Login</Link>
            </div>
          </div>
        </nav>
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
