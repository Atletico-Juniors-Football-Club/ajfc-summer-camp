'use server'

import { saveChildData, updateChildData, deactivateSubmission, ChildData } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function submitAvailabilityAction(data: any) {
    try {
        if (data.id) {
            updateChildData(data as ChildData);
        } else {
            saveChildData(data as ChildData);
        }
        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteSubmissionAction(id: number) {
    try {
        deactivateSubmission.run(id);
        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
