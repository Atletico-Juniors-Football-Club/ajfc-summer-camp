import { getSubmissionById, getAvailabilityBySubmissionId, Submission, Availability, ChildData } from '@/lib/db';
import ChildForm from '@/components/ChildForm';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
    const cookieStore = await cookies();
    if (cookieStore.get('coach-auth')?.value !== 'true') {
        redirect('/admin/login');
    }

    const { id } = await params;
    const submissionId = parseInt(id, 10);

    if (isNaN(submissionId)) {
        notFound();
    }

    const sub = await getSubmissionById(submissionId);
    if (!sub) {
        notFound();
    }

    const avail = await getAvailabilityBySubmissionId(submissionId);

    const childData: ChildData = {
        ...sub,
        availability: avail
    };

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <ChildForm initialData={childData} />
        </div>
    );
}
