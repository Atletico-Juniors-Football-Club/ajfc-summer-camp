import { getAllActiveData } from '@/lib/db';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminDashboard() {
    const cookieStore = await cookies();
    if (cookieStore.get('coach-auth')?.value !== 'true') {
        redirect('/admin/login');
    }

    const allData = await getAllActiveData(); // fetching from Supabase directly on server
    
    return (
        <div className="container">
            <AdminDashboardClient initialData={allData} />
        </div>
    );
}
