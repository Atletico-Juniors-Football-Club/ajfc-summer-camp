import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminLogin() {
    async function login(formData: FormData) {
        'use server'
        const password = formData.get('password');
        if (password === 'coach123') { // Simple mock password
            const cookieStore = await cookies();
            cookieStore.set('coach-auth', 'true', { path: '/' });
            redirect('/admin');
        }
    }

    return (
        <div className="container" style={{ maxWidth: '400px', marginTop: '2rem', padding: '0 1rem' }}>
            <div className="card">
                <h2 style={{ marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Coach Login</h2>
                <form action={login}>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input type="password" name="password" className="form-control" required placeholder="Hint: coach123" />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
}
