'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChildData } from '@/lib/db';
import { submitAvailabilityAction } from '@/app/actions';

const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Helpers to build calendars
const buildMonthStats = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const firstDay = date.getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
};

export default function ChildForm({ initialData }: { initialData?: ChildData }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // We are converting standard availability array to selected dates
    const initialSelected = new Set<string>();
    if (initialData?.availability) {
        initialData.availability.forEach(a => {
            // a.day could be '2026-04-01'
            initialSelected.add(a.day);
        });
    }

    const [selectedDates, setSelectedDates] = useState<Set<string>>(initialSelected);

    const toggleDate = (dateStr: string) => {
        setSelectedDates(prev => {
            const newSet = new Set(prev);
            if (newSet.has(dateStr)) {
                newSet.delete(dateStr);
            } else {
                newSet.add(dateStr);
            }
            return newSet;
        });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const child_name = formData.get('child_name') as string;

        if (selectedDates.size === 0) {
            setError('Please select at least one available date.');
            setLoading(false);
            return;
        }

        const availability = Array.from(selectedDates).map(dateStr => ({
            day: dateStr,
            time_slot: 'All Day' // simplified for the new UI
        }));

        const payload = {
            id: initialData?.id,
            parent_name: initialData?.parent_name || 'Not Provided',
            parent_phone: initialData?.parent_phone || '',
            parent_email: initialData?.parent_email || '',
            child_name,
            child_age: initialData?.child_age || 0,
            notes: initialData?.notes || '',
            availability
        };

        const res = await submitAvailabilityAction(payload);
        if (res.success) {
            if (initialData) {
                router.push('/admin');
                router.refresh();
            } else {
                router.push('/success');
            }
        } else {
            setError('Failed to submit: ' + res.error);
        }
        setLoading(false);
    };

    const renderMonth = (year: number, month: number, title: string) => {
        const { firstDay, daysInMonth } = buildMonthStats(year, month);
        // cells for the grid (padding + days)
        const cells = [];
        for (let i = 0; i < firstDay; i++) {
            cells.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            cells.push(i);
        }

        return (
            <div className="calendar-card">
                <h3 className="calendar-title">{title}</h3>
                <div className="calendar-grid">
                    {daysOfWeek.map(d => (
                        <div key={d} className="calendar-day-header">{d}</div>
                    ))}
                    {cells.map((dayNum, i) => {
                        if (!dayNum) {
                            return <div key={`empty-${i}`} className="calendar-cell-empty"></div>;
                        }
                        // format 'YYYY-MM-DD'
                        const mStr = String(month + 1).padStart(2, '0');
                        const dStr = String(dayNum).padStart(2, '0');
                        const dateStr = `${year}-${mStr}-${dStr}`;
                        const isSelected = selectedDates.has(dateStr);

                        return (
                            <div
                                key={dateStr}
                                onClick={() => toggleDate(dateStr)}
                                className={`calendar-cell ${isSelected ? 'selected' : ''}`}
                            >
                                {dayNum}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="card" style={{ padding: '2rem 2.5rem' }}>
            <h1 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
                Child Information
            </h1>
            <p style={{ marginBottom: '2rem', color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
                Enter your child's name and select their available dates.
            </p>

            {error && (
                <div style={{ padding: '1rem', backgroundColor: 'var(--color-error)', color: 'white', borderRadius: '6px', marginBottom: '1.5rem' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                    <label className="form-label" style={{ fontSize: '0.95rem' }}>Child Name *</label>
                    <input
                        type="text"
                        name="child_name"
                        className="form-control"
                        required
                        defaultValue={initialData?.child_name}
                        placeholder="e.g. Alex Johnson"
                        style={{ maxWidth: '400px' }}
                    />
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', margin: '2rem 0' }}></div>

                <h2 style={{ marginBottom: '1.5rem', color: 'var(--color-primary)', fontSize: '1.1rem' }}>
                    Select Available Days
                </h2>

                <div className="calendar-container">
                    {renderMonth(2026, 3, "April 2026")}  {/* month is 0-indexed, so 3 is April */}
                    {renderMonth(2026, 4, "May 2026")}    {/* 4 is May */}
                </div>

                <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    {initialData && (
                        <button type="button" className="btn btn-outline" onClick={() => router.push('/admin')}>
                            Cancel
                        </button>
                    )}
                    <button type="submit" className="btn btn-secondary" disabled={loading}>
                        {loading ? 'Submitting...' : 'Submit Availability'}
                    </button>
                </div>
            </form>
        </div>
    );
}
