'use client'

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Calendar as CalendarIcon, Trophy, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ChildData } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const dayNamesFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface SelectedDayPopup {
    dateStr: string;       // 'YYYY-MM-DD'
    formatted: string;     // 'Apr 01, 2026'
    dayName: string;       // 'Wednesday'
    children: ChildData[];
}

export default function AdminDashboardClient({ initialData }: { initialData: ChildData[] }) {
    const router = useRouter();
    const [data, setData] = useState<ChildData[]>(initialData);
    const [activeTab, setActiveTab] = useState<'consolidated' | 'list'>('consolidated');
    const [popup, setPopup] = useState<SelectedDayPopup | null>(null);
    const [weekIndex, setWeekIndex] = useState(0);

    const filteredData = data;

    // Compute stats
    const aggregate = useMemo(() => {
        const dayCounts = new Map<string, number>();

        filteredData.forEach(child => {
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
                const parts = date.split('-');
                const dObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
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

    // Build list of all weeks (Mon-Sun) that overlap Apr-May 2026
    const weeks = useMemo(() => {
        // Start from Mon of the week containing Apr 1 2026
        const start = new Date(2026, 2, 30); // Mon 30 Mar 2026
        const end   = new Date(2026, 5, 1);  // past May 31
        const result: { weekStart: Date; weekEnd: Date; label: string }[] = [];
        const cur = new Date(start);
        while (cur < end) {
            const ws = new Date(cur);
            const we = new Date(cur);
            we.setDate(we.getDate() + 6);
            const fmt = (d: Date) => `${monthNames[d.getMonth()]} ${d.getDate()}`;
            result.push({ weekStart: ws, weekEnd: we, label: `${fmt(ws)} – ${fmt(we)}` });
            cur.setDate(cur.getDate() + 7);
        }
        return result;
    }, []);

    // Best day for the currently selected week
    const weeklyBestDay = useMemo(() => {
        if (!weeks.length) return null;
        const idx = Math.min(weekIndex, weeks.length - 1);
        const { weekStart, weekEnd } = weeks[idx];
        let best: { dateStr: string; count: number; dayName: string; shortFormatted: string } | null = null;
        for (const [dateStr, count] of aggregate.dayCounts.entries()) {
            const parts = dateStr.split('-');
            const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            if (d >= weekStart && d <= weekEnd) {
                if (!best || count > best.count) {
                    best = {
                        dateStr,
                        count,
                        dayName: dayNamesFull[d.getDay()],
                        shortFormatted: `${monthNames[d.getMonth()]} ${d.getDate()}`,
                    };
                }
            }
        }
        return best;
    }, [weekIndex, weeks, aggregate.dayCounts]);

    // Get children available on a given date string (YYYY-MM-DD)
    const getChildrenForDate = (dateStr: string): ChildData[] => {
        return filteredData.filter(child =>
            child.availability.some(a => a.day === dateStr && a.time_slot !== 'Not available')
        );
    };

    const openPopup = (dateStr: string) => {
        const parts = dateStr.split('-');
        const dObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const dayName = dayNamesFull[dObj.getDay()];
        const monthName = monthNames[dObj.getMonth()];
        const dayOfMonth = String(dObj.getDate()).padStart(2, '0');
        const year = dObj.getFullYear();

        setPopup({
            dateStr,
            formatted: `${monthName} ${dayOfMonth}, ${year}`,
            dayName,
            children: getChildrenForDate(dateStr),
        });
    };

    const handleDelete = async (id?: number) => {
        if (!id || !confirm('Are you sure you want to delete this submission?')) return;
        
        const { error } = await supabase
            .from('submissions')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Failed to delete: ' + error.message);
        } else {
            setData(prev => prev.filter(c => c.id !== id));
            router.refresh();
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
        const intensity = Math.max(0.2, count / aggregate.maxCount);
        return {
            backgroundColor: `rgba(47, 143, 47, ${intensity})`,
            color: intensity > 0.5 ? '#FFFFFF' : '#1A1A1A',
            borderColor: 'transparent'
        };
    };

    const renderMonth = (year: number, month: number, title: string) => {
        const { firstDay, daysInMonth } = buildMonthStats(year, month);
        const cells = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let i = 1; i <= daysInMonth; i++) cells.push(i);

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
                                onClick={() => count > 0 && openPopup(dateStr)}
                                style={{
                                    flexDirection: 'column',
                                    gap: '2px',
                                    ...style,
                                    backgroundColor: count > 0 ? style.backgroundColor : '#F3F4F6',
                                    cursor: count > 0 ? 'pointer' : 'default',
                                    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                                }}
                                title={count > 0 ? `Click to see ${count} available kid${count !== 1 ? 's' : ''}` : ''}
                                onMouseEnter={e => { if (count > 0) (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
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

            {/* ── Popup Modal ── */}
            {popup && (
                <div
                    onClick={() => setPopup(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '1rem',
                        backdropFilter: 'blur(2px)',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#FFFFFF',
                            borderRadius: '16px',
                            padding: '2rem',
                            width: '100%',
                            maxWidth: '480px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                            animation: 'popIn 0.18s ease',
                        }}
                    >
                        {/* Modal header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                                    Available Children
                                </div>
                                <h2 style={{ margin: 0, color: '#0B3C5D', fontSize: '1.4rem', fontWeight: 800 }}>
                                    {popup.dayName}
                                </h2>
                                <div style={{ color: '#6B7280', fontSize: '0.9rem', marginTop: '0.15rem' }}>{popup.formatted}</div>
                            </div>
                            <button
                                onClick={() => setPopup(null)}
                                style={{ background: '#F3F4F6', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Count badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                            <div style={{ backgroundColor: '#DCFCE7', color: '#16A34A', borderRadius: '999px', padding: '0.25rem 0.85rem', fontWeight: 700, fontSize: '0.9rem' }}>
                                {popup.children.length} kid{popup.children.length !== 1 ? 's' : ''} available
                            </div>
                        </div>

                        {/* Children list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '320px', overflowY: 'auto' }}>
                            {popup.children.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#6B7280', padding: '2rem' }}>No children available this day.</div>
                            ) : popup.children.map(child => (
                                <div key={child.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                    padding: '0.85rem 1rem',
                                    backgroundColor: '#F9FAFB',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '10px',
                                }}>
                                    {/* Avatar */}
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        backgroundColor: '#0B3C5D', color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 700, fontSize: '1rem', flexShrink: 0,
                                    }}>
                                        {child.child_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#1A1A1A', fontSize: '0.95rem' }}>{child.child_name}</div>
                                        {child.parent_name && child.parent_name !== 'Not Provided' && (
                                            <div style={{ color: '#6B7280', fontSize: '0.8rem' }}>Parent: {child.parent_name}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

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
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7' }}>
                        <Users size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 600 }}>Total Registered</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0B3C5D' }}>{filteredData.length} Children</div>
                    </div>
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem' }}>
                    <div style={{ width: '56px', height: '56px', flexShrink: 0, borderRadius: '50%', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
                        <CalendarIcon size={28} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 600, marginBottom: '0.1rem' }}>Best Day This Week</div>
                        {/* Week label + arrows */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                            <button
                                onClick={() => setWeekIndex(i => Math.max(0, i - 1))}
                                disabled={weekIndex === 0}
                                style={{ background: 'none', border: 'none', cursor: weekIndex === 0 ? 'default' : 'pointer', color: weekIndex === 0 ? '#D1D5DB' : '#6B7280', padding: '0', display: 'flex', alignItems: 'center' }}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                {weeks[Math.min(weekIndex, weeks.length - 1)]?.label}
                            </span>
                            <button
                                onClick={() => setWeekIndex(i => Math.min(weeks.length - 1, i + 1))}
                                disabled={weekIndex >= weeks.length - 1}
                                style={{ background: 'none', border: 'none', cursor: weekIndex >= weeks.length - 1 ? 'default' : 'pointer', color: weekIndex >= weeks.length - 1 ? '#D1D5DB' : '#6B7280', padding: '0', display: 'flex', alignItems: 'center' }}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                        {weeklyBestDay ? (
                            <div
                                style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0B3C5D', cursor: 'pointer' }}
                                onClick={() => openPopup(weeklyBestDay.dateStr)}
                                title="Click to see who&apos;s available"
                            >
                                {weeklyBestDay.dayName}{' '}
                                <span style={{ fontSize: '1rem', color: '#374151' }}>{weeklyBestDay.shortFormatted}</span>{' '}
                                <span style={{ fontSize: '0.9rem', color: '#6B7280', fontWeight: 500 }}>({weeklyBestDay.count} kids)</span>
                            </div>
                        ) : (
                            <div style={{ fontSize: '1rem', color: '#9CA3AF', fontWeight: 600 }}>No data this week</div>
                        )}
                    </div>
                </div>

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
                        padding: '0.5rem 1.5rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem', border: 'none',
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
                        padding: '0.5rem 1.5rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem', border: 'none',
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
                            <p style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Click a day to see who&apos;s available.</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {aggregate.rankedDays.slice(0, 10).map((dayData, i) => (
                                    <div
                                        key={i}
                                        onClick={() => openPopup(dayData.date)}
                                        style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '1rem',
                                            backgroundColor: '#F9FAFB',
                                            border: '1px solid #E5E7EB',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
                                        }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLElement).style.backgroundColor = '#EFF6FF';
                                            (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLElement).style.backgroundColor = '#F9FAFB';
                                            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#1A1A1A', fontSize: '0.95rem' }}>{dayData.dayName}</div>
                                            <div style={{ color: '#6B7280', fontSize: '0.8rem' }}>{dayData.formatted}</div>
                                        </div>
                                        <div style={{
                                            backgroundColor: '#DCFCE7', color: '#16A34A',
                                            padding: '0.35rem 0.85rem', borderRadius: '999px',
                                            fontWeight: 700, fontSize: '0.9rem'
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
                                <th>Notes</th>
                                <th>Registered At</th>
                                <th>Status</th>
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
                                    <td style={{ fontSize: '0.85rem', maxWidth: '200px' }}>
                                        {child.notes || '-'}
                                    </td>
                                    <td style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                                        {child.created_at ? new Date(child.created_at).toLocaleDateString() : '-'}
                                    </td>
                                    <td>
                                        {child.active ? (
                                            <span style={{ color: '#16A34A', fontWeight: 600, fontSize: '0.85rem' }}>Active</span>
                                        ) : (
                                            <span style={{ color: '#EF4444', fontWeight: 600, fontSize: '0.85rem' }}>Deleted</span>
                                        )}
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
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
                                        No children registered yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Popup animation keyframe */}
            <style>{`@keyframes popIn { from { opacity: 0; transform: scale(0.93); } to { opacity: 1; transform: scale(1); } }`}</style>
        </div>
    );
}
