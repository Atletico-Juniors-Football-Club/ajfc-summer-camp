'use client'

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Calendar as CalendarIcon, Trophy, Plus } from 'lucide-react';
import type { ChildData } from '@/lib/db';
import { deleteSubmissionAction } from '../actions';
import Link from 'next/link';

const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const dayNamesFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AdminDashboardClient({ initialData }: { initialData: ChildData[] }) {
    const router = useRouter();
    const [data, setData] = useState<ChildData[]>(initialData);
    const [activeTab, setActiveTab] = useState<'consolidated' | 'list'>('consolidated');

    // We skip filtering for now to keep the UI clean like the screenshot, but keep standard search state if needed
    const filteredData = data;

    // Compute stats
    const aggregate = useMemo(() => {
        const dayCounts = new Map<string, number>();

        filteredData.forEach(child => {
            // For each child, find all unique days they selected
            const uniqueDays = new Set<string>();
            child.availability.forEach(a => {
                if (a.time_slot !== 'Not available') {
                    uniqueDays.add(a.day);
                }
            });
            uniqueDays.forEach(dayStr => {
                dayCounts.set(dayStr, (dayCounts.get(dayStr) || 0) + 1);
            });
        });

        const rankedDays = Array.from(dayCounts.entries())
            .map(([date, count]) => {
                // parse date 'YYYY-MM-DD' to get day of week
                const dObj = new Date(date);
                const dayName = dayNamesFull[dObj.getDay()];
                const monthName = monthNames[dObj.getMonth()];
                const dayOfMonth = dObj.getDate();
                const year = dObj.getFullYear();

                return {
                    date,
                    count,
                    dayName,
                    formatted: `${monthName} ${dayOfMonth}, ${year}`,
                    shortFormatted: `${monthName} ${dayOfMonth}`
                };
            })
            .sort((a, b) => b.count - a.count);

        const bestDay = rankedDays[0] || null;
        const top3 = rankedDays.slice(0, 3);
        const top3Avg = top3.length > 0
            ? top3.reduce((acc, d) => acc + d.count, 0) / top3.length
            : 0;

        const maxCount = bestDay?.count || 1;

        return { rankedDays, bestDay, top3Avg, dayCounts, maxCount };
    }, [filteredData]);

    const handleDelete = async (id?: number) => {
        if (!id || !confirm('Are you sure you want to delete this submission?')) return;
        const res = await deleteSubmissionAction(id);
        if (res.success) {
            setData(prev => prev.filter(c => c.id !== id));
            router.refresh();
        } else {
            alert('Failed to delete: ' + res.error);
        }
    };

    const buildMonthStats = (year: number, month: number) => {
        const date = new Date(year, month, 1);
        const firstDay = date.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return { firstDay, daysInMonth };
    };

    const getHeatmapStyle = (count: number) => {
        if (count === 0) return {};

        // Scale intensity
        const intensity = Math.max(0.2, count / aggregate.maxCount);

        // Use an RGBA based on the green brand color
        // E.g., rgba(47, 143, 47, intensity)
        return {
            backgroundColor: `rgba(47, 143, 47, ${intensity})`,
            color: intensity > 0.5 ? '#FFFFFF' : '#1A1A1A',
            borderColor: 'transparent'
        };
    };

    const renderMonth = (year: number, month: number, title: string) => {
        const { firstDay, daysInMonth } = buildMonthStats(year, month);
        const cells = [];
        for (let i = 0; i < firstDay; i++) {
            cells.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            cells.push(i);
        }

        return (
            <div className="card" style={{ padding: '1.5rem 1rem' }}>
                <h3 className="calendar-title" style={{ color: '#0B3C5D', fontSize: '1.2rem', marginBottom: '1.5rem' }}>{title}</h3>
                <div className="calendar-grid">
                    {daysOfWeek.map(d => (
                        <div key={d} className="calendar-day-header" style={{ color: '#6B7280', fontWeight: 600, fontSize: '0.8rem' }}>{d}</div>
                    ))}
                    {cells.map((dayNum, i) => {
                        if (!dayNum) {
                            return <div key={`empty-${i}`} className="calendar-cell-empty"></div>;
                        }
                        const mStr = String(month + 1).padStart(2, '0');
                        const dStr = String(dayNum).padStart(2, '0');
                        const dateStr = `${year}-${mStr}-${dStr}`;

                        const count = aggregate.dayCounts.get(dateStr) || 0;
                        const style = getHeatmapStyle(count);

                        return (
                            <div
                                key={dateStr}
                                className="calendar-cell"
                                style={{
                                    flexDirection: 'column',
                                    gap: '2px',
                                    ...style,
                                    backgroundColor: count > 0 ? style.backgroundColor : '#F3F4F6'
                                }}
                            >
                                <span style={{ fontSize: '0.95rem', fontWeight: count > 0 ? 700 : 500 }}>{dayNum}</span>
                                {count > 0 && (
                                    <span style={{ fontSize: '0.65rem', fontWeight: 500, lineHeight: 1 }}>{count} kids</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: '2rem 0' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ color: '#0B3C5D', fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                        Coach Dashboard
                    </h1>
                    <p style={{ color: '#6B7280', fontSize: '0.95rem' }}>
                        Analyze availability and schedule practice sessions.
                    </p>
                </div>
                <Link href="/" className="btn" style={{ backgroundColor: '#D72638', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={18} /> Add Child
                </Link>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>

                {/* Stat 1 */}
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7' }}>
                        <Users size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 600 }}>Total Registered</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B3C5D' }}>{filteredData.length} Children</div>
                    </div>
                </div>

                {/* Stat 2 */}
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
                        <CalendarIcon size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 600 }}>Best Day Overall</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B3C5D' }}>
                            {aggregate.bestDay?.shortFormatted || 'N/A'}{' '}
                            <span style={{ fontSize: '0.95rem', color: '#6B7280', fontWeight: 500 }}>({aggregate.bestDay?.count || 0} kids)</span>
                        </div>
                    </div>
                </div>

                {/* Stat 3 */}
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FEF9C3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CA8A04' }}>
                        <Trophy size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 600 }}>Top 3 Days Avg</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B3C5D' }}>
                            {Math.round(aggregate.top3Avg * 10) / 10}{' '}
                            <span style={{ fontSize: '0.95rem', color: '#6B7280', fontWeight: 500 }}>kids/day</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Segmented Control */}
            <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#F3F4F6', padding: '0.35rem', borderRadius: '8px', width: 'fit-content', marginBottom: '2rem' }}>
                <button
                    onClick={() => setActiveTab('consolidated')}
                    style={{
                        padding: '0.5rem 1.5rem',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        border: 'none',
                        backgroundColor: activeTab === 'consolidated' ? '#FFFFFF' : 'transparent',
                        color: activeTab === 'consolidated' ? '#0B3C5D' : '#6B7280',
                        boxShadow: activeTab === 'consolidated' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer'
                    }}
                >
                    Consolidated View
                </button>
                <button
                    onClick={() => setActiveTab('list')}
                    style={{
                        padding: '0.5rem 1.5rem',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        border: 'none',
                        backgroundColor: activeTab === 'list' ? '#FFFFFF' : 'transparent',
                        color: activeTab === 'list' ? '#0B3C5D' : '#6B7280',
                        boxShadow: activeTab === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer'
                    }}
                >
                    All Children
                </button>
            </div>

            {activeTab === 'consolidated' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '1.5rem' }}>
                    {/* Best Practice Days List */}
                    <div className="card" style={{ padding: '0', overflow: 'hidden', border: 'none', backgroundColor: 'transparent', boxShadow: 'none' }}>
                        <div className="card" style={{ marginBottom: 0 }}>
                            <h2 style={{ color: '#0B3C5D', fontSize: '1.25rem', marginBottom: '0.25rem', fontWeight: 800 }}>Best Practice Days</h2>
                            <p style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Top recommendations based on attendance.</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {aggregate.rankedDays.slice(0, 10).map((dayData, i) => (
                                    <div key={i} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '1rem',
                                        backgroundColor: '#F9FAFB',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '8px'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#1A1A1A', fontSize: '0.95rem' }}>{dayData.dayName}</div>
                                            <div style={{ color: '#6B7280', fontSize: '0.8rem' }}>{dayData.formatted}</div>
                                        </div>
                                        <div style={{
                                            backgroundColor: '#DCFCE7',
                                            color: '#16A34A',
                                            padding: '0.35rem 0.85rem',
                                            borderRadius: '999px',
                                            fontWeight: 700,
                                            fontSize: '0.9rem'
                                        }}>
                                            {dayData.count}
                                        </div>
                                    </div>
                                ))}
                                {aggregate.rankedDays.length === 0 && (
                                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#6B7280' }}>
                                        No availability data yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Calendars */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {renderMonth(2026, 3, "April 2026")}
                        {renderMonth(2026, 4, "May 2026")}
                    </div>

                </div>
            )}

            {activeTab === 'list' && (
                <div className="card" style={{ overflowX: 'auto', padding: '0' }}>
                    <div style={{ padding: '1.5rem' }}>
                        <h2 style={{ color: '#0B3C5D', fontSize: '1.25rem', fontWeight: 800 }}>All Registered Children</h2>
                        <p style={{ color: '#6B7280', fontSize: '0.85rem' }}>Manage all user submissions here.</p>
                    </div>

                    <table className="table" style={{ borderTop: '1px solid #E5E7EB' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#F9FAFB' }}>
                                <th>Child</th>
                                <th>Age</th>
                                <th>Parent</th>
                                <th>Contact</th>
                                <th>Selected Days</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map(child => (
                                <tr key={child.id}>
                                    <td style={{ fontWeight: 600 }}>{child.child_name}</td>
                                    <td>{child.child_age || '-'}</td>
                                    <td>{child.parent_name}</td>
                                    <td style={{ fontSize: '0.85rem' }}>
                                        {child.parent_phone} <br /> {child.parent_email}
                                    </td>
                                    <td style={{ fontSize: '0.85rem', maxWidth: '300px' }}>
                                        {child.availability.map(a => {
                                            const parts = a.day.split('-');
                                            if (parts.length === 3) {
                                                return `${monthNames[parseInt(parts[1], 10) - 1]} ${parts[2]}`;
                                            }
                                            return a.day;
                                        }).join(', ')}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <Link href={`/edit/${child.id}`} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem', borderRadius: '4px' }}>
                                                Edit
                                            </Link>
                                            <button onClick={() => handleDelete(child.id)} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem', color: '#EF4444', borderColor: '#EF4444', borderRadius: '4px' }}>
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
                                        No children registered yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

        </div>
    );
}
