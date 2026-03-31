'use client'

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard Error:", error);
  }, [error]);

  return (
    <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '2rem', backgroundColor: '#FEF2F2', borderRadius: '12px', border: '1px solid #FCA5A5' }}>
      <h2 style={{ color: '#991B1B', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Database Connection Error</h2>
      <p style={{ marginBottom: '1.5rem', color: '#7F1D1D' }}>
        We encountered an error while trying to fetch data from Supabase. Next.js hides the exact server error in production, but this usually happens for one of two reasons:
      </p>
      
      <ul style={{ textAlign: 'left', color: '#7F1D1D', marginBottom: '2rem', paddingLeft: '2rem' }}>
        <li style={{ marginBottom: '0.5rem' }}>The <strong>Environment Variables</strong> were not added to your Vercel Project settings.</li>
        <li style={{ marginBottom: '0.5rem' }}>You added the variables, but <strong>did not trigger a Redeploy</strong>. In Vercel, environment variables are baked in during the build step, so a fresh deployment is strictly required after updating them!</li>
      </ul>

      <p style={{ marginBottom: '2rem', fontSize: '0.9rem', color: '#991B1B', wordBreak: 'break-all' }}>
        <strong>Error Details:</strong> {error.message || 'Server Component Crash'}
      </p>

      <button 
        onClick={() => reset()} 
        style={{ padding: '0.75rem 1.5rem', backgroundColor: '#DC2626', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        Try Again
      </button>
    </div>
  );
}
