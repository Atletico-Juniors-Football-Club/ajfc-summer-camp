import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function Success() {
    return (
        <div className="container" style={{ maxWidth: '600px', textAlign: 'center', marginTop: '4rem' }}>
            <div className="card" style={{ padding: '3rem 2rem' }}>
                <CheckCircle2 size={64} color="var(--color-success)" style={{ margin: '0 auto 1.5rem' }} />
                <h1 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Success!</h1>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
                    Thank you for providing your child's availability. This will greatly help us configure the best practice schedule.
                </p>
                <Link href="/" className="btn btn-primary">
                    Submit Another Child
                </Link>
            </div>
        </div>
    );
}
